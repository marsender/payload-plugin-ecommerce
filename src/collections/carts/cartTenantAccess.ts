import type { Access, Where } from 'payload'

import { parseCookies } from 'payload'

type Props = {
  /**
   * Access function to check if user is admin.
   */
  isAdmin: Access
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
   * Roles that grant super-admin access (bypass all tenant filtering).
   * @default ['super-admin']
   */
  superAdminRoles?: string[]
}

/**
 * Creates an access function that filters carts by tenant for admin users.
 *
 * For admins:
 * - Super-admins see all carts
 * - Tenant-admins see carts from their tenants OR carts without tenant
 *
 * For non-admins:
 * - Returns false (other access rules like isDocumentOwner or hasCartSecretAccess handle them)
 *
 * This is designed to be combined with other access functions using accessOR.
 */
export const hasTenantAccess = ({
  isAdmin,
  tenantsArrayFieldName = 'tenants',
  tenantsArrayTenantFieldName = 'tenant',
  superAdminRoles = ['super-admin'],
}: Props): Access => {
  return async ({ req }) => {
    const { user } = req

    // Only applies to authenticated users
    if (!user) {
      return false
    }

    // Check super-admin FIRST (before isAdmin check)
    // Super-admin: full access (returns true to bypass any Where constraints)
    const roles = user.roles as string[] | undefined
    if (roles?.some((role) => superAdminRoles.includes(role))) {
      return true
    }

    // Then check if user is admin via the provided isAdmin function
    const adminResult = await isAdmin({ req } as Parameters<Access>[0])
    if (!adminResult) {
      return false
    }

    // Get user's tenant IDs from their tenants array
    const userTenantIds: (string | number)[] = []
    const tenantsArray = user[tenantsArrayFieldName] as
      | Array<{ [key: string]: unknown }>
      | undefined

    if (Array.isArray(tenantsArray)) {
      for (const membership of tenantsArray) {
        const tenantValue = membership[tenantsArrayTenantFieldName]
        if (tenantValue) {
          const tenantId =
            typeof tenantValue === 'object' && tenantValue !== null && 'id' in tenantValue
              ? (tenantValue as { id: string | number }).id
              : tenantValue
          if (tenantId) {
            userTenantIds.push(tenantId as string | number)
          }
        }
      }
    }

    if (userTenantIds.length === 0) {
      return false
    }

    // Check if there's a selected tenant in cookies (admin panel context)
    const cookies = parseCookies(req.headers)
    const selectedTenant = cookies.get('payload-tenant')

    // If admin has selected a specific tenant, filter to that tenant
    if (selectedTenant) {
      const selectedTenantId = Number(selectedTenant) || selectedTenant
      if (userTenantIds.includes(selectedTenantId)) {
        return {
          or: [{ tenant: { equals: selectedTenantId } }, { tenant: { exists: false } }],
        } as Where
      }
    }

    // Return Where clause filtering by user's tenants
    // Include carts with no tenant (orphaned/guest carts before tenant was set)
    return {
      or: [{ tenant: { in: userTenantIds } }, { tenant: { exists: false } }],
    } as Where
  }
}
