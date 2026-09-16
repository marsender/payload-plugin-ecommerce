import type { CollectionConfig, Field } from 'payload';
import type { AccessConfig, CountryType, MultiTenantConfig } from '../../types/index.js';
type Props = {
    access: Pick<AccessConfig, 'isAdmin' | 'isAuthenticated' | 'isDocumentOwner'>;
    /**
     * Array of fields used for capturing the address data. Use this over overrides to customise the fields here as it's reused across the plugin.
     */
    addressFields: Field[];
    /**
     * Slug of the customers collection, defaults to 'users'.
     */
    customersSlug?: string;
    /**
     * Multi-tenant configuration. Addresses carry the `tenant` field added by
     * `@payloadcms/plugin-multi-tenant`; this scopes the customer picker to the same tenant.
     */
    multiTenant?: MultiTenantConfig;
    supportedCountries?: CountryType[];
};
export declare const createAddressesCollection: (props: Props) => CollectionConfig;
export {};
//# sourceMappingURL=createAddressesCollection.d.ts.map