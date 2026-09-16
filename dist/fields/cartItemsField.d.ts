import type { ArrayField } from 'payload';
import type { CurrenciesConfig, MultiTenantConfig } from '../types/index.js';
type Props = {
    /**
     * Include this in order to enable support for currencies per item in the cart.
     */
    currenciesConfig?: CurrenciesConfig;
    enableVariants?: boolean;
    /**
     * Enables individual prices for each item in the cart.
     * Defaults to false.
     */
    individualPrices?: boolean;
    /**
     * Multi-tenant configuration. Scopes the product and variant pickers on each line to the
     * tenant of the cart, order or transaction the line belongs to.
     */
    multiTenant?: MultiTenantConfig;
    overrides?: Partial<ArrayField>;
    /**
     * Slug of the products collection, defaults to 'products'.
     */
    productsSlug?: string;
    /**
     * Slug of the variants collection, defaults to 'variants'.
     */
    variantsSlug?: string;
};
export declare const cartItemsField: (props?: Props) => ArrayField;
export {};
//# sourceMappingURL=cartItemsField.d.ts.map