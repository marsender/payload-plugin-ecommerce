import { parseCookies } from 'payload';
/**
 * Creates a baseListFilter function that filters carts by tenant in the admin list view.
 *
 * For admins:
 * - Super-admins see all carts
 * - Tenant-admins see carts from tenants where they have admin role
 *
 * For non-admins:
 * - Returns a filter that shows no results (they access carts via other means)
 */ export const tenantBaseListFilter = ({ tenantsArrayFieldName = 'tenants', tenantsArrayTenantFieldName = 'tenant', tenantsArrayRolesFieldName = 'roles', superAdminRoles = [
    'super-admin'
], tenantAdminRoles = [
    'tenant-admin'
] } = {})=>{
    return ({ req })=>{
        const user = req.user;
        // No user - no access
        if (!user) {
            return {
                id: {
                    equals: -1
                }
            };
        }
        // Check for selected tenant in cookies (admin panel context)
        const cookies = parseCookies(req.headers);
        const selectedTenant = cookies.get('payload-tenant');
        const selectedTenantId = selectedTenant ? Number(selectedTenant) || selectedTenant : null;
        // Check super-admin FIRST (before other checks)
        const roles = user.roles;
        if (roles?.some((role)=>superAdminRoles.includes(role))) {
            // Super-admins: filter by selected tenant if one is chosen
            if (selectedTenantId) {
                return {
                    tenant: {
                        equals: selectedTenantId
                    }
                };
            }
            return {} // No tenant selected - see all
            ;
        }
        // Get user's tenant memberships and check for tenant-admin roles
        const adminTenantIds = [];
        const tenantsArray = user[tenantsArrayFieldName];
        if (Array.isArray(tenantsArray)) {
            for (const membership of tenantsArray){
                const tenantValue = membership[tenantsArrayTenantFieldName];
                const membershipRoles = membership[tenantsArrayRolesFieldName];
                // Check if user has tenant-admin role in this membership
                const hasTenantAdminRole = membershipRoles?.some((role)=>tenantAdminRoles.includes(role));
                if (tenantValue && hasTenantAdminRole) {
                    const tenantId = typeof tenantValue === 'object' && tenantValue !== null && 'id' in tenantValue ? tenantValue.id : tenantValue;
                    if (tenantId) {
                        adminTenantIds.push(tenantId);
                    }
                }
            }
        }
        // If user has tenant-admin role in any tenant, filter to those tenants
        if (adminTenantIds.length > 0) {
            // If admin has selected a specific tenant they have access to, filter to that tenant
            if (selectedTenantId && adminTenantIds.includes(selectedTenantId)) {
                return {
                    tenant: {
                        equals: selectedTenantId
                    }
                };
            }
            // Return filter for user's admin tenants
            return {
                tenant: {
                    in: adminTenantIds
                }
            };
        }
        // Not a tenant admin - return filter that shows no results
        // (regular users access their carts via API, not admin list)
        return {
            id: {
                equals: -1
            }
        };
    };
};

//# sourceMappingURL=tenantBaseListFilter.js.map