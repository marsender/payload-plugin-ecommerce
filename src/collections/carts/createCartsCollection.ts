import type { Access, CollectionConfig, Field } from 'payload'

import type { AccessConfig, CurrenciesConfig } from '../../types/index.js'
import type { CartItemMatcher } from './operations/types.js'

import { amountField } from '../../fields/amountField.js'
import { cartItemsField } from '../../fields/cartItemsField.js'
import { currencyField } from '../../fields/currencyField.js'
import { accessOR, conditional } from '../../utilities/accessComposition.js'
import { beforeChangeCart } from './beforeChange.js'
import { hasTenantAccess } from './cartTenantAccess.js'
import { addItemEndpoint } from './endpoints/addItem.js'
import { clearCartEndpoint } from './endpoints/clearCart.js'
import { mergeCartEndpoint } from './endpoints/mergeCart.js'
import { removeItemEndpoint } from './endpoints/removeItem.js'
import { updateItemEndpoint } from './endpoints/updateItem.js'
import { hasCartSecretAccess } from './hasCartSecretAccess.js'
import { populateTenant } from './populateTenant.js'
import { statusBeforeRead } from './statusBeforeRead.js'
import { tenantBaseListFilter } from './tenantBaseListFilter.js'

type Props = {
  access: Pick<Required<AccessConfig>, 'isAdmin' | 'isAuthenticated' | 'isDocumentOwner'>
  /**
   * Allow guest (unauthenticated) users to create carts.
   * Defaults to false.
   */
  allowGuestCarts?: boolean
  /**
   * Custom function to determine if two cart items should be considered the same.
   * When items match, their quantities are combined instead of creating separate entries.
   *
   * Use this to add custom uniqueness criteria beyond product and variant IDs.
   *
   * @default defaultCartItemMatcher (matches by product and variant ID only)
   *
   * @example
   * ```ts
   * cartItemMatcher: ({ existingItem, newItem }) => {
   *   // Match by product, variant, AND custom delivery option
   *   const productMatch = existingItem.product === newItem.product
   *   const variantMatch = existingItem.variant === newItem.variant
   *   const deliveryMatch = existingItem.deliveryOption === newItem.deliveryOption
   *   return productMatch && variantMatch && deliveryMatch
   * }
   * ```
   */
  cartItemMatcher?: CartItemMatcher
  currenciesConfig?: CurrenciesConfig
  /**
   * Slug of the customers collection, defaults to 'users'.
   */
  customersSlug?: string
  /**
   * Enables support for variants in the cart.
   * Defaults to false.
   */
  enableVariants?: boolean
  /**
   * Multi-tenant configuration for carts.
   * When enabled, carts will have a tenant field and access will be scoped by tenant for admins.
   * Guest access via secret is still supported.
   */
  multiTenant?: {
    /**
     * Whether multi-tenant support is enabled.
     */
    enabled: boolean
    /**
     * The slug of the tenants collection.
     * @default 'tenants'
     */
    tenantsSlug?: string
  }
  /**
   * Slug of the products collection, defaults to 'products'.
   */
  productsSlug?: string
  /**
   * Slug of the variants collection, defaults to 'variants'.
   */
  variantsSlug?: string
}

export const createCartsCollection: (props: Props) => CollectionConfig = (props) => {
  const {
    access,
    allowGuestCarts = false,
    cartItemMatcher,
    currenciesConfig,
    customersSlug = 'users',
    enableVariants = false,
    multiTenant,
    productsSlug = 'products',
    variantsSlug = 'variants',
  } = props || {}

  const tenantsSlug = multiTenant?.tenantsSlug || 'tenants'

  const cartsSlug = 'carts'

  const fields: Field[] = [
    // Tenant field (only added when multiTenant is enabled)
    ...(multiTenant?.enabled
      ? [
          {
            name: 'tenant',
            type: 'relationship',
            relationTo: tenantsSlug,
            // Not required - guests create carts without tenant initially
            required: false,
            index: true,
            admin: {
              position: 'sidebar',
              // Read-only for everyone - populated automatically by hook
              readOnly: true,
            },
            label: ({ t }) =>
              // @ts-expect-error - translations are not typed in plugins yet
              t('plugin-ecommerce:tenant') || 'Tenant',
          } as Field,
        ]
      : []),
    cartItemsField({
      enableVariants,
      overrides: {
        label: ({ t }) =>
          // @ts-expect-error - translations are not typed in plugins yet
          t('plugin-ecommerce:items'),
        labels: {
          plural: ({ t }) =>
            // @ts-expect-error - translations are not typed in plugins yet
            t('plugin-ecommerce:items'),
          singular: ({ t }) =>
            // @ts-expect-error - translations are not typed in plugins yet
            t('plugin-ecommerce:item'),
        },
      },
      productsSlug,
      variantsSlug,
    }),
    {
      name: 'secret',
      type: 'text',
      access: {
        create: () => false, // Users can't set it manually
        read: () => false, // Never readable via field access (only through afterRead hook)
        update: () => false, // Users can't update it
      },
      admin: {
        hidden: true,
        position: 'sidebar',
        readOnly: true,
      },
      index: true,
      label: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:cartSecret'),
    },
    {
      name: 'customer',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      label: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:customer'),
      relationTo: customersSlug,
    },
    {
      name: 'purchasedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        position: 'sidebar',
      },
      label: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:purchasedAt'),
    },
    {
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        afterRead: [statusBeforeRead],
      },
      label: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:status'),
      options: [
        {
          // @ts-expect-error - translations are not typed in plugins yet
          label: ({ t }) => t('plugin-ecommerce:active'),
          value: 'active',
        },
        {
          // @ts-expect-error - translations are not typed in plugins yet
          label: ({ t }) => t('plugin-ecommerce:purchased'),
          value: 'purchased',
        },
        {
          // @ts-expect-error - translations are not typed in plugins yet
          label: ({ t }) => t('plugin-ecommerce:abandoned'),
          value: 'abandoned',
        },
      ],
      virtual: true,
    },
    ...(currenciesConfig
      ? [
          {
            type: 'row',
            admin: { position: 'sidebar' },
            fields: [
              amountField({
                currenciesConfig,
                overrides: {
                  name: 'subtotal',

                  label: ({ t }) =>
                    // @ts-expect-error - translations are not typed in plugins yet
                    t('plugin-ecommerce:subtotal'),
                },
              }),
              currencyField({
                currenciesConfig,
              }),
            ],
          } as Field,
        ]
      : []),
  ]

  // Internal access function for guest users (unauthenticated)
  const isGuest: Access = ({ req }) => !req.user

  // Admin access: when multiTenant is enabled, use tenant-scoped access; otherwise use isAdmin
  const adminAccess = multiTenant?.enabled
    ? hasTenantAccess({ isAdmin: access.isAdmin })
    : access.isAdmin

  const baseConfig: CollectionConfig = {
    slug: cartsSlug,
    access: {
      create: accessOR(
        access.isAdmin,
        access.isAuthenticated,
        conditional(allowGuestCarts, isGuest),
      ),
      delete: accessOR(adminAccess, access.isDocumentOwner, hasCartSecretAccess(allowGuestCarts)),
      read: accessOR(adminAccess, access.isDocumentOwner, hasCartSecretAccess(allowGuestCarts)),
      update: accessOR(adminAccess, access.isDocumentOwner, hasCartSecretAccess(allowGuestCarts)),
    },
    admin: {
      description: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:cartsCollectionDescription'),
      group: 'Ecommerce',
      useAsTitle: 'createdAt',
      // Filter list view by tenant when multiTenant is enabled
      ...(multiTenant?.enabled && {
        baseListFilter: tenantBaseListFilter(),
      }),
    },
    endpoints: [
      addItemEndpoint({ cartItemMatcher, cartsSlug }),
      clearCartEndpoint({ cartsSlug }),
      // mergeCartEndpoint uses its own matcher that handles CartItemData for both items
      mergeCartEndpoint({ cartsSlug }),
      removeItemEndpoint({ cartsSlug }),
      updateItemEndpoint({ cartsSlug }),
    ],
    fields,
    hooks: {
      afterRead: [
        ({ doc, req }) => {
          // Include secret only if this was just created (stored in context by beforeChange)
          if (req.context?.newCartSecret) {
            doc.secret = req.context.newCartSecret
          }
          // Secret is otherwise never exposed (field access is locked)
          return doc
        },
      ],
      beforeChange: [
        // Populate tenant from cookies when multiTenant is enabled
        ...(multiTenant?.enabled ? [populateTenant({ tenantsSlug })] : []),
        // This hook can be used to update the subtotal before saving the cart
        beforeChangeCart({ productsSlug, variantsSlug }),
      ],
    },
    labels: {
      plural: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:carts'),
      singular: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:cart'),
    },
    timestamps: true,
  }

  return { ...baseConfig }
}
