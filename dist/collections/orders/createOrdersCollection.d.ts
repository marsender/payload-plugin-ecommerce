import type { CollectionConfig, Field } from 'payload';
import type { AccessConfig, CurrenciesConfig, MultiTenantConfig } from '../../types/index.js';
type Props = {
    access: Pick<AccessConfig, 'adminOnlyFieldAccess' | 'isAdmin' | 'isDocumentOwner'>;
    /**
     * Array of fields used for capturing the shipping address data.
     */
    addressFields?: Field[];
    currenciesConfig?: CurrenciesConfig;
    /**
     * Slug of the customers collection, defaults to 'users'.
     */
    customersSlug?: string;
    enableVariants?: boolean;
    /**
     * Multi-tenant configuration. Orders carry the `tenant` field added by
     * `@payloadcms/plugin-multi-tenant`; this scopes the pickers that point at collections the
     * plugin does not manage — the customer and the transactions behind the order.
     */
    multiTenant?: MultiTenantConfig;
    /**
     * Slug of the products collection, defaults to 'products'.
     */
    productsSlug?: string;
    /**
     * Slug of the transactions collection, defaults to 'transactions'.
     */
    transactionsSlug?: string;
    /**
     * Slug of the variants collection, defaults to 'variants'.
     */
    variantsSlug?: string;
};
export declare const createOrdersCollection: (props: Props) => CollectionConfig;
export {};
//# sourceMappingURL=createOrdersCollection.d.ts.map