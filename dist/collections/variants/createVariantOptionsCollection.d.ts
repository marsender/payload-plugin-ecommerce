import type { CollectionConfig } from 'payload';
import type { AccessConfig, MultiTenantConfig } from '../../types/index.js';
type Props = {
    access: Pick<AccessConfig, 'isAdmin' | 'publicAccess'>;
    /**
     * Multi-tenant configuration for variant options.
     * When enabled, variant options will have a tenant field, access will be scoped by tenant for
     * admins, and the variant type picker is scoped to the same tenant.
     */
    multiTenant?: MultiTenantConfig;
    /**
     * Slug of the variant types collection, defaults to 'variantTypes'.
     */
    variantTypesSlug?: string;
};
export declare const createVariantOptionsCollection: (props: Props) => CollectionConfig;
export {};
//# sourceMappingURL=createVariantOptionsCollection.d.ts.map