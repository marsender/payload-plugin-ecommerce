import { decrementInventoryForTransaction } from '../../../utilities/decrementInventoryForTransaction.js';
import { withCartLock } from '../../../utilities/withCartLock.js';
export const idOf = (value)=>{
    if (typeof value === 'string' || typeof value === 'number') {
        return value;
    }
    if (value && typeof value === 'object' && 'id' in value) {
        return idOf(value.id);
    }
    return undefined;
};
/**
 * Turns a succeeded PaymentIntent into an order, exactly once.
 *
 * Every path that creates an order from a Stripe payment goes through here: the confirm-order
 * endpoint a browser calls, and a job recovering a payment no browser confirmed. They can run at
 * the same moment for the same payment — two tabs on a phone did, 0.4 s apart — so the check and
 * the writes run under `withCartLock`, keyed on the transaction's cart (the lock `initiatePayment`
 * takes too). A second caller gets the lock only once the first has committed, and then finds the
 * order it created.
 *
 * Stock is taken out in the same database transaction as the order is created, so the two cannot
 * disagree: a settlement that fails after the order rolls both back, and the settlement that finds
 * an existing order never touches stock again. No caller adjusts inventory for a Stripe payment.
 *
 * The order is built from what the transaction and the PaymentIntent recorded, never from the
 * caller: the buyer is the transaction's `customer` (or, for a guest, its `customerEmail`), and the
 * items are the PaymentIntent's snapshot of its own cart, which must be the transaction's cart.
 *
 * Every database call passes `req` so it runs inside the lock's transaction.
 */ export const settlePaymentIntent = async ({ authorize, ordersSlug = 'orders', paymentIntentID, productsSlug = 'products', req, stripe, succeededBefore, transactionID, transactionsSlug = 'transactions', variantsSlug = 'variants' })=>{
    const payload = req.payload;
    const locate = await payload.findByID({
        id: transactionID,
        collection: transactionsSlug,
        depth: 0,
        overrideAccess: true,
        req,
        select: {
            cart: true
        }
    });
    if (!locate) {
        throw new Error(`Transaction ${String(transactionID)} not found`);
    }
    // A transaction is always created with its cart; the PaymentIntent id only stands in so a row
    // without one is still serialised against itself.
    const lockKey = idOf(locate.cart) ?? paymentIntentID;
    return await withCartLock(req, lockKey, async ()=>{
        const current = await payload.findByID({
            id: transactionID,
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
            throw new Error(`Transaction ${String(transactionID)} not found`);
        }
        authorize(current);
        const existingOrderID = idOf(current.order);
        if (existingOrderID !== undefined) {
            return {
                orderID: existingOrderID,
                status: 'existing'
            };
        }
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentID, {
            expand: [
                'latest_charge'
            ]
        });
        if (paymentIntent.status !== 'succeeded') {
            return {
                paymentIntentStatus: paymentIntent.status,
                status: 'not-succeeded'
            };
        }
        if (succeededBefore) {
            const charge = paymentIntent.latest_charge;
            const chargedAt = charge && typeof charge === 'object' ? charge.created * 1000 : paymentIntent.created * 1000;
            if (chargedAt > succeededBefore.getTime()) {
                return {
                    status: 'too-recent'
                };
            }
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
            throw new Error(`PaymentIntent ${paymentIntentID} was created for cart ${cartID}, not for the cart of transaction ${String(transactionID)}.`);
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
        const buyerID = idOf(current.customer);
        const order = await payload.create({
            collection: ordersSlug,
            data: {
                amount: paymentIntent.amount,
                currency: paymentIntent.currency.toUpperCase(),
                ...buyerID !== undefined ? {
                    customer: buyerID
                } : {
                    customerEmail: current.customerEmail
                },
                items: cartItemsSnapshot,
                shippingAddress,
                status: 'processing',
                transactions: [
                    transactionID
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
            id: transactionID,
            collection: transactionsSlug,
            data: {
                order: order.id,
                status: 'succeeded'
            },
            req
        });
        await decrementInventoryForTransaction({
            productsSlug,
            req,
            transactionID,
            transactionsSlug,
            variantsSlug
        });
        return {
            ...order.accessToken ? {
                accessToken: order.accessToken
            } : {},
            orderID: order.id,
            status: 'created',
            transactionID
        };
    });
};

//# sourceMappingURL=settlePaymentIntent.js.map