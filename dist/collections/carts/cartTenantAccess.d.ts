import type { Access } from 'payload';
type Props = {
    /**
     * Access function to check if user is admin.
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
     * Roles that grant super-admin access (bypass all tenant filtering).
     * @default ['super-admin']
     */
    superAdminRoles?: string[];
};
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
export declare const hasTenantAccess: ({ isAdmin, tenantsArrayFieldName, tenantsArrayTenantFieldName, superAdminRoles, }: Props) => Access;
export {};
//# sourceMappingURL=cartTenantAccess.d.ts.map