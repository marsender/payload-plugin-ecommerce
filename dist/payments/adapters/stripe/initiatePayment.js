import Stripe from 'stripe';
export const initiatePayment = (props)=>async ({ data, req, transactionsSlug })=>{
        const payload = req.payload;
        const { apiVersion, appInfo, resolveConnectedAccount, secretKey } = props || {};
        const customerEmail = data.customerEmail;
        const currency = data.currency;
        const cart = data.cart;
        const amount = cart.subtotal;
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
            // API version can only be the latest, stripe recommends ts ignoring it
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - ignoring since possible versions are not type safe, only the latest version is recognised
            apiVersion: apiVersion || '2025-09-30.clover',
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
                // that may have been added via cartItemMatcher
                const { product: _product, variant: _variant, ...customProperties } = item;
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
            // Extract tenant from cart for multi-tenant support
            // @ts-expect-error - tenant field may be added by multi-tenant plugin
            const cartTenant = typeof cart.tenant === 'object' ? cart.tenant?.id : cart.tenant;
            // Create a transaction for the payment intent in the database
            await payload.create({
                collection: transactionsSlug,
                req,
                data: {
                    ...req.user ? {
                        customer: req.user.id
                    } : {
                        customerEmail
                    },
                    amount: paymentIntent.amount,
                    billingAddress: billingAddressFromData,
                    cart: cart.id,
                    currency: paymentIntent.currency.toUpperCase(),
                    items: flattenedCart,
                    paymentMethod: 'stripe',
                    status: 'pending',
                    stripe: {
                        customerID: customer.id,
                        paymentIntentID: paymentIntent.id,
                        ...connectedAccountId && {
                            connectedAccountId
                        }
                    },
                    ...cartTenant && {
                        tenant: cartTenant
                    }
                }
            });
            const returnData = {
                clientSecret: paymentIntent.client_secret || '',
                message: 'Payment initiated successfully',
                paymentIntentID: paymentIntent.id
            };
            return returnData;
        } catch (error) {
            payload.logger.error(error, 'Error initiating payment with Stripe');
            throw new Error(error instanceof Error ? error.message : 'Unknown error initiating payment');
        }
    };

//# sourceMappingURL=initiatePayment.js.map