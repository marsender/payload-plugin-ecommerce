export const variantsFields = ({ multiTenant, variantsSlug = 'variants', variantTypesSlug = 'variantTypes' })=>{
    // Filter variant types by tenant when multi-tenant is enabled
    const tenantFilterOptions = multiTenant?.enabled ? ({ data })=>{
        const tenantId = typeof data?.tenant === 'object' ? data?.tenant?.id : data?.tenant;
        if (tenantId) {
            return {
                tenant: {
                    equals: tenantId
                }
            };
        }
        return true;
    } : undefined;
    const fields = [
        {
            name: 'enableVariants',
            type: 'checkbox',
            label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:enableVariants')
        },
        {
            name: 'variantTypes',
            type: 'relationship',
            admin: {
                condition: ({ enableVariants })=>Boolean(enableVariants)
            },
            ...tenantFilterOptions && {
                filterOptions: tenantFilterOptions
            },
            hasMany: true,
            label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:variantTypes'),
            relationTo: variantTypesSlug
        },
        {
            name: 'variants',
            type: 'join',
            admin: {
                condition: ({ enableVariants, variantTypes })=>{
                    const enabledVariants = Boolean(enableVariants);
                    const hasManyVariantTypes = Array.isArray(variantTypes) && variantTypes.length > 0;
                    return enabledVariants && hasManyVariantTypes;
                },
                defaultColumns: [
                    'title',
                    'options',
                    'inventory',
                    'prices',
                    '_status'
                ],
                disableListColumn: true
            },
            collection: variantsSlug,
            label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:availableVariants'),
            maxDepth: 2,
            on: 'product'
        }
    ];
    return fields;
};

//# sourceMappingURL=variantsFields.js.map