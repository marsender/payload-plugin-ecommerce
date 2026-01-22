import type { Access, Where } from 'payload'

import { parseCookies } from 'payload'

type Props = {
  /**
   * Access function to check if user is admin.
   * This is used as a fallback check. Tenant-admin roles are checked separately.
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
 * Creates an access function that filters carts by tenant for admin users.
 *
 * For admins:
 * - Super-admins see all carts
 * - Global admins see all carts for their tenants
 * - Tenant-admins see carts from tenants where they have admin role
 *
 * For non-admins:
 * - Returns false (other access rules like isDocumentOwner or hasCartSecretAccess handle them)
 *
 * Note: All carts must have a tenant (enforced by populateTenant hook).
 * This is designed to be combined with other access functions using accessOR.
 */
export const hasTenantAccess = ({
  isAdmin,
  tenantsArrayFieldName = 'tenants',
  tenantsArrayTenantFieldName = 'tenant',
  tenantsArrayRolesFieldName = 'roles',
  superAdminRoles = ['super-admin'],
  tenantAdminRoles = ['tenant-admin'],
}: Props): Access => {
  return async ({ req }) => {
    const { user } = req

    // Only applies to authenticated users
    if (!user) {
      return false
    }

    // Check super-admin FIRST (before other checks)
    // Super-admin: full access (returns true to bypass any Where constraints)
    const roles = user.roles as string[] | undefined
    if (roles?.some((role) => superAdminRoles.includes(role))) {
      return true
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

    // If user has tenant-admin role in any tenant, grant access to those tenants
    if (adminTenantIds.length > 0) {
      // Check if there's a selected tenant in cookies (admin panel context)
      const cookies = parseCookies(req.headers)
      const selectedTenant = cookies.get('payload-tenant')

      // If admin has selected a specific tenant, filter to that tenant
      if (selectedTenant) {
        const selectedTenantId = Number(selectedTenant) || selectedTenant
        if (adminTenantIds.includes(selectedTenantId)) {
          return {
            tenant: { equals: selectedTenantId },
          } as Where
        }
      }

      // Return Where clause filtering by user's admin tenants
      return {
        tenant: { in: adminTenantIds },
      } as Where
    }

    // Fallback: check if user is global admin via the provided isAdmin function
    const adminResult = await isAdmin({ req } as Parameters<Access>[0])
    if (adminResult) {
      // Global admin but no tenant memberships - get all tenants from their array
      const allTenantIds: (string | number)[] = []
      if (Array.isArray(tenantsArray)) {
        for (const membership of tenantsArray) {
          const tenantValue = membership[tenantsArrayTenantFieldName]
          if (tenantValue) {
            const tenantId =
              typeof tenantValue === 'object' && tenantValue !== null && 'id' in tenantValue
                ? (tenantValue as { id: string | number }).id
                : tenantValue
            if (tenantId) {
              allTenantIds.push(tenantId as string | number)
            }
          }
        }
      }

      if (allTenantIds.length > 0) {
        return {
          tenant: { in: allTenantIds },
        } as Where
      }

      // Global admin with no tenant memberships - return true for full access
      return true
    }

    // Not an admin of any kind
    return false
  }
}
