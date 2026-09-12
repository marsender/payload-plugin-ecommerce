import type { DefaultDocumentIDType, PayloadRequest } from 'payload';
type Args = {
    productsSlug?: string;
    req: PayloadRequest;
    transactionID: DefaultDocumentIDType;
    transactionsSlug?: string;
    variantsSlug?: string;
};
/**
 * Takes a settled transaction's items out of stock: each variant's, or else each product's,
 * `inventory` goes down by the quantity bought.
 *
 * Call it once per order. The confirm-order endpoint does so when an adapter reports the
 * transaction it settled; the Stripe adapter reports none, because `settlePaymentIntent` calls this
 * itself, in the same database transaction as the order, for every path that settles a payment.
 */
export declare const decrementInventoryForTransaction: ({ productsSlug, req, transactionID, transactionsSlug, variantsSlug }: Args) => Promise<void>;
export {};
//# sourceMappingURL=decrementInventoryForTransaction.d.ts.map