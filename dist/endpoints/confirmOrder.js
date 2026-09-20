import { addDataAndFileToRequest } from 'payload';
import { GuestCheckoutDisabled } from '../utilities/errorCodes.js';
import { decrementInventoryForTransaction } from '../utilities/decrementInventoryForTransaction.js';
/**
 * Handles the endpoint for initiating payments. We will handle checking the amount and product and variant prices here before it is sent to the payment provider.
 * This is the first step in the payment process.
 */ export const confirmOrderHandler = ({ allowGuestCheckout = true, cartsSlug = 'carts', currenciesConfig, customersSlug = 'users', ordersSlug = 'orders', paymentMethod, productsSlug = 'products', productsValidation: _productsValidation, transactionsSlug = 'transactions', variantsSlug = 'variants' })=>async (req)=>{
        await addDataAndFileToRequest(req);
        const data = req.data;
        const payload = req.payload;
        const user = req.user;
        let currency = currenciesConfig.defaultCurrency;
        let cartID = data?.cartID;
        let cart = undefined;
        let customerEmail = user?.email ?? '';
        if (user) {
            if (user.cart?.docs && Array.isArray(user.cart.docs) && user.cart.docs.length > 0) {
                if (!cartID && user.cart.docs[0]) {
                    // Use the user's cart instead
                    if (typeof user.cart.docs[0] === 'object') {
                        cartID = user.cart.docs[0].id;
                        cart = user.cart.docs[0];
                    } else {
                        cartID = user.cart.docs[0];
                    }
                }
            }
        } else if (!allowGuestCheckout) {
            // Mirrors the gate in `initiatePayment`. Unreachable in practice once that one refuses,
            // but the two endpoints are mounted independently and a consumer may call either.
            return Response.json({
                cause: {
                    code: GuestCheckoutDisabled
                },
                message: 'An account is required to complete this purchase.'
            }, {
                status: 401
            });
        } else {
            // Get the email from the data if user is not available
            if (data?.customerEmail && typeof data.customerEmail === 'string') {
                customerEmail = data.customerEmail;
            } else {
                return Response.json({
                    message: 'A customer email is required to make a purchase.'
                }, {
                    status: 400
                });
            }
        }
        if (!cart) {
            if (cartID) {
                cart = await payload.findByID({
                    id: cartID,
                    collection: cartsSlug,
                    depth: 2,
                    overrideAccess: false,
                    req,
                    select: {
                        id: true,
                        currency: true,
                        customerEmail: true,
                        items: true,
                        subtotal: true
                    },
                    user
                });
                if (!cart) {
                    return Response.json({
                        message: `Cart with ID ${cartID} not found.`
                    }, {
                        status: 404
                    });
                }
            } else {
                return Response.json({
                    message: 'Cart ID is required.'
                }, {
                    status: 400
                });
            }
        }
        if (cart.currency && typeof cart.currency === 'string') {
            currency = cart.currency;
        }
        // Ensure the currency is provided or inferred in some way
        if (!currency) {
            return Response.json({
                message: 'Currency is required.'
            }, {
                status: 400
            });
        }
        try {
            const paymentResponse = await paymentMethod.confirmOrder({
                customersSlug,
                data: {
                    ...data,
                    customerEmail
                },
                ordersSlug,
                productsSlug,
                req,
                transactionsSlug,
                variantsSlug
            });
            if (paymentResponse.transactionID) {
                await decrementInventoryForTransaction({
                    productsSlug,
                    req,
                    transactionID: paymentResponse.transactionID,
                    transactionsSlug,
                    variantsSlug
                });
            }
            if ('paymentResponse.transactionID' in paymentResponse && paymentResponse.transactionID) {
                delete paymentResponse.transactionID;
            }
            return Response.json(paymentResponse);
        } catch (error) {
            payload.logger.error(error, 'Error confirming order.');
            return Response.json({
                message: 'Error confirming order.'
            }, {
                status: 500
            });
        }
    };

//# sourceMappingURL=confirmOrder.js.map