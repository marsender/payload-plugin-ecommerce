import type { CollectionConfig, Field } from 'payload';
import type { AccessConfig, CurrenciesConfig, MultiTenantConfig, PaymentAdapter } from '../../types/index.js';
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
     * When enabled, transactions will have a tenant field, access will be scoped by tenant for
     * admins, and every relationship picker on the collection is scoped to the same tenant.
     */
    multiTenant?: MultiTenantConfig;
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