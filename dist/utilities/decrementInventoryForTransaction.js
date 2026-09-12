/**
 * Takes a settled transaction's items out of stock: each variant's, or else each product's,
 * `inventory` goes down by the quantity bought.
 *
 * Call it once per order. The confirm-order endpoint does so when an adapter reports the
 * transaction it settled; the Stripe adapter reports none, because `settlePaymentIntent` calls this
 * itself, in the same database transaction as the order, for every path that settles a payment.
 */ export const decrementInventoryForTransaction = async ({ productsSlug = 'products', req, transactionID, transactionsSlug = 'transactions', variantsSlug = 'variants' })=>{
    const payload = req.payload;
    const transaction = await payload.findByID({
        id: transactionID,
        collection: transactionsSlug,
        depth: 0,
        req,
        select: {
            id: true,
            items: true
        }
    });
    if (!transaction || !Array.isArray(transaction.items) || transaction.items.length === 0) {
        return;
    }
    for (const item of transaction.items){
        if (item.variant) {
            const id = typeof item.variant === 'object' ? item.variant.id : item.variant;
            await payload.db.updateOne({
                id,
                collection: variantsSlug,
                data: {
                    inventory: {
                        $inc: item.quantity * -1
                    }
                },
                req
            });
        } else if (item.product) {
            const id = typeof item.product === 'object' ? item.product.id : item.product;
            await payload.db.updateOne({
                id,
                collection: productsSlug,
                data: {
                    inventory: {
                        $inc: item.quantity * -1
                    }
                },
                req
            });
        }
    }
};

//# sourceMappingURL=decrementInventoryForTransaction.js.map