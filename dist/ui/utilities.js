/**
 * Convert display value with decimal point to base value (e.g., $25.00 to 2500)
 */ export const convertToBaseValue = ({ currency, displayValue })=>{
    if (!currency) {
        return parseFloat(displayValue);
    }
    // Remove currency symbol and any non-numeric characters except decimal
    const cleanValue = displayValue.replace(currency.symbol, '').replace(/[^0-9.]/g, '');
    // Parse the clean value to a float
    const floatValue = parseFloat(cleanValue || '0');
    // Convert to the base value (e.g., cents for USD)
    return Math.round(floatValue * Math.pow(10, currency.decimals));
};
/**
 * Convert base value to display value with decimal point (e.g., 2500 to $25.00)
 */ export const convertFromBaseValue = ({ baseValue, currency })=>{
    if (!currency) {
        return baseValue.toString();
    }
    // Convert from base value (e.g., cents) to decimal value (e.g., dollars)
    const decimalValue = baseValue / Math.pow(10, currency.decimals);
    // Format with the correct number of decimal places
    return decimalValue.toFixed(currency.decimals);
};
/**
 * Format a base value as a locale-aware currency string using the Intl API.
 *
 * @example formatPrice({ baseValue: 2500, currency: USD }) // "$25.00"
 * @example formatPrice({ baseValue: 2500, currency: EUR, locale: 'de' }) // "25,00 €"
 */ export const formatPrice = ({ baseValue, currency, locale = 'en' })=>{
    return new Intl.NumberFormat(locale, {
        currency: currency.code,
        currencyDisplay: currency.symbolDisplay ?? 'symbol',
        maximumFractionDigits: currency.decimals,
        minimumFractionDigits: currency.decimals,
        style: 'currency'
    }).format(baseValue / Math.pow(10, currency.decimals));
};

//# sourceMappingURL=utilities.js.map