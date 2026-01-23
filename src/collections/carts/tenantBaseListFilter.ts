import type { PayloadRequest, Where } from 'payload'

import { parseCookies } from 'payload'

type BaseFilterArgs = {
  limit: number
  locale?: string | null
  page: number
  req: PayloadRequest
  sort: string
}

type Props = {
  /**
   * Name of the array field containing user's tenant memberships.
   * @default 'tenants'
   */
  tenantsArrayFieldName?: string
  /**
   * Name of the tenant field within the user's tenants array.
   * @default 'tenant'
   */
  tenantsArrayTenantFieldName?: string
  /**
   * Name of the roles field within each tenant membership.
   * @default 'roles'
   */
  tenantsArrayRolesFieldName?: string
  /**
   * Roles that grant super-admin access (bypass all tenant filtering).
   * @default ['super-admin']
   */
  superAdminRoles?: string[]
  /**
   * Roles in tenant membership that grant tenant-admin access.
   * @default ['tenant-admin']
   */
  tenantAdminRoles?: string[]
}

/**
 * Creates a baseListFilter function that filters carts by tenant in the admin list view.
 *
 * For admins:
 * - Super-admins see all carts
 * - Tenant-admins see carts from tenants where they have admin role
 *
 * For non-admins:
 * - Returns a filter that shows no results (they access carts via other means)
 */
export const tenantBaseListFilter = ({
  tenantsArrayFieldName = 'tenants',
  tenantsArrayTenantFieldName = 'tenant',
  tenantsArrayRolesFieldName = 'roles',
  superAdminRoles = ['super-admin'],
  tenantAdminRoles = ['tenant-admin'],
}: Props = {}) => {
  return ({ req }: BaseFilterArgs): Where => {
    const user = req.user as Record<string, unknown> | null

    // No user - no access
    if (!user) {
      return { id: { equals: -1 } }
    }

    // Check super-admin FIRST (before other checks)
    const roles = user.roles as string[] | undefined
    if (roles?.some((role) => superAdminRoles.includes(role))) {
      return {} // No filter - see all
    }

    // Get user's tenant memberships and check for tenant-admin roles
    const adminTenantIds: (string | number)[] = []
    const tenantsArray = user[tenantsArrayFieldName] as
      | Array<{ [key: string]: unknown }>
      | undefined

    if (Array.isArray(tenantsArray)) {
      for (const membership of tenantsArray) {
        const tenantValue = membership[tenantsArrayTenantFieldName]
        const membershipRoles = membership[tenantsArrayRolesFieldName] as string[] | undefined

        // Check if user has tenant-admin role in this membership
        const hasTenantAdminRole = membershipRoles?.some((role) => tenantAdminRoles.includes(role))

        if (tenantValue && hasTenantAdminRole) {
          const tenantId =
            typeof tenantValue === 'object' && tenantValue !== null && 'id' in tenantValue
              ? (tenantValue as { id: string | number }).id
              : tenantValue
          if (tenantId) {
            adminTenantIds.push(tenantId as string | number)
          }
        }
      }
    }

    // If user has tenant-admin role in any tenant, filter to those tenants
    if (adminTenantIds.length > 0) {
      // Check if there's a selected tenant in cookies (admin panel context)
      const cookies = parseCookies(req.headers)
      const selectedTenant = cookies.get('payload-tenant')

      // If admin has selected a specific tenant, filter to that tenant
      if (selectedTenant) {
        const selectedTenantId = Number(selectedTenant) || selectedTenant
        if (adminTenantIds.includes(selectedTenantId)) {
          return { tenant: { equals: selectedTenantId } }
        }
      }

      // Return filter for user's admin tenants
      return { tenant: { in: adminTenantIds } }
    }

    // Not a tenant admin - return filter that shows no results
    // (regular users access their carts via API, not admin list)
    return { id: { equals: -1 } }
  }
}
