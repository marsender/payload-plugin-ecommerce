import type { CollectionConfig } from 'payload';
import type { AccessConfig } from '../../types/index.js';
type Props = {
    access: Pick<AccessConfig, 'isAdmin' | 'publicAccess'>;
    /**
     * Multi-tenant configuration for variant types.
     * When enabled, variant types will have a tenant field and access will be scoped by tenant for admins.
     */
    multiTenant?: {
        enabled: boolean;
        tenantsSlug?: string;
    };
    /**
     * Slug of the variant options collection, defaults to 'variantOptions'.
     */
    variantOptionsSlug?: string;
};
export declare const createVariantTypesCollection: (props: Props) => CollectionConfig;
export {};
//# sourceMappingURL=createVariantTypesCollection.d.ts.map