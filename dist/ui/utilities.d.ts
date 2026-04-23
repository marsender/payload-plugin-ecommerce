import type { Currency } from '../types/index.js';
/**
 * Convert display value with decimal point to base value (e.g., $25.00 to 2500)
 */
export declare const convertToBaseValue: ({ currency, displayValue, }: {
    currency: Currency;
    displayValue: string;
}) => number;
/**
 * Convert base value to display value with decimal point (e.g., 2500 to $25.00)
 */
export declare const convertFromBaseValue: ({ baseValue, currency, }: {
    baseValue: number;
    currency: Currency;
}) => string;
/**
 * Format a base value as a locale-aware currency string using the Intl API.
 *
 * @example formatPrice({ baseValue: 2500, currency: USD }) // "$25.00"
 * @example formatPrice({ baseValue: 2500, currency: EUR, locale: 'de' }) // "25,00 €"
 */
export declare const formatPrice: ({ baseValue, currency, locale, }: {
    baseValue: number;
    currency: Currency;
    locale?: string;
}) => string;
//# sourceMappingURL=utilities.d.ts.map