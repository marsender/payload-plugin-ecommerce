import Stripe from 'stripe';
import { withCartLock } from '../../../utilities/withCartLock.js';
const idOf = (value)=>{
    if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }
    if (value && typeof value === 'object' && 'id' in value) {
        return idOf(value.id);
    }
    return undefined;
};
const normalizeEmail = (value)=>typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined;
/**
 * Whether the caller is the buyer `initiatePayment` recorded on the transaction. The PaymentIntent
 * id is no proof of that: it travels in the `return_url` query string, so it ends up in browser
 * history, screenshots and shared links.
 *
 * - A signed-in buyer's transaction carries `customer`, and only that user may confirm it. An email
 *   sent in the request is not accepted in its place: it is whatever the caller typed.
 * - A guest's transaction carries `customerEmail`, and the confirmation must carry the same address,
 *   from the caller's account or, for a guest, from the request (the endpoint requires one).
 * - A transaction with neither is refused: there is no one to check the caller against.
 */ const isTransactionBuyer = ({ callerEmail, callerID, transaction })=>{
    const buyerID = idOf(transaction.customer);
    if (buyerID !== undefined) {
        return callerID !== undefined && String(callerID) === String(buyerID);
    }
    const buyerEmail = normalizeEmail(transaction.customerEmail);
    return buyerEmail !== undefined && normalizeEmail(callerEmail) === buyerEmail;
};
/**
 * Turns a succeeded PaymentIntent into an order. **Safe to call more than once for the same
 * PaymentIntent**: every call after the first returns the order the first one created.
 *
 * That is not hypothetical. A storefront confirms from the page that took the payment AND from the
 * `return_url` a redirect-based method sends the buyer back to, and on a phone the payment can
 * finish in both at once (the original tab plus the one Stripe returned to). Production saw the two
 * requests 0.4 s apart. Without a guard both find the pending transaction, both create an order,
 * and the buyer is granted everything twice for one charge.
 *
 * So the check and the writes run under `withCartLock`, keyed on the transaction's cart — the same
 * lock `initiatePayment` takes, so a confirmation also waits for an initiation still in flight on
 * that cart. The second caller gets the lock only once the first has committed, and then sees the
 * order it created.
 *
 * A repeat call returns no `transactionID`: the confirm-order endpoint adjusts inventory whenever
 * one is returned, and the first call already did. It returns no `accessToken` either.
 *
 * **Only the buyer may confirm** (`isTransactionBuyer`), checked under the lock before anything is
 * returned or written. First-confirmation-wins makes this load-bearing: without it, whoever
 * confirmed a leaked PaymentIntent id first would own the order and its credits, and the buyer's
 * own confirmation would then only be handed that stranger's order. The order is built from the
 * PaymentIntent's own cart, which must be the transaction's; a cart id sent in the request plays no
 * part in it.
 */ export const confirmOrder = (props)=>async ({ data, ordersSlug = 'orders', req, transactionsSlug = 'transactions' })=>{
        const payload = req.payload;
        const { apiVersion, appInfo, secretKey } = props || {};
        const customerEmail = data.customerEmail;
        const paymentIntentID = data.paymentIntentID;
        if (!paymentIntentID) {
            throw new Error('PaymentIntent ID is required');
        }
        // Find our existing transaction by the payment intent ID
        const transactionsResults = await payload.find({
            collection: transactionsSlug,
            req,
            where: {
                'stripe.paymentIntentID': {
                    equals: paymentIntentID
                }
            }
        });
        const transaction = transactionsResults.docs[0];
        if (!transactionsResults.totalDocs || !transaction) {
            throw new Error('No transaction found for the provided PaymentIntent ID');
        }
        let resolvedSecretKey = secretKey;
        if (typeof secretKey === 'function') {
            // @ts-expect-error - injecting tenant context for resolver
            req.tenant = transaction.tenant;
            resolvedSecretKey = await secretKey({
                req
            });
        }
        if (!resolvedSecretKey) {
            throw new Error('Stripe secret key is required');
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
        // A transaction is always created with its cart; the PaymentIntent id only stands in so a
        // row without one is still serialised against itself.
        const lockKey = idOf(transaction.cart) ?? paymentIntentID;
        // Every database call below passes `req` so it runs inside the lock's transaction.
        return await withCartLock(req, lockKey, async ()=>{
            const current = await payload.findByID({
                id: transaction.id,
                collection: transactionsSlug,
                depth: 0,
                overrideAccess: true,
                req,
                select: {
                    cart: true,
                    customer: true,
                    customerEmail: true,
                    order: true
                }
            });
            if (!current) {
                throw new Error('No transaction found for the provided PaymentIntent ID');
            }
            const buyerCheck = {
                callerEmail: req.user ? req.user.email : customerEmail,
                callerID: req.user?.id,
                transaction: current
            };
            if (!isTransactionBuyer(buyerCheck)) {
                throw new Error(`Refusing to confirm PaymentIntent ${paymentIntentID}: the caller is not the buyer of transaction ${String(transaction.id)}.`);
            }
            const existingOrderID = idOf(current.order);
            if (existingOrderID !== undefined) {
                return {
                    message: 'Order already confirmed',
                    orderID: existingOrderID
                };
            }
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentID);
            if (paymentIntent.status !== 'succeeded') {
                throw new Error(`Payment not completed.`);
            }
            const cartID = paymentIntent.metadata.cartID;
            const cartItemsSnapshot = paymentIntent.metadata.cartItemsSnapshot ? JSON.parse(paymentIntent.metadata.cartItemsSnapshot) : undefined;
            const shippingAddressRaw = paymentIntent.metadata.shippingAddress ? JSON.parse(paymentIntent.metadata.shippingAddress) : undefined;
            // Sanitize address: convert empty string title to null so Payload's select field validation passes
            const shippingAddress = shippingAddressRaw ? {
                ...shippingAddressRaw,
                ...shippingAddressRaw.title === '' ? {
                    title: null
                } : {}
            } : undefined;
            if (!cartID) {
                throw new Error('Cart ID not found in the PaymentIntent metadata');
            }
            const transactionCartID = idOf(current.cart);
            if (transactionCartID === undefined || String(transactionCartID) !== String(cartID)) {
                throw new Error(`PaymentIntent ${paymentIntentID} was created for cart ${cartID}, not for the cart of transaction ${String(transaction.id)}.`);
            }
            if (!cartItemsSnapshot || !Array.isArray(cartItemsSnapshot)) {
                throw new Error('Cart items snapshot not found or invalid in the PaymentIntent metadata');
            }
            // Fetch the cart to get the tenant (needed for multi-tenant support)
            const cart = await payload.findByID({
                collection: 'carts',
                id: cartID,
                req,
                select: {
                    id: true,
                    tenant: true
                }
            });
            if (!cart) {
                throw new Error(`Cart with ID ${cartID} not found`);
            }
            // Extract tenant from cart for multi-tenant support
            // @ts-expect-error - tenant field may be added by multi-tenant plugin
            const cartTenant = typeof cart.tenant === 'object' ? cart.tenant?.id : cart.tenant;
            if (!cartTenant) {
                throw new Error(`Cart ${cartID} has no tenant assigned`);
            }
            const order = await payload.create({
                collection: ordersSlug,
                data: {
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency.toUpperCase(),
                    ...req.user ? {
                        customer: req.user.id
                    } : {
                        customerEmail
                    },
                    items: cartItemsSnapshot,
                    shippingAddress,
                    status: 'processing',
                    transactions: [
                        transaction.id
                    ],
                    tenant: cartTenant
                },
                req
            });
            const timestamp = new Date().toISOString();
            await payload.update({
                id: cartID,
                collection: 'carts',
                data: {
                    purchasedAt: timestamp
                },
                req
            });
            await payload.update({
                id: transaction.id,
                collection: transactionsSlug,
                data: {
                    order: order.id,
                    status: 'succeeded'
                },
                req
            });
            return {
                message: 'Payment initiated successfully',
                orderID: order.id,
                transactionID: transaction.id,
                ...order.accessToken ? {
                    accessToken: order.accessToken
                } : {}
            };
        });
    };

//# sourceMappingURL=confirmOrder.js.map