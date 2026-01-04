import type { CollectionConfig } from 'payload';
import type { AccessConfig, CurrenciesConfig } from '../../types/index.js';
type Props = {
    access: Pick<Required<AccessConfig>, 'isAdmin' | 'isAuthenticated' | 'isDocumentOwner'>;
    /**
     * Allow guest (unauthenticated) users to create carts.
     * Defaults to false.
     */
    allowGuestCarts?: boolean;
    currenciesConfig?: CurrenciesConfig;
    /**
     * Slug of the customers collection, defaults to 'users'.
     */
    customersSlug?: string;
    /**
     * Enables support for variants in the cart.
     * Defaults to false.
     */
    enableVariants?: boolean;
    /**
     * Slug of the products collection, defaults to 'products'.
     */
    productsSlug?: string;
    /**
     * Slug of the variants collection, defaults to 'variants'.
     */
    variantsSlug?: string;
};
export declare const createCartsCollection: (props: Props) => CollectionConfig;
export {};
//# sourceMappingURL=createCartsCollection.d.ts.map