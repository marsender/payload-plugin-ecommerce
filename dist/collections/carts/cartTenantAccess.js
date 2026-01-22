import { parseCookies } from 'payload';
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
 */ export const hasTenantAccess = ({ isAdmin, tenantsArrayFieldName = 'tenants', tenantsArrayTenantFieldName = 'tenant', superAdminRoles = [
    'super-admin'
] })=>{
    return async ({ req })=>{
        const { user } = req;
        // Only applies to authenticated users
        if (!user) {
            return false;
        }
        // First check if user is admin at all
        const adminResult = await isAdmin({
            req
        });
        if (!adminResult) {
            return false;
        }
        // Super-admin: full access (returns true to bypass any Where constraints)
        const roles = user.roles;
        if (roles?.some((role)=>superAdminRoles.includes(role))) {
            return true;
        }
        // Get user's tenant IDs from their tenants array
        const userTenantIds = [];
        const tenantsArray = user[tenantsArrayFieldName];
        if (Array.isArray(tenantsArray)) {
            for (const membership of tenantsArray){
                const tenantValue = membership[tenantsArrayTenantFieldName];
                if (tenantValue) {
                    const tenantId = typeof tenantValue === 'object' && tenantValue !== null && 'id' in tenantValue ? tenantValue.id : tenantValue;
                    if (tenantId) {
                        userTenantIds.push(tenantId);
                    }
                }
            }
        }
        if (userTenantIds.length === 0) {
            return false;
        }
        // Check if there's a selected tenant in cookies (admin panel context)
        const cookies = parseCookies(req.headers);
        const selectedTenant = cookies.get('payload-tenant');
        // If admin has selected a specific tenant, filter to that tenant
        if (selectedTenant) {
            const selectedTenantId = Number(selectedTenant) || selectedTenant;
            if (userTenantIds.includes(selectedTenantId)) {
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
        // Return Where clause filtering by user's tenants
        // Include carts with no tenant (orphaned/guest carts before tenant was set)
        return {
            or: [
                {
                    tenant: {
                        in: userTenantIds
                    }
                },
                {
                    tenant: {
                        exists: false
                    }
                }
            ]
        };
    };
};

//# sourceMappingURL=cartTenantAccess.js.map