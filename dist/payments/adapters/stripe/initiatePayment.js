import Stripe from 'stripe';
import { withCartLock } from '../../../utilities/withCartLock.js';
import { classifyExistingPaymentIntent } from './classifyExistingPaymentIntent.js';
export const initiatePayment = (props)=>async ({ data, req, transactionsSlug })=>{
        const payload = req.payload;
        const { apiVersion, appInfo, resolveConnectedAccount, secretKey } = props || {};
        const customerEmail = data.customerEmail;
        const currency = data.currency;
        const cart = data.cart;
        // Compute payable amount: subtract coupon discount from subtotal when present
        const subtotal = cart.subtotal ?? 0;
        const discountAmount = typeof cart.discountAmount === 'number' && cart.discountAmount > 0 ? cart.discountAmount : 0;
        const amount = discountAmount > 0 ? Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100) : cart.subtotal;
        const billingAddressFromData = data.billingAddress;
        const shippingAddressFromData = data.shippingAddress;
        let resolvedSecretKey = secretKey;
        if (typeof secretKey === 'function') {
            resolvedSecretKey = await secretKey({
                req
            });
        }
        if (!resolvedSecretKey) {
            throw new Error('Stripe secret key is required.');
        }
        if (!currency) {
            throw new Error('Currency is required.');
        }
        if (!cart || !cart.items || cart.items.length === 0) {
            throw new Error('Cart is empty or not provided.');
        }
        if (!customerEmail || typeof customerEmail !== 'string') {
            throw new Error('A valid customer email is required to make a purchase.');
        }
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            throw new Error('A valid amount is required to initiate a payment.');
        }
        const stripe = new Stripe(resolvedSecretKey, {
            // When apiVersion is omitted, the Stripe SDK uses its own DEFAULT_API_VERSION.
            // Each tenant may run a different Stripe API version, so we only pin it when explicitly provided.
            ...apiVersion && {
                apiVersion
            },
            appInfo: appInfo || {
                name: 'Stripe Payload Plugin',
                url: 'https://payloadcms.com'
            }
        });
        try {
            const flattenedCart = cart.items.map((item)=>{
                const productID = typeof item.product === 'object' ? item.product.id : item.product;
                const variantID = item.variant ? typeof item.variant === 'object' ? item.variant.id : item.variant : undefined;
                // Preserve any additional custom properties (e.g., deliveryOption, customizations)
                // that may have been added via cartItemMatcher.
                // Exclude 'id' so Payload generates new IDs for transaction items instead of
                // reusing cart item IDs, which would cause uniqueness violations on retry.
                const { id: _id, product: _product, variant: _variant, ...customProperties } = item;
                return {
                    ...customProperties,
                    product: productID,
                    quantity: item.quantity,
                    ...variantID ? {
                        variant: variantID
                    } : {}
                };
            });
            // Resolved before the lock: it depends only on the cart, and it is application code that
            // may reach the database on a connection of its own — which, under the lock, would be a
            // second pooled connection held for the length of the Stripe exchange.
            let connectedAccountId;
            if (resolveConnectedAccount) {
                connectedAccountId = await resolveConnectedAccount({
                    cart,
                    req
                });
            }
            // Every key the adapter owns, `undefined` when absent: this is both what a new PaymentIntent
            // carries and what an existing one must match to be reused.
            const metadata = {
                cartID: cart.id,
                cartItemsSnapshot: JSON.stringify(flattenedCart),
                connectedAccountId,
                shippingAddress: JSON.stringify(shippingAddressFromData)
            };
            // Extract tenant from cart for multi-tenant support
            // @ts-expect-error - tenant field may be added by multi-tenant plugin
            const cartTenant = typeof cart.tenant === 'object' ? cart.tenant?.id : cart.tenant;
            // Sanitize billing address: convert empty string title to null so Payload's select field validation passes
            const sanitizedBillingAddress = billingAddressFromData && billingAddressFromData.title === '' ? {
                ...billingAddressFromData,
                title: null
            } : billingAddressFromData;
            // Base transaction data shared between create and update paths
            const baseTransactionData = {
                ...req.user ? {
                    customer: req.user.id
                } : {
                    customerEmail
                },
                billingAddress: sanitizedBillingAddress,
                cart: cart.id,
                items: flattenedCart,
                paymentMethod: 'stripe',
                status: 'pending',
                ...cartTenant && {
                    tenant: cartTenant
                }
            };
            // Serialize concurrent initiations for the same cart. Without the lock, two requests
            // arriving together (a double-fired client effect was seen in production) both find no
            // pending transaction and both create one: two transactions, two PaymentIntents and two
            // Stripe customers for a single purchase. Under the lock the second request runs after the
            // first has committed, and finds its customer and pending transaction.
            // Every database call below passes `req` so it runs inside the lock's transaction.
            return await withCartLock(req, cart.id, async ()=>{
                let customer = (await stripe.customers.list({
                    email: customerEmail
                })).data[0];
                if (!customer?.id) {
                    customer = await stripe.customers.create({
                        email: customerEmail
                    });
                }
                // Look for an existing pending transaction for this cart to avoid creating duplicates
                const existingTransactions = await payload.find({
                    collection: transactionsSlug,
                    where: {
                        and: [
                            {
                                cart: {
                                    equals: cart.id
                                }
                            },
                            {
                                status: {
                                    equals: 'pending'
                                }
                            },
                            {
                                paymentMethod: {
                                    equals: 'stripe'
                                }
                            }
                        ]
                    },
                    limit: 1,
                    depth: 0,
                    overrideAccess: true,
                    req
                });
                const existingTransaction = existingTransactions.docs[0] ?? null;
                if (existingTransaction) {
                    const existingPaymentIntentID = existingTransaction.stripe?.paymentIntentID;
                    if (existingPaymentIntentID) {
                        let existingPaymentIntent = null;
                        try {
                            existingPaymentIntent = await stripe.paymentIntents.retrieve(existingPaymentIntentID);
                        } catch (stripeError) {
                            // PaymentIntent no longer exists in Stripe (e.g. stale DB record, env mismatch) — fall through to create a new one.
                            // Use duck-typing instead of instanceof: class checks are unreliable in bundled/minified environments.
                            const isResourceMissing = stripeError !== null && typeof stripeError === 'object' && 'code' in stripeError && stripeError.code === 'resource_missing';
                            if (!isResourceMissing) {
                                throw stripeError;
                            }
                        }
                        if (existingPaymentIntent) {
                            const verdict = classifyExistingPaymentIntent(existingPaymentIntent, {
                                amount,
                                connectedAccountId,
                                currency,
                                customerID: customer.id,
                                metadata
                            });
                            if (verdict.action === 'refuse') {
                                // The transaction keeps pointing at this PaymentIntent, so the payment stays
                                // reconcilable (confirmOrder, or by hand) instead of being orphaned.
                                throw new Error(`Refusing to initiate a new payment for cart ${String(cart.id)}: ${verdict.reason} (PaymentIntent ${existingPaymentIntent.id}, transaction ${String(existingTransaction.id)}).`);
                            }
                            if (verdict.action === 'reuse') {
                                await payload.update({
                                    id: existingTransaction.id,
                                    collection: transactionsSlug,
                                    req,
                                    data: {
                                        ...baseTransactionData,
                                        amount: existingPaymentIntent.amount,
                                        currency: existingPaymentIntent.currency.toUpperCase(),
                                        stripe: {
                                            customerID: customer.id,
                                            paymentIntentID: existingPaymentIntent.id,
                                            ...connectedAccountId && {
                                                connectedAccountId
                                            }
                                        }
                                    }
                                });
                                return {
                                    clientSecret: existingPaymentIntent.client_secret || '',
                                    message: 'Payment initiated successfully',
                                    paymentIntentID: existingPaymentIntent.id
                                };
                            }
                            // Still payable but for a different payment (amount, items, account…): cancel it,
                            // or the buyer would keep a second, stale way to pay for this cart.
                            if (verdict.cancel) {
                                await stripe.paymentIntents.cancel(existingPaymentIntent.id);
                            }
                        }
                    }
                }
                const paymentIntentParams = {
                    amount,
                    automatic_payment_methods: {
                        enabled: true
                    },
                    currency,
                    customer: customer.id,
                    metadata: {
                        cartID: metadata.cartID,
                        cartItemsSnapshot: metadata.cartItemsSnapshot,
                        shippingAddress: metadata.shippingAddress,
                        ...connectedAccountId && {
                            connectedAccountId
                        }
                    }
                };
                // Add Stripe Connect transfer_data if a connected account is resolved
                if (connectedAccountId) {
                    paymentIntentParams.transfer_data = {
                        destination: connectedAccountId
                    };
                }
                const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
                const fullTransactionData = {
                    ...baseTransactionData,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency.toUpperCase(),
                    stripe: {
                        customerID: customer.id,
                        paymentIntentID: paymentIntent.id,
                        ...connectedAccountId && {
                            connectedAccountId
                        }
                    }
                };
                if (existingTransaction) {
                    // Update the existing transaction with the new PaymentIntent
                    await payload.update({
                        id: existingTransaction.id,
                        collection: transactionsSlug,
                        req,
                        data: fullTransactionData
                    });
                } else {
                    await payload.create({
                        collection: transactionsSlug,
                        req,
                        data: fullTransactionData
                    });
                }
                return {
                    clientSecret: paymentIntent.client_secret || '',
                    message: 'Payment initiated successfully',
                    paymentIntentID: paymentIntent.id
                };
            });
        } catch (error) {
            payload.logger.error(error, 'Error initiating payment with Stripe');
            throw new Error(error instanceof Error ? error.message : 'Unknown error initiating payment');
        }
    };

//# sourceMappingURL=initiatePayment.js.map