import { populateTenant } from '../../utilities/populateTenant.js';
import { tenantScopedFilterOptions, withFilterOptions } from '../../utilities/tenantFilterOptions.js';
import { tenantAdminAccess, tenantListFilter } from '../../utilities/tenantAdminAccess.js';
export const createVariantOptionsCollection = (props)=>{
    const { access, multiTenant, variantTypesSlug = 'variantTypes' } = props || {};
    const tenantsSlug = multiTenant?.tenantsSlug || 'tenants';
    const fields = [
        // Tenant field (only added when multiTenant is enabled)
        ...multiTenant?.enabled ? [
            {
                name: 'tenant',
                type: 'relationship',
                admin: {
                    position: 'sidebar',
                    readOnly: true
                },
                index: true,
                label: ({ t })=>t('plugin-ecommerce:tenant') || 'Tenant',
                relationTo: tenantsSlug,
                required: false
            }
        ] : [],
        {
            name: 'variantType',
            type: 'relationship',
            admin: {
                readOnly: true
            },
            ...withFilterOptions(tenantScopedFilterOptions(multiTenant)),
            relationTo: variantTypesSlug,
            required: true
        },
        {
            name: 'label',
            type: 'text',
            required: true
        },
        {
            name: 'value',
            type: 'text',
            admin: {
                description: 'should be defaulted or dynamic based on label'
            },
            required: true
        }
    ];
    const adminAccess = tenantAdminAccess({
        isAdmin: access.isAdmin,
        multiTenant
    });
    const baseConfig = {
        slug: 'variantOptions',
        access: {
            create: adminAccess,
            delete: adminAccess,
            read: access.publicAccess,
            update: adminAccess
        },
        admin: {
            group: false,
            useAsTitle: 'label',
            ...multiTenant?.enabled && {
                baseListFilter: tenantListFilter(multiTenant)
            }
        },
        fields,
        hooks: {
            ...multiTenant?.enabled && {
                beforeChange: [
                    populateTenant({
                        tenantsSlug
                    })
                ]
            }
        },
        labels: {
            plural: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:variantOptions'),
            singular: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:variantOption')
        },
        trash: true
    };
    return {
        ...baseConfig
    };
};

//# sourceMappingURL=createVariantOptionsCollection.js.map