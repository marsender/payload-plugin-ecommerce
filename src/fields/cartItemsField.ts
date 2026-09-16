import type { ArrayField, Field } from 'payload'

import type { CurrenciesConfig, MultiTenantConfig } from '../types/index.js'

import { tenantScopedFilterOptions, withFilterOptions } from '../utilities/tenantFilterOptions.js'
import { amountField } from './amountField.js'
import { currencyField } from './currencyField.js'

type Props = {
  /**
   * Include this in order to enable support for currencies per item in the cart.
   */
  currenciesConfig?: CurrenciesConfig
  enableVariants?: boolean
  /**
   * Enables individual prices for each item in the cart.
   * Defaults to false.
   */
  individualPrices?: boolean
  /**
   * Multi-tenant configuration. Scopes the product and variant pickers on each line to the
   * tenant of the cart, order or transaction the line belongs to.
   */
  multiTenant?: MultiTenantConfig
  overrides?: Partial<ArrayField>
  /**
   * Slug of the products collection, defaults to 'products'.
   */
  productsSlug?: string
  /**
   * Slug of the variants collection, defaults to 'variants'.
   */
  variantsSlug?: string
}

export const cartItemsField: (props?: Props) => ArrayField = (props) => {
  const {
    currenciesConfig,
    enableVariants = false,
    individualPrices,
    multiTenant,
    overrides,
    productsSlug = 'products',
    variantsSlug = 'variants',
  } = props || {}

  const field: ArrayField = {
    name: 'items',
    type: 'array',
    admin: {
      initCollapsed: true,
    },
    fields: [
      {
        name: 'product',
        type: 'relationship',
        ...withFilterOptions(tenantScopedFilterOptions(multiTenant)),
        label: ({ t }) =>
          // @ts-expect-error - translations are not typed in plugins yet
          t('plugin-ecommerce:product'),
        relationTo: productsSlug,
      },
      ...(enableVariants
        ? [
            {
              name: 'variant',
              type: 'relationship',
              ...withFilterOptions(tenantScopedFilterOptions(multiTenant)),
              label: ({ t }) =>
                // @ts-expect-error - translations are not typed in plugins yet
                t('plugin-ecommerce:variant'),
              relationTo: variantsSlug,
            } as Field,
          ]
        : []),
      {
        name: 'quantity',
        type: 'number',
        defaultValue: 1,
        label: ({ t }) =>
          // @ts-expect-error - translations are not typed in plugins yet
          t('plugin-ecommerce:quantity'),
        min: 1,
        required: true,
      },
      ...(currenciesConfig && individualPrices ? [amountField({ currenciesConfig })] : []),
      ...(currenciesConfig ? [currencyField({ currenciesConfig })] : []),
    ],
    label: ({ t }) =>
      // @ts-expect-error - translations are not typed in plugins yet
      t('plugin-ecommerce:cart'),
    ...overrides,
  }

  return field
}
