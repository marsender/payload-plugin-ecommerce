'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRowLabel, useTranslation } from '@payloadcms/ui';
import { useMemo } from 'react';
import './index.css';
import { formatPrice } from '../utilities.js';
export const PriceRowLabel = (props)=>{
    const { currenciesConfig } = props;
    const { defaultCurrency, supportedCurrencies } = currenciesConfig;
    const { i18n } = useTranslation();
    const { data } = useRowLabel();
    const currency = useMemo(()=>{
        if (data.currency) {
            return supportedCurrencies.find((c)=>c.code === data.currency) ?? supportedCurrencies[0];
        }
        const fallbackCurrency = supportedCurrencies.find((c)=>c.code === defaultCurrency);
        if (fallbackCurrency) {
            return fallbackCurrency;
        }
        return supportedCurrencies[0];
    }, [
        data.currency,
        supportedCurrencies,
        defaultCurrency
    ]);
    const formattedPrice = useMemo(()=>{
        if (!currency) {
            return '0';
        }
        return formatPrice({
            baseValue: data.amount ?? 0,
            currency,
            locale: i18n.language
        });
    }, [
        currency,
        data.amount,
        i18n.language
    ]);
    return /*#__PURE__*/ _jsxs("div", {
        className: "priceRowLabel",
        children: [
            /*#__PURE__*/ _jsx("div", {
                className: "priceLabel",
                children: "Price:"
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "priceValue",
                children: [
                    /*#__PURE__*/ _jsx("span", {
                        children: formattedPrice
                    }),
                    /*#__PURE__*/ _jsxs("span", {
                        children: [
                            "(",
                            data.currency,
                            ")"
                        ]
                    })
                ]
            })
        ]
    });
};

//# sourceMappingURL=index.js.map