import type { CollectionConfig, Field } from 'payload';
import type { AccessConfig, CurrenciesConfig, PaymentAdapter } from '../../types/index.js';
type Props = {
    access: Pick<AccessConfig, 'isAdmin'>;
    /**
     * Array of fields used for capturing the billing address.
     */
    addressFields?: Field[];
    /**
     * Slug of the carts collection, defaults to 'carts'.
     */
    cartsSlug?: string;
    currenciesConfig?: CurrenciesConfig;
    /**
     * Slug of the customers collection, defaults to 'users'.
     */
    customersSlug?: string;
    /**
     * Enable variants in the transactions collection.
     */
    enableVariants?: boolean;
    /**
     * Multi-tenant configuration for transactions.
     * When enabled, transactions will have a tenant field and access will be scoped by tenant for admins.
     */
    multiTenant?: {
        /**
         * Whether multi-tenant support is enabled.
         */
        enabled: boolean;
        /**
         * The slug of the tenants collection.
         * @default 'tenants'
         */
        tenantsSlug?: string;
    };
    /**
     * Slug of the orders collection, defaults to 'orders'.
     */
    ordersSlug?: string;
    paymentMethods?: PaymentAdapter[];
    /**
     * Slug of the products collection, defaults to 'products'.
     */
    productsSlug?: string;
    /**
     * Slug of the variants collection, defaults to 'variants'.
     */
    variantsSlug?: string;
};
export declare const createTransactionsCollection: (props: Props) => CollectionConfig;
export {};
//# sourceMappingURL=createTransactionsCollection.d.ts.map