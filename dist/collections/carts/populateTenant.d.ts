import type { CollectionBeforeChangeHook } from 'payload';
type Props = {
    tenantsSlug: string;
};
/**
 * Populates the tenant field from request cookies.
 * This handles both:
 * - Creating carts with tenant from the domain (frontend via payload-tenant-domain cookie)
 * - Admin panel operations (via payload-tenant cookie)
 *
 * The hook only runs on create operations and only if tenant is not already set.
 * Throws an error if no valid tenant can be determined - all carts must belong to a tenant.
 */
export declare const populateTenant: (props: Props) => CollectionBeforeChangeHook;
export {};
//# sourceMappingURL=populateTenant.d.ts.map