import type { DefaultDocumentIDType, PayloadRequest } from 'payload';
import type Stripe from 'stripe';
/** The one Stripe call settling needs, so a caller (or a test) can hand in its own client. */
export type PaymentIntentRetriever = {
    paymentIntents: {
        retrieve: (id: string, params?: Stripe.PaymentIntentRetrieveParams) => Promise<Stripe.PaymentIntent>;
    };
};
/** The transaction as it stands under the lock: what an `authorize` callback gets to judge. */
export type SettleableTransaction = {
    cart?: unknown;
    customer?: unknown;
    customerEmail?: unknown;
    id: DefaultDocumentIDType;
    order?: unknown;
};
export type SettlePaymentIntentResult = 
/** This call created the order, and took its items out of stock in the same transaction. */
{
    accessToken?: string;
    orderID: DefaultDocumentIDType;
    status: 'created';
    transactionID: DefaultDocumentIDType;
}
/** An earlier call created it. Nothing was written. */
 | {
    orderID: DefaultDocumentIDType;
    status: 'existing';
}
/** Stripe has not taken the money (yet). Nothing was written. */
 | {
    paymentIntentStatus: Stripe.PaymentIntent.Status;
    status: 'not-succeeded';
}
/** Succeeded more recently than `succeededBefore`. Nothing was written. */
 | {
    status: 'too-recent';
};
export type SettlePaymentIntentArgs = {
    /**
     * Decides, under the lock and before anything is returned or written, whether this caller may
     * settle the transaction. Throw from it to refuse. A browser confirmation checks the caller is
     * the buyer; a server job acting on Stripe's own record of the payment has no caller to check.
     */
    authorize: (transaction: SettleableTransaction) => void;
    ordersSlug?: string;
    paymentIntentID: string;
    productsSlug?: string;
    req: PayloadRequest;
    stripe: PaymentIntentRetriever;
    /**
     * Leave alone a payment whose charge is more recent than this, reporting `too-recent`. A job
     * uses it so it does not race the buyer's own browser, which is normally a second behind the
     * charge; the lock would keep that race harmless, but the job would report a failure that
     * never happened.
     */
    succeededBefore?: Date;
    transactionID: DefaultDocumentIDType;
    transactionsSlug?: string;
    variantsSlug?: string;
};
export declare const idOf: (value: unknown) => DefaultDocumentIDType | undefined;
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
 */
export declare const settlePaymentIntent: ({ authorize, ordersSlug, paymentIntentID, productsSlug, req, stripe, succeededBefore, transactionID, transactionsSlug, variantsSlug, }: SettlePaymentIntentArgs) => Promise<SettlePaymentIntentResult>;
//# sourceMappingURL=settlePaymentIntent.d.ts.map