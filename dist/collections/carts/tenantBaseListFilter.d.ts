import type { PayloadRequest, Where } from 'payload';
type BaseFilterArgs = {
    limit: number;
    locale?: string | null;
    page: number;
    req: PayloadRequest;
    sort: string;
};
type Props = {
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
 * Creates a baseListFilter function that filters carts by tenant in the admin list view.
 *
 * For admins:
 * - Super-admins see all carts
 * - Tenant-admins see carts from tenants where they have admin role
 *
 * For non-admins:
 * - Returns a filter that shows no results (they access carts via other means)
 */
export declare const tenantBaseListFilter: ({ tenantsArrayFieldName, tenantsArrayTenantFieldName, tenantsArrayRolesFieldName, superAdminRoles, tenantAdminRoles, }?: Props) => ({ req }: BaseFilterArgs) => Where;
export {};
//# sourceMappingURL=tenantBaseListFilter.d.ts.map