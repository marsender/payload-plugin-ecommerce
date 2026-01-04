import type { CollectionSlugMap, SanitizedEcommercePluginConfig } from '../types/index.js';
type Props = {
    sanitizedPluginConfig: SanitizedEcommercePluginConfig;
};
/**
 * Generates a map of collection slugs based on the sanitized plugin configuration.
 * Takes into consideration any collection overrides provided in the plugin.
 */
export declare const getCollectionSlugMap: ({ sanitizedPluginConfig }: Props) => CollectionSlugMap;
export {};
//# sourceMappingURL=getCollectionSlugMap.d.ts.map