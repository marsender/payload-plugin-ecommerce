import Stripe from 'stripe';
// Stripe PaymentIntent statuses that are still usable for payment
const REUSABLE_PAYMENT_INTENT_STATUSES = [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action'
];
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
            let customer = (await stripe.customers.list({
                email: customerEmail
            })).data[0];
            if (!customer?.id) {
                customer = await stripe.customers.create({
                    email: customerEmail
                });
            }
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
            const shippingAddressAsString = JSON.stringify(shippingAddressFromData);
            // Resolve the connected account ID if the resolver function is provided
            let connectedAccountId;
            if (resolveConnectedAccount) {
                connectedAccountId = await resolveConnectedAccount({
                    cart,
                    req
                });
            }
            // Extract tenant from cart for multi-tenant support
            // @ts-expect-error - tenant field may be added by multi-tenant plugin
            const cartTenant = typeof cart.tenant === 'object' ? cart.tenant?.id : cart.tenant;
            // Base transaction data shared between create and update paths
            const baseTransactionData = {
                ...req.user ? {
                    customer: req.user.id
                } : {
                    customerEmail
                },
                billingAddress: billingAddressFromData,
                cart: cart.id,
                items: flattenedCart,
                paymentMethod: 'stripe',
                status: 'pending',
                ...cartTenant && {
                    tenant: cartTenant
                }
            };
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
            // If an existing pending transaction is found, try to reuse its PaymentIntent
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
                    if (existingPaymentIntent && REUSABLE_PAYMENT_INTENT_STATUSES.includes(existingPaymentIntent.status)) {
                        // Reuse the existing PaymentIntent: update the transaction with fresh cart data
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
                    // Cancel the existing PaymentIntent if it is no longer usable
                    if (existingPaymentIntent && ![
                        'canceled',
                        'succeeded'
                    ].includes(existingPaymentIntent.status)) {
                        await stripe.paymentIntents.cancel(existingPaymentIntentID);
                    }
                }
            }
            // Build the PaymentIntent create params
            const paymentIntentParams = {
                amount,
                automatic_payment_methods: {
                    enabled: true
                },
                currency,
                customer: customer.id,
                metadata: {
                    cartID: cart.id,
                    cartItemsSnapshot: JSON.stringify(flattenedCart),
                    shippingAddress: shippingAddressAsString,
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
                // Create a new transaction for the payment intent.
                // Wrap in try/catch to handle race conditions: if a concurrent request created
                // the transaction between our find() check and this create(), catch the id
                // uniqueness error and fall back to updating the now-existing transaction.
                try {
                    await payload.create({
                        collection: transactionsSlug,
                        req,
                        data: fullTransactionData
                    });
                } catch (createError) {
                    const isIdConflict = createError !== null && typeof createError === 'object' && 'data' in createError && typeof createError.data === 'object' && createError.data?.errors?.some((e)=>e.path === 'id');
                    if (!isIdConflict) {
                        throw createError;
                    }
                    // Race condition: find the transaction that was created by the concurrent request
                    const raceTransaction = await payload.find({
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
                    if (raceTransaction.docs[0]) {
                        await payload.update({
                            id: raceTransaction.docs[0].id,
                            collection: transactionsSlug,
                            req,
                            data: fullTransactionData
                        });
                    } else {
                        throw createError;
                    }
                }
            }
            return {
                clientSecret: paymentIntent.client_secret || '',
                message: 'Payment initiated successfully',
                paymentIntentID: paymentIntent.id
            };
        } catch (error) {
            payload.logger.error(error, 'Error initiating payment with Stripe');
            throw new Error(error instanceof Error ? error.message : 'Unknown error initiating payment');
        }
    };

//# sourceMappingURL=initiatePayment.js.map