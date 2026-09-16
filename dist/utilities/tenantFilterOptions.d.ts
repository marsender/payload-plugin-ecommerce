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
 * Unlike {@link tenantScopedFilterOptions} it carries two escapes, because `filterOptions` is
 * enforced on SAVE as well as in the picker and a customer is not a document of the tenant:
 *
 *  - **a write with no user at all** — a webhook, a job, a seed — is left unfiltered. Trusted
 *    server code routinely records a transaction for somebody who is not enrolled in the tenant it
 *    belongs to: a platform-plan invoice order names its subscriber, a payment webhook records the
 *    order of a buyer returning to a second tenant. There is no picker to scope in that case, and
 *    the leak this guards is a request somebody made.
 *  - **a user naming THEMSELVES** is always allowed, whatever the tenant. A returning buyer is not
 *    enrolled in a second tenant until they transact with it, and a user who may act on every
 *    tenant belongs to none at all — so the tenant clause could never match their own account, and
 *    their own cart, order or address would fail validation.
 *
 * Neither escape widens the picker, and that distinction is the point: stepping aside outright for
 * a user who may act on every tenant, as this did before, offered every tenant's accounts as the
 * customer of a hand-created order. An escape has to cover the write without widening what the
 * panel lists.
 *
 * A relationship to a tenant-scoped collection has no equivalent case: those documents always
 * carry a tenant of their own.
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