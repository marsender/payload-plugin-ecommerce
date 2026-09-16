import type { FilterOptions, FilterOptionsProps } from 'payload';
import type { MultiTenantConfig } from '../types/index.js';
/** Narrows a relationship value — an id, or a populated document — to its id. */
export declare const toID: (value: unknown) => null | number | string;
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
 */
export declare const resolveFilterTenantIDs: (args: Pick<FilterOptionsProps, "data" | "req">, multiTenant: MultiTenantConfig, tenantFieldName?: string) => (number | string)[] | null;
/**
 * `filterOptions` for a relationship pointing at a collection that carries a `tenant` field.
 *
 * Needed because `@payloadcms/plugin-multi-tenant` only adds its own filter to relationships
 * whose target is registered with it — the plugin's own carts, transactions and variant
 * collections are not, so their pickers listed every studio's documents.
 *
 * Returns `undefined` when multi-tenancy is off, so the field is left exactly as it was.
 */
export declare const tenantScopedFilterOptions: (multiTenant?: MultiTenantConfig, tenantFieldName?: string) => FilterOptions | undefined;
/**
 * `filterOptions` for a relationship pointing at the customers collection.
 *
 * Customers are global — one account, globally unique email, enrolled in several tenants through
 * an array field — so they are never registered with the multi-tenant plugin and the filter has
 * to reach into that array instead of a `tenant` field.
 *
 * Unlike {@link tenantScopedFilterOptions} this one lets a user who may act on every tenant name
 * THEMSELVES, whatever the tenant in force. `filterOptions` is enforced on save, not only in the
 * picker, and such a user typically belongs to no tenant at all — so the tenant clause could never
 * match their own account, and their legitimate writes (buying from a tenant's shop, hand-fixing a
 * record naming themselves) would fail validation. A relationship to a tenant-scoped collection
 * has no equivalent case: those documents always carry a tenant of their own.
 *
 * Only their own account: stepping aside outright, as this did before, also unscoped the PICKER,
 * so an order created by hand with a tenant selected offered every tenant's accounts as its
 * customer. The escape has to cover the write without widening what the panel lists.
 */
export declare const customerTenantFilterOptions: (multiTenant?: MultiTenantConfig, tenantFieldName?: string) => FilterOptions | undefined;
/**
 * Spreads a `filterOptions` key onto a field only when one was produced, so a single-tenant host
 * keeps fields with no `filterOptions` at all rather than one that always returns `true`.
 */
export declare const withFilterOptions: (filterOptions: FilterOptions | undefined) => {
    filterOptions?: FilterOptions;
};
//# sourceMappingURL=tenantFilterOptions.d.ts.map