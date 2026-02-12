import type { Field } from 'payload';
type Props = {
    /**
     * Multi-tenant configuration for variants.
     * When enabled, the variantTypes relationship will be filtered by the product's tenant.
     */
    multiTenant?: {
        enabled: boolean;
        tenantsSlug?: string;
    };
    /**
     * Slug of the variants collection, defaults to 'variants'.
     */
    variantsSlug?: string;
    /**
     * Slug of the variant types collection, defaults to 'variantTypes'.
     */
    variantTypesSlug?: string;
};
export declare const variantsFields: (props: Props) => Field[];
export {};
//# sourceMappingURL=variantsFields.d.ts.map