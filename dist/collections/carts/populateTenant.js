import { APIError, parseCookies } from 'payload';
/**
 * Populates the tenant field from request cookies.
 * This handles both:
 * - Creating carts with tenant from the domain (frontend via payload-tenant-domain cookie)
 * - Admin panel operations (via payload-tenant cookie)
 *
 * The hook only runs on create operations and only if tenant is not already set.
 * Throws an error if no valid tenant can be determined - all carts must belong to a tenant.
 */ export const populateTenant = ({ tenantsSlug })=>async ({ data, operation, req })=>{
        // Only populate on create, and only if tenant not already set
        if (operation !== 'create' || data.tenant) {
            return data;
        }
        const cookies = parseCookies(req.headers);
        // Try to get tenant from payload-tenant cookie (admin panel / plugin standard)
        const tenantIdFromCookie = cookies.get('payload-tenant');
        if (tenantIdFromCookie) {
            // Parse tenant ID - could be string from cookie, convert to number for PostgreSQL
            const parsedTenantId = parseInt(tenantIdFromCookie, 10);
            if (!Number.isNaN(parsedTenantId)) {
                // Validate the tenant exists
                const tenantExists = await req.payload.count({
                    collection: tenantsSlug,
                    where: {
                        id: {
                            equals: parsedTenantId
                        }
                    }
                });
                if (tenantExists.totalDocs > 0) {
                    data.tenant = parsedTenantId;
                    return data;
                }
            }
        }
        // Try to get tenant from payload-tenant-domain cookie (frontend domain-based)
        const tenantDomain = cookies.get('payload-tenant-domain');
        if (tenantDomain) {
            const tenants = await req.payload.find({
                collection: tenantsSlug,
                where: {
                    domain: {
                        equals: tenantDomain
                    }
                },
                limit: 1
            });
            if (tenants.docs.length > 0) {
                data.tenant = tenants.docs[0].id;
                return data;
            }
        }
        // No valid tenant found - throw error
        // All carts must belong to a tenant for proper isolation
        throw new APIError('Cannot create cart without a valid tenant. Ensure payload-tenant or payload-tenant-domain cookie is set.', 400);
    };

//# sourceMappingURL=populateTenant.js.map