import { amountField } from '../../fields/amountField.js';
import { cartItemsField } from '../../fields/cartItemsField.js';
import { currencyField } from '../../fields/currencyField.js';
import { accessOR } from '../../utilities/accessComposition.js';
import { beforeChangeOrder } from './beforeChange.js';
import { customerTenantFilterOptions, tenantScopedFilterOptions, toID, withFilterOptions } from '../../utilities/tenantFilterOptions.js';
export const createOrdersCollection = (props)=>{
    const { access, addressFields, currenciesConfig, customersSlug = 'users', enableVariants = false, multiTenant, productsSlug = 'products', transactionsSlug = 'transactions', variantsSlug = 'variants' } = props || {};
    /**
   * After it is created an order is a record of what was bought and paid, not a form: only its
   * `status` may still move. The host decides who is exempt, through the same
   * `adminOnlyFieldAccess` knob the `transactions` link already uses.
   *
   * `access.update` rather than `admin.readOnly`, because only the former both disables the input
   * AND refuses the write. A field left editable in the panel while something downstream discards
   * the change is worse than a locked one: the admin retypes a line, saves, and is handed the old
   * value back with no error to explain it.
   */ const frozenAfterCreate = {
        update: access.adminOnlyFieldAccess
    };
    /**
   * Payload resolves permissions per FIELD, and freezing an array or a group does NOT reach the
   * inputs inside it: an order's `items` array was locked while the quantity in each of its rows
   * stayed editable — the worst of both, since the array's own access then refused the write and
   * the retyped figure came back unchanged with nothing to explain it. Applying the same access to
   * every named child is what actually locks a row.
   *
   * Unnamed wrappers (`row`, `collapsible`) take no access of their own, so they are descended
   * into rather than annotated.
   */ const freezeNested = (nested)=>nested.map((field)=>{
            const next = 'name' in field ? {
                ...field,
                access: frozenAfterCreate
            } : {
                ...field
            };
            if ('fields' in next && Array.isArray(next.fields)) {
                ;
                next.fields = freezeNested(next.fields);
            }
            return next;
        });
    const items = cartItemsField({
        enableVariants,
        multiTenant,
        overrides: {
            name: 'items',
            access: frozenAfterCreate,
            label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:items'),
            labels: {
                plural: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                    t('plugin-ecommerce:items'),
                singular: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                    t('plugin-ecommerce:item')
            }
        },
        productsSlug,
        variantsSlug
    });
    items.fields = freezeNested(items.fields);
    const fields = [
        {
            type: 'tabs',
            tabs: [
                {
                    fields: [
                        items
                    ],
                    label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                        t('plugin-ecommerce:orderDetails')
                },
                {
                    fields: [
                        ...addressFields ? [
                            {
                                name: 'shippingAddress',
                                type: 'group',
                                access: frozenAfterCreate,
                                fields: freezeNested(addressFields),
                                label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                                    t('plugin-ecommerce:shippingAddress')
                            }
                        ] : []
                    ],
                    label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                        t('plugin-ecommerce:shipping')
                }
            ]
        },
        {
            name: 'customer',
            type: 'relationship',
            access: frozenAfterCreate,
            admin: {
                position: 'sidebar'
            },
            ...withFilterOptions(customerTenantFilterOptions(multiTenant)),
            label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:customer'),
            relationTo: customersSlug
        },
        {
            name: 'customerEmail',
            type: 'email',
            access: frozenAfterCreate,
            admin: {
                position: 'sidebar',
                // The address the order was placed with, not a field to fill in: a checkout writes the
                // guest's own email here, and an order naming a customer takes it from that account
                // below. Typing a third value would only invent a recipient nothing sends to.
                readOnly: true
            },
            hooks: {
                beforeChange: [
                    async ({ data, req, siblingData, value })=>{
                        // Only ever fills a blank: the stored address is a snapshot of who ordered, and an
                        // account that later changes its email must not rewrite the orders behind it.
                        if (value) {
                            return value;
                        }
                        const customerID = toID(data?.customer ?? siblingData?.customer);
                        if (customerID === null) {
                            return value;
                        }
                        try {
                            const customer = await req.payload.findByID({
                                id: customerID,
                                collection: customersSlug,
                                depth: 0,
                                req
                            });
                            return customer?.email ?? value;
                        } catch  {
                            // A customer that cannot be read is not a reason to refuse the order: the picker
                            // and `filterOptions` already decide whether naming them is legal at all.
                            return value;
                        }
                    }
                ]
            },
            label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:customerEmail')
        },
        {
            name: 'transactions',
            type: 'relationship',
            access: {
                create: access.adminOnlyFieldAccess,
                read: access.adminOnlyFieldAccess,
                update: access.adminOnlyFieldAccess
            },
            admin: {
                position: 'sidebar'
            },
            ...withFilterOptions(tenantScopedFilterOptions(multiTenant)),
            hasMany: true,
            label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:transactions'),
            relationTo: transactionsSlug
        },
        {
            name: 'status',
            type: 'select',
            admin: {
                position: 'sidebar'
            },
            defaultValue: 'processing',
            interfaceName: 'OrderStatus',
            label: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:status'),
            options: [
                {
                    // @ts-expect-error - translations are not typed in plugins yet
                    label: ({ t })=>t('plugin-ecommerce:processing'),
                    value: 'processing'
                },
                {
                    // @ts-expect-error - translations are not typed in plugins yet
                    label: ({ t })=>t('plugin-ecommerce:completed'),
                    value: 'completed'
                },
                {
                    // @ts-expect-error - translations are not typed in plugins yet
                    label: ({ t })=>t('plugin-ecommerce:cancelled'),
                    value: 'cancelled'
                },
                {
                    // @ts-expect-error - translations are not typed in plugins yet
                    label: ({ t })=>t('plugin-ecommerce:refunded'),
                    value: 'refunded'
                }
            ]
        },
        ...currenciesConfig ? [
            {
                type: 'row',
                admin: {
                    position: 'sidebar'
                },
                fields: [
                    amountField({
                        currenciesConfig,
                        overrides: {
                            access: frozenAfterCreate
                        }
                    }),
                    currencyField({
                        currenciesConfig,
                        overrides: {
                            access: frozenAfterCreate
                        }
                    })
                ]
            }
        ] : []
    ];
    const baseConfig = {
        slug: 'orders',
        access: {
            create: access.isAdmin,
            delete: access.isAdmin,
            read: accessOR(access.isAdmin, access.isDocumentOwner),
            update: access.isAdmin
        },
        admin: {
            description: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:ordersCollectionDescription'),
            group: 'Ecommerce',
            useAsTitle: 'createdAt'
        },
        fields,
        hooks: {
            beforeChange: [
                beforeChangeOrder({
                    currenciesConfig,
                    productsSlug,
                    variantsSlug
                })
            ]
        },
        labels: {
            plural: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:orders'),
            singular: ({ t })=>// @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:order')
        },
        timestamps: true
    };
    return {
        ...baseConfig
    };
};

//# sourceMappingURL=createOrdersCollection.js.map