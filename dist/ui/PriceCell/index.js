'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from '@payloadcms/ui';
import { formatPrice } from '../utilities.js';
export const PriceCell = (args)=>{
    const { i18n, t } = useTranslation();
    const { cellData, currenciesConfig, currency: currencyFromProps, rowData } = args;
    const currency = currencyFromProps || currenciesConfig.supportedCurrencies[0];
    if (!currency) {
        // @ts-expect-error - plugin translations are not typed yet
        return /*#__PURE__*/ _jsx("span", {
            children: t('plugin-ecommerce:currencyNotSet')
        });
    }
    if ((cellData == null || typeof cellData !== 'number') && 'enableVariants' in rowData && rowData.enableVariants) {
        // @ts-expect-error - plugin translations are not typed yet
        return /*#__PURE__*/ _jsx("span", {
            children: t('plugin-ecommerce:priceSetInVariants')
        });
    }
    if (cellData == null) {
        // @ts-expect-error - plugin translations are not typed yet
        return /*#__PURE__*/ _jsx("span", {
            children: t('plugin-ecommerce:priceNotSet')
        });
    }
    return /*#__PURE__*/ _jsx("span", {
        children: formatPrice({
            baseValue: cellData,
            currency,
            locale: i18n.language
        })
    });
};

//# sourceMappingURL=index.js.map