import { inventoryField } from '../../../fields/inventoryField.js';
import { pricesField } from '../../../fields/pricesField.js';
import { populateTenant } from '../../../utilities/populateTenant.js';
import { tenantBaseListFilter } from '../../../utilities/tenantBaseListFilter.js';
import { hasTenantAccess } from '../../carts/cartTenantAccess.js';
import { variantsCollectionBeforeChange as beforeChange } from './hooks/beforeChange.js';
import { validateOptions } from './hooks/validateOptions.js';
export const createVariantsCollection = (props)=>{
    const { access, currenciesConfig, inventory = true, multiTenant, productsSlug = 'products', variantOptionsSlug = 'variantOptions', variantTypesSlug = 'variantTypes' } = props || {};
    const { supportedCurrencies } = currenciesConfig || {};
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
            name: 'title',
            type: 'text',
            admin: {
                description: 'Used for administrative purposes, not shown to customers. This is populated by default.'
            }
        },
        {
            name: 'product',
            type: 'relationship',
            admin: {
                position: 'sidebar',
                readOnly: true
            },
            relationTo: productsSlug,
            required: true
        },
        {
            // This might need to be a custom component, to show a selector for each variant that is
            // enabled on the parent product
            // - separate select inputs, each showing only a specific variant (w/ options)
            // - it will save data to the DB as IDs in this relationship field
            // and needs a validate function as well which enforces that the options are fully specified, and accurate
            name: 'options',
            type: 'relationship',
            admin: {
                components: {
                    Field: {
                        path: '@marsender/payload-plugin-ecommerce/rsc#VariantOptionsSelector'
                    }
                }
            },
            custom: {
                productsSlug,
                variantTypesSlug
            },
            hasMany: true,
            label: 'Variant options',
            relationTo: variantOptionsSlug,
            required: true,
            validate: validateOptions({
                productsCollectionSlug: productsSlug
            })
        },
        ...inventory ? [
            inventoryField()
        ] : []
    ];
    if (supportedCurrencies?.length && supportedCurrencies.length > 0) {
        const currencyOptions = [];
        supportedCurrencies.forEach((currency)=>{
            currencyOptions.push(currency.code);
        });
        if (currenciesConfig) {
            fields.push(...pricesField({
                currenciesConfig
            }));
        }
    }
    // Admin access: when multiTenant is enabled, use tenant-scoped access; otherwise use isAdmin
    const adminAccess = multiTenant?.enabled ? hasTenantAccess({
        isAdmin: access.isAdmin
    }) : access.isAdmin;
    const baseConfig = {
        slug: 'variants',
        access: {
            create: adminAccess,
            delete: adminAccess,
            read: access.adminOrPublishedStatus,
            update: adminAccess
        },
        admin: {
            description: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:variantsCollectionDescription'),
            group: false,
            useAsTitle: 'title',
            ...multiTenant?.enabled && {
                baseListFilter: tenantBaseListFilter()
            }
        },
        fields,
        hooks: {
            beforeChange: [
                ...multiTenant?.enabled ? [
                    populateTenant({
                        tenantsSlug
                    })
                ] : [],
                beforeChange({
                    productsSlug,
                    variantOptionsSlug
                })
            ]
        },
        labels: {
            plural: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:variants'),
            singular: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:variant')
        },
        trash: true,
        versions: {
            drafts: {
                autosave: true
            }
        }
    };
    return baseConfig;
};

//# sourceMappingURL=index.js.map