import Stripe from 'stripe';
import { idOf, settlePaymentIntent } from './settlePaymentIntent.js';
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
 * The browser's confirmation of a Stripe payment: settles it through `settlePaymentIntent`, which
 * makes it safe to call more than once and at the same time as any other settlement of the same
 * payment — every call after the first returns the order the first one created.
 *
 * **Only the buyer may confirm** (`isTransactionBuyer`), checked under the lock before anything is
 * returned or written. First-confirmation-wins makes this load-bearing: without it, whoever
 * confirmed a leaked PaymentIntent id first would own the order and its credits, and the buyer's
 * own confirmation would then only be handed that stranger's order.
 *
 * It never returns a `transactionID`: the confirm-order endpoint adjusts inventory whenever one is
 * returned, and `settlePaymentIntent` already did so, atomically with the order. A repeat call
 * returns no `accessToken` either.
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
        const callerEmail = req.user ? req.user.email : customerEmail;
        const result = await settlePaymentIntent({
            authorize: (current)=>{
                if (!isTransactionBuyer({
                    callerEmail,
                    callerID: req.user?.id,
                    transaction: current
                })) {
                    throw new Error(`Refusing to confirm PaymentIntent ${paymentIntentID}: the caller is not the buyer of transaction ${String(transaction.id)}.`);
                }
            },
            ordersSlug,
            paymentIntentID,
            req,
            stripe,
            transactionID: transaction.id,
            transactionsSlug
        });
        switch(result.status){
            case 'created':
                return {
                    message: 'Payment initiated successfully',
                    orderID: result.orderID,
                    ...result.accessToken ? {
                        accessToken: result.accessToken
                    } : {}
                };
            case 'existing':
                return {
                    message: 'Order already confirmed',
                    orderID: result.orderID
                };
            default:
                // `too-recent` cannot happen without `succeededBefore`; both mean no money to confirm.
                throw new Error(`Payment not completed.`);
        }
    };

//# sourceMappingURL=confirmOrder.js.map