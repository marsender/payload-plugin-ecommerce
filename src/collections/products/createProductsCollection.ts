import type { CollectionConfig } from 'payload'

import type {
  AccessConfig,
  CurrenciesConfig,
  InventoryConfig,
  MultiTenantConfig,
} from '../../types/index.js'

import { inventoryField } from '../../fields/inventoryField.js'
import { pricesField } from '../../fields/pricesField.js'
import { variantsFields } from '../../fields/variantsFields.js'
import { tenantAdminAccess } from '../../utilities/tenantAdminAccess.js'
import { deleteVariantsBeforeProductDelete } from './hooks/beforeDelete.js'

type Props = {
  access: Pick<AccessConfig, 'adminOrPublishedStatus' | 'isAdmin'>
  currenciesConfig: CurrenciesConfig
  enableVariants?: boolean
  /**
   * Adds in an inventory field to the product and its variants. This is useful for tracking inventory levels.
   * Defaults to true.
   */
  inventory?: boolean | InventoryConfig
  /**
   * Multi-tenant configuration. When enabled, update and delete take the tenant-scoped admin
   * branch (`tenantAdminAccess`) and the variantTypes relationship is filtered by the product's
   * tenant.
   */
  multiTenant?: MultiTenantConfig
  /**
   * Slug of the variants collection, defaults to 'variants'.
   */
  variantsSlug?: string
  /**
   * Slug of the variant types collection, defaults to 'variantTypes'.
   */
  variantTypesSlug?: string
}

export const createProductsCollection: (props: Props) => CollectionConfig = (props) => {
  const {
    access,
    currenciesConfig,
    enableVariants = false,
    inventory = true,
    multiTenant,
    variantsSlug = 'variants',
    variantTypesSlug = 'variantTypes',
  } = props || {}

  const fields = [
    ...(inventory
      ? [
          inventoryField({
            overrides: {
              admin: {
                condition: ({ enableVariants }) => !enableVariants,
              },
            },
          }),
        ]
      : []),
    ...(enableVariants ? variantsFields({ multiTenant, variantsSlug, variantTypesSlug }) : []),
    ...(currenciesConfig ? [...pricesField({ currenciesConfig })] : []),
  ]

  const adminAccess = tenantAdminAccess({ isAdmin: access.isAdmin, multiTenant })

  const baseConfig: CollectionConfig = {
    slug: 'products',
    access: {
      create: access.isAdmin,
      delete: adminAccess,
      read: access.adminOrPublishedStatus,
      update: adminAccess,
    },
    admin: {
      defaultColumns: [
        ...(currenciesConfig ? ['prices'] : []),
        ...(enableVariants ? ['variants'] : []),
      ],
      group: 'Ecommerce',
    },
    fields,
    hooks: {
      beforeDelete: [deleteVariantsBeforeProductDelete({ variantsSlug })],
    },
    labels: {
      plural: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:products'),
      singular: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:product'),
    },
    trash: true,
    versions: {
      drafts: {
        autosave: true,
      },
    },
  }

  return baseConfig
}
