import { populateTenant } from '../../utilities/populateTenant.js';
import { tenantBaseListFilter } from '../../utilities/tenantBaseListFilter.js';
import { hasTenantAccess } from '../carts/cartTenantAccess.js';
export const createVariantTypesCollection = (props)=>{
    const { access, multiTenant, variantOptionsSlug = 'variantOptions' } = props || {};
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
            name: 'label',
            type: 'text',
            required: true
        },
        {
            name: 'name',
            type: 'text',
            required: true
        },
        {
            name: 'options',
            type: 'join',
            collection: variantOptionsSlug,
            maxDepth: 2,
            on: 'variantType',
            orderable: true
        }
    ];
    // Admin access: when multiTenant is enabled, use tenant-scoped access; otherwise use isAdmin
    const adminAccess = multiTenant?.enabled ? hasTenantAccess({
        isAdmin: access.isAdmin
    }) : access.isAdmin;
    const baseConfig = {
        slug: 'variantTypes',
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
                baseListFilter: tenantBaseListFilter()
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
                t('plugin-ecommerce:variantTypes'),
            singular: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:variantType')
        },
        trash: true
    };
    return {
        ...baseConfig
    };
};

//# sourceMappingURL=createVariantTypesCollection.js.map