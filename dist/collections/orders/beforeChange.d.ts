import type { CollectionBeforeChangeHook } from 'payload';
import type { CurrenciesConfig } from '../../types/index.js';
type Props = {
    currenciesConfig?: CurrenciesConfig;
    productsSlug: string;
    variantsSlug: string;
};
/**
 * Fills a BLANK `amount` from the order's own lines, the way `beforeChangeCart` fills a cart's
 * subtotal.
 *
 * Only a blank one, and that restriction is the whole design. An order's amount is what was
 * actually charged — after a coupon, and as the payment provider recorded it — so recomputing it
 * on a later save would quietly restate a receipt from today's catalogue prices. An order typed in
 * by hand is what this exists for: its lines are known, and the total is arithmetic nobody should
 * have to do twice.
 *
 * A line whose price cannot be read abandons the whole computation rather than contributing
 * nothing to it: an amount left empty is visible to whoever is entering the order, a total that is
 * silently short by one line is not.
 */
export declare const beforeChangeOrder: (args: Props) => CollectionBeforeChangeHook;
export {};
//# sourceMappingURL=beforeChange.d.ts.map