import type { Access } from 'payload';
type Props = {
    /**
     * Access function to check if user is admin.
     * This is used as a fallback check. Tenant-admin roles are checked separately.
     */
    isAdmin: Access;
    /**
     * Name of the array field containing user's tenant memberships.
     * @default 'tenants'
     */
    tenantsArrayFieldName?: string;
    /**
     * Name of the tenant field within the user's tenants array.
     * @default 'tenant'
     */
    tenantsArrayTenantFieldName?: string;
    /**
     * Name of the roles field within each tenant membership.
     * @default 'roles'
     */
    tenantsArrayRolesFieldName?: string;
    /**
     * Roles that grant super-admin access (bypass all tenant filtering).
     * @default ['super-admin']
     */
    superAdminRoles?: string[];
    /**
     * Roles in tenant membership that grant tenant-admin access.
     * @default ['tenant-admin']
     */
    tenantAdminRoles?: string[];
};
/**
 * Creates an access function that filters carts by tenant for admin users. Also the admin branch
 * of addresses, orders, transactions and variants.
 *
 * A plain `isAdmin` there is true for an admin of ANY tenant, which opens every tenant's documents
 * to them: all of them on a collection not registered with `@payloadcms/plugin-multi-tenant`
 * (transactions), and on a registered one (addresses, orders) those of every tenant they merely
 * belong to as a customer, since that plugin's constraint is membership, not role.
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
export declare const hasTenantAccess: ({ isAdmin, tenantsArrayFieldName, tenantsArrayTenantFieldName, tenantsArrayRolesFieldName, superAdminRoles, tenantAdminRoles, }: Props) => Access;
export {};
//# sourceMappingURL=cartTenantAccess.d.ts.map