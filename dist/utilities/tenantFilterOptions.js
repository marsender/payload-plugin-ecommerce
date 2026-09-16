import { parseCookies } from 'payload';
/**
 * Cookie written by `@payloadcms/plugin-multi-tenant` holding the tenant the admin panel
 * currently has selected.
 */ const TENANT_COOKIE = 'payload-tenant';
const toID = (value)=>{
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        return value === '' ? null : value;
    }
    if (value && typeof value === 'object' && 'id' in value) {
        return toID(value.id);
    }
    return null;
};
const readTenantCookie = (req)=>{
    const raw = parseCookies(req.headers).get(TENANT_COOKIE);
    if (!raw) {
        return null;
    }
    const asNumber = Number(raw);
    return Number.isNaN(asNumber) ? raw : asNumber;
};
const readUserTenantIDs = (req, multiTenant)=>{
    const arrayFieldName = multiTenant.customersTenantsArrayFieldName ?? 'tenants';
    const arrayTenantFieldName = multiTenant.customersTenantsArrayTenantFieldName ?? 'tenant';
    const memberships = req.user?.[arrayFieldName];
    if (!Array.isArray(memberships)) {
        return [];
    }
    return memberships.map((membership)=>toID(membership?.[arrayTenantFieldName])).filter((id)=>id !== null);
};
/**
 * Resolves the tenants a relationship picker must be scoped to, mirroring the resolution the
 * multi-tenant plugin applies to the collections it owns:
 *
 * 1. the tenant of the document being edited — authoritative once it is known;
 * 2. the tenant the admin panel has selected (`payload-tenant` cookie);
 * 3. nothing, for a user who may act on every tenant — the picker stays unscoped;
 * 4. the tenants the user belongs to, which is what the panel shows them anyway.
 *
 * `null` means "do not filter". It is returned only when no tenant can be established at all
 * (an anonymous or programmatic write, typically), so the filter can never turn a working write
 * into a validation failure — `filterOptions` is enforced on save as well as in the picker.
 */ export const resolveFilterTenantIDs = (args, multiTenant, tenantFieldName = 'tenant')=>{
    const { data, req } = args;
    const fromDoc = toID(data?.[tenantFieldName]);
    if (fromDoc !== null) {
        return [
            fromDoc
        ];
    }
    const fromCookie = readTenantCookie(req);
    if (fromCookie !== null) {
        return [
            fromCookie
        ];
    }
    if (multiTenant.userHasAccessToAllTenants?.(req.user)) {
        return null;
    }
    const userTenantIDs = readUserTenantIDs(req, multiTenant);
    return userTenantIDs.length > 0 ? userTenantIDs : null;
};
/**
 * `filterOptions` for a relationship pointing at a collection that carries a `tenant` field.
 *
 * Needed because `@payloadcms/plugin-multi-tenant` only adds its own filter to relationships
 * whose target is registered with it — the plugin's own carts, transactions and variant
 * collections are not, so their pickers listed every studio's documents.
 *
 * Returns `undefined` when multi-tenancy is off, so the field is left exactly as it was.
 */ export const tenantScopedFilterOptions = (multiTenant, tenantFieldName = 'tenant')=>{
    if (!multiTenant?.enabled) {
        return undefined;
    }
    return (args)=>{
        const tenantIDs = resolveFilterTenantIDs(args, multiTenant, tenantFieldName);
        if (!tenantIDs) {
            return true;
        }
        return {
            [tenantFieldName]: {
                in: tenantIDs
            }
        };
    };
};
/**
 * `filterOptions` for a relationship pointing at the customers collection.
 *
 * Customers are global — one account, globally unique email, enrolled in several tenants through
 * an array field — so they are never registered with the multi-tenant plugin and the filter has
 * to reach into that array instead of a `tenant` field.
 *
 * Unlike {@link tenantScopedFilterOptions} this one steps aside for a user who may act on every
 * tenant. `filterOptions` is enforced on save, not only in the picker, and such a user typically
 * belongs to no tenant at all — so the filter could never match them in either direction, and
 * would turn their own legitimate writes (buying from a studio, hand-fixing a record naming
 * themselves) into validation errors. A relationship to a tenant-scoped collection has no
 * equivalent case: those documents always carry a tenant of their own.
 */ export const customerTenantFilterOptions = (multiTenant, tenantFieldName = 'tenant')=>{
    if (!multiTenant?.enabled) {
        return undefined;
    }
    const arrayFieldName = multiTenant.customersTenantsArrayFieldName ?? 'tenants';
    const arrayTenantFieldName = multiTenant.customersTenantsArrayTenantFieldName ?? 'tenant';
    return (args)=>{
        if (multiTenant.userHasAccessToAllTenants?.(args.req.user)) {
            return true;
        }
        const tenantIDs = resolveFilterTenantIDs(args, multiTenant, tenantFieldName);
        if (!tenantIDs) {
            return true;
        }
        return {
            [`${arrayFieldName}.${arrayTenantFieldName}`]: {
                in: tenantIDs
            }
        };
    };
};
/**
 * Spreads a `filterOptions` key onto a field only when one was produced, so a single-tenant host
 * keeps fields with no `filterOptions` at all rather than one that always returns `true`.
 */ export const withFilterOptions = (filterOptions)=>filterOptions ? {
        filterOptions
    } : {};

//# sourceMappingURL=tenantFilterOptions.js.map