import type { Access, BaseListFilter } from 'payload';
import type { MultiTenantConfig } from '../types/index.js';
/**
 * The admin branch of a tenant-scoped collection's read, update and delete: the host's
 * `multiTenant.tenantAdminAccess`, else {@link hasTenantAccess}. Without multi-tenancy, `isAdmin`.
 *
 * Never `isAdmin` alone when multi-tenancy is on: a host typically answers it true for an admin
 * of ANY tenant, which opens every tenant's documents to them.
 */
export declare const tenantAdminAccess: ({ isAdmin, multiTenant, }: {
    isAdmin: Access;
    multiTenant?: MultiTenantConfig;
}) => Access;
/** The list-view filter: the host's `multiTenant.baseListFilter`, else `tenantBaseListFilter()`. */
export declare const tenantListFilter: (multiTenant: MultiTenantConfig) => BaseListFilter;
//# sourceMappingURL=tenantAdminAccess.d.ts.map