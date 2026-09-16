import type { CollectionBeforeChangeHook } from 'payload';
import type { CurrenciesConfig } from '../../types/index.js';
type Props = {
    currenciesConfig?: CurrenciesConfig;
    productsSlug: string;
    variantsSlug: string;
};
export declare const beforeChangeOrder: (args: Props) => CollectionBeforeChangeHook;
export {};
//# sourceMappingURL=beforeChange.d.ts.map