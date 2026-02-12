import type { CollectionConfig } from 'payload';
import type { AccessConfig, CurrenciesConfig, InventoryConfig } from '../../../types/index.js';
type Props = {
    access: Pick<AccessConfig, 'adminOrPublishedStatus' | 'isAdmin'>;
    currenciesConfig?: CurrenciesConfig;
    /**
     * Enables inventory tracking for variants. Defaults to true.
     */
    inventory?: boolean | InventoryConfig;
    /**
     * Multi-tenant configuration for variants.
     * When enabled, variants will have a tenant field and access will be scoped by tenant for admins.
     */
    multiTenant?: {
        enabled: boolean;
        tenantsSlug?: string;
    };
    /**
     * Slug of the products collection, defaults to 'products'.
     */
    productsSlug?: string;
    /**
     * Slug of the variant options collection, defaults to 'variantOptions'.
     */
    variantOptionsSlug?: string;
    /**
     * Slug of the variant types collection, defaults to 'variantTypes'.
     */
    variantTypesSlug?: string;
};
export declare const createVariantsCollection: (props: Props) => CollectionConfig;
export {};
//# sourceMappingURL=index.d.ts.map