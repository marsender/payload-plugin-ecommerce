import { ValidationError } from 'payload';
import { toID } from '../../utilities/tenantFilterOptions.js';
/**
 * Fills a blank `amount` from the order's own lines ON CREATE, the way `beforeChangeCart` fills a
 * cart's subtotal.
 *
 * On create only, and only when blank — that restriction is the whole design. An order's amount is
 * what was actually charged, after a coupon and as the payment provider recorded it, so pricing it
 * again later would quietly restate a receipt from today's catalogue. `operation` is what decides
 * that, not the absence of a value: an order whose amount was never set (one recorded before this
 * hook existed, say) would otherwise be given one by the next save that touched it.
 *
 * A line whose price cannot be read REFUSES the order rather than pricing it wrong. Leaving the
 * amount blank was the earlier behaviour and it was worse than it looked: nothing downstream
 * treats a missing amount as unknown — the confirmation email renders `amount ?? 0` and mails the
 * customer a receipt for 0,00, and the same zero lands in the tenant's revenue. Whoever is
 * entering the order can always price it themselves, and an amount they typed is taken as given.
 */ /**
 * Refuses the save, pinned to `amount` so the panel shows it against the field the person can act
 * on: typing the figure themselves is the way through.
 */ const unpriceable = (req, reason)=>{
    req.payload.logger.warn(`${reason}: refusing the order, its amount cannot be computed`);
    const errors = [
        // @ts-expect-error - translations are not typed in plugins yet
        {
            message: req.t('plugin-ecommerce:priceNotSet'),
            path: 'amount'
        }
    ];
    return new ValidationError({
        collection: 'orders',
        errors,
        req
    }, req.t);
};
export const beforeChangeOrder = ({ currenciesConfig, productsSlug, variantsSlug })=>async ({ data, operation, req })=>{
        if (operation !== 'create' || !currenciesConfig || typeof data.amount === 'number') {
            return data;
        }
        if (!Array.isArray(data.items) || data.items.length === 0) {
            return data;
        }
        const currency = data.currency ?? currenciesConfig.defaultCurrency ?? currenciesConfig.supportedCurrencies[0]?.code;
        if (!currency) {
            return data;
        }
        const priceField = `priceIn${String(currency).toUpperCase()}`;
        let amount = 0;
        for (const item of data.items){
            const quantity = typeof item?.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
            const variantID = toID(item?.variant);
            const productID = toID(item?.product);
            const source = variantID !== null ? {
                collection: variantsSlug,
                id: variantID
            } : productID !== null ? {
                collection: productsSlug,
                id: productID
            } : null;
            if (!source) {
                throw unpriceable(req, '[order] a line names no product');
            }
            let price;
            try {
                const doc = await req.payload.findByID({
                    id: source.id,
                    collection: source.collection,
                    depth: 0,
                    req,
                    select: {
                        [priceField]: true
                    }
                });
                price = doc?.[priceField];
            } catch  {
                price = undefined;
            }
            if (typeof price !== 'number') {
                throw unpriceable(req, `[order] no ${priceField} on ${source.collection} ${String(source.id)}`);
            }
            amount += price * quantity;
        }
        data.amount = amount;
        return data;
    };

//# sourceMappingURL=beforeChange.js.map