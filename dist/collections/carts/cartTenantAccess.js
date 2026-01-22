import { parseCookies } from 'payload';
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
 * This is designed to be combined with other access functions using accessOR.
 */ export const hasTenantAccess = ({ isAdmin, tenantsArrayFieldName = 'tenants', tenantsArrayTenantFieldName = 'tenant', tenantsArrayRolesFieldName = 'roles', superAdminRoles = [
    'super-admin'
], tenantAdminRoles = [
    'tenant-admin'
] })=>{
    return async ({ req })=>{
        const { user } = req;
        // Only applies to authenticated users
        if (!user) {
            return false;
        }
        // Check super-admin FIRST (before other checks)
        // Super-admin: full access (returns true to bypass any Where constraints)
        const roles = user.roles;
        if (roles?.some((role)=>superAdminRoles.includes(role))) {
            return true;
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
        // If user has tenant-admin role in any tenant, grant access to those tenants
        if (adminTenantIds.length > 0) {
            // Check if there's a selected tenant in cookies (admin panel context)
            const cookies = parseCookies(req.headers);
            const selectedTenant = cookies.get('payload-tenant');
            // If admin has selected a specific tenant, filter to that tenant
            if (selectedTenant) {
                const selectedTenantId = Number(selectedTenant) || selectedTenant;
                if (adminTenantIds.includes(selectedTenantId)) {
                    return {
                        or: [
                            {
                                tenant: {
                                    equals: selectedTenantId
                                }
                            },
                            {
                                tenant: {
                                    exists: false
                                }
                            }
                        ]
                    };
                }
            }
            // Return Where clause filtering by user's admin tenants
            // Include carts with no tenant (orphaned/guest carts before tenant was set)
            return {
                or: [
                    {
                        tenant: {
                            in: adminTenantIds
                        }
                    },
                    {
                        tenant: {
                            exists: false
                        }
                    }
                ]
            };
        }
        // Fallback: check if user is global admin via the provided isAdmin function
        const adminResult = await isAdmin({
            req
        });
        if (adminResult) {
            // Global admin but no tenant memberships - get all tenants from their array
            const allTenantIds = [];
            if (Array.isArray(tenantsArray)) {
                for (const membership of tenantsArray){
                    const tenantValue = membership[tenantsArrayTenantFieldName];
                    if (tenantValue) {
                        const tenantId = typeof tenantValue === 'object' && tenantValue !== null && 'id' in tenantValue ? tenantValue.id : tenantValue;
                        if (tenantId) {
                            allTenantIds.push(tenantId);
                        }
                    }
                }
            }
            if (allTenantIds.length > 0) {
                return {
                    or: [
                        {
                            tenant: {
                                in: allTenantIds
                            }
                        },
                        {
                            tenant: {
                                exists: false
                            }
                        }
                    ]
                };
            }
            // Global admin with no tenant memberships - return true for full access
            return true;
        }
        // Not an admin of any kind
        return false;
    };
};

//# sourceMappingURL=cartTenantAccess.js.map