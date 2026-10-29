import type { CollectionConfig, Field } from 'payload'

import type { AccessConfig, MultiTenantConfig } from '../../types/index.js'

import { populateTenant } from '../../utilities/populateTenant.js'
import {
  tenantScopedFilterOptions,
  withFilterOptions,
} from '../../utilities/tenantFilterOptions.js'
import { tenantAdminAccess, tenantListFilter } from '../../utilities/tenantAdminAccess.js'

type Props = {
  access: Pick<AccessConfig, 'isAdmin' | 'publicAccess'>
  /**
   * Multi-tenant configuration for variant options.
   * When enabled, variant options will have a tenant field, access will be scoped by tenant for
   * admins, and the variant type picker is scoped to the same tenant.
   */
  multiTenant?: MultiTenantConfig
  /**
   * Slug of the variant types collection, defaults to 'variantTypes'.
   */
  variantTypesSlug?: string
}

export const createVariantOptionsCollection: (props: Props) => CollectionConfig = (props) => {
  const { access, multiTenant, variantTypesSlug = 'variantTypes' } = props || {}

  const tenantsSlug = multiTenant?.tenantsSlug || 'tenants'

  const fields: Field[] = [
    // Tenant field (only added when multiTenant is enabled)
    ...(multiTenant?.enabled
      ? [
          {
            name: 'tenant',
            type: 'relationship',
            admin: {
              position: 'sidebar',
              readOnly: true,
            },
            index: true,
            label: ({ t }: { t: (key: string) => string }) =>
              t('plugin-ecommerce:tenant') || 'Tenant',
            relationTo: tenantsSlug,
            required: false,
          } as Field,
        ]
      : []),
    {
      name: 'variantType',
      type: 'relationship',
      admin: {
        readOnly: true,
      },
      ...withFilterOptions(tenantScopedFilterOptions(multiTenant)),
      relationTo: variantTypesSlug,
      required: true,
    },
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'value',
      type: 'text',
      admin: {
        description: 'should be defaulted or dynamic based on label',
      },
      required: true,
    },
  ]

  const adminAccess = tenantAdminAccess({ isAdmin: access.isAdmin, multiTenant })

  const baseConfig: CollectionConfig = {
    slug: 'variantOptions',
    access: {
      create: adminAccess,
      delete: adminAccess,
      read: access.publicAccess,
      update: adminAccess,
    },
    admin: {
      group: false,
      useAsTitle: 'label',
      ...(multiTenant?.enabled && {
        baseListFilter: tenantListFilter(multiTenant),
      }),
    },
    fields,
    hooks: {
      ...(multiTenant?.enabled && {
        beforeChange: [populateTenant({ tenantsSlug })],
      }),
    },
    labels: {
      plural: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:variantOptions'),
      singular: ({ t }) =>
        // @ts-expect-error - translations are not typed in plugins yet
        t('plugin-ecommerce:variantOption'),
    },
    trash: true,
  }

  return { ...baseConfig }
}
