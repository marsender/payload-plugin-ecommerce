import type { Config } from 'payload';
import type { EcommercePluginConfig } from './types/index.js';
import { createAddressesCollection } from './collections/addresses/createAddressesCollection.js';
import { createCartsCollection } from './collections/carts/createCartsCollection.js';
import { createOrdersCollection } from './collections/orders/createOrdersCollection.js';
import { createProductsCollection } from './collections/products/createProductsCollection.js';
import { createTransactionsCollection } from './collections/transactions/createTransactionsCollection.js';
import { createVariantOptionsCollection } from './collections/variants/createVariantOptionsCollection.js';
import { createVariantsCollection } from './collections/variants/createVariantsCollection/index.js';
import { createVariantTypesCollection } from './collections/variants/createVariantTypesCollection.js';
export declare const ecommercePlugin: (pluginConfig?: EcommercePluginConfig) => (incomingConfig: Config) => Promise<Config>;
export { createAddressesCollection, createCartsCollection, createOrdersCollection, createProductsCollection, createTransactionsCollection, createVariantOptionsCollection, createVariantsCollection, createVariantTypesCollection, };
export { EUR, GBP, USD } from './currencies/index.js';
export { amountField } from './fields/amountField.js';
export { currencyField } from './fields/currencyField.js';
export { pricesField } from './fields/pricesField.js';
export { statusField } from './fields/statusField.js';
export { variantsFields } from './fields/variantsFields.js';
//# sourceMappingURL=index.d.ts.map