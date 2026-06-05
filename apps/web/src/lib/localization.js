"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountryConfig = getCountryConfig;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateLong = formatDateLong;
const country_currency_map_1 = require("./country-currency-map");
const COUNTRY_CONFIGS = {
    'United States': { currencyCode: 'USD', currencySymbol: '$', dateFormat: 'MM/DD/YYYY', taxLabel: 'Sales Tax', taxIdLabel: 'EIN', locale: 'en-US' },
    'United Kingdom': { currencyCode: 'GBP', currencySymbol: '£', dateFormat: 'DD/MM/YYYY', taxLabel: 'VAT', taxIdLabel: 'VAT Number', locale: 'en-GB' },
    'Canada': { currencyCode: 'CAD', currencySymbol: '$', dateFormat: 'YYYY-MM-DD', taxLabel: 'GST/HST', taxIdLabel: 'BN', locale: 'en-CA' },
    'Australia': { currencyCode: 'AUD', currencySymbol: '$', dateFormat: 'DD/MM/YYYY', taxLabel: 'GST', taxIdLabel: 'ABN', locale: 'en-AU' },
    'New Zealand': { currencyCode: 'NZD', currencySymbol: '$', dateFormat: 'DD/MM/YYYY', taxLabel: 'GST', taxIdLabel: 'NZBN', locale: 'en-NZ' },
    'Ireland': { currencyCode: 'EUR', currencySymbol: '€', dateFormat: 'DD/MM/YYYY', taxLabel: 'VAT', taxIdLabel: 'VAT No', locale: 'en-IE' },
    'South Africa': { currencyCode: 'ZAR', currencySymbol: 'R', dateFormat: 'YYYY/MM/DD', taxLabel: 'VAT', taxIdLabel: 'VAT No', locale: 'en-ZA' },
    'Ghana': { currencyCode: 'GHS', currencySymbol: '₵', dateFormat: 'DD/MM/YYYY', taxLabel: 'VAT', taxIdLabel: 'TIN', locale: 'en-GH' },
    'Nigeria': { currencyCode: 'NGN', currencySymbol: '₦', dateFormat: 'DD/MM/YYYY', taxLabel: 'VAT', taxIdLabel: 'TIN', locale: 'en-NG' },
    'Kenya': { currencyCode: 'KES', currencySymbol: 'KSh', dateFormat: 'DD/MM/YYYY', taxLabel: 'VAT', taxIdLabel: 'PIN', locale: 'sw-KE' },
    'India': { currencyCode: 'INR', currencySymbol: '₹', dateFormat: 'DD/MM/YYYY', taxLabel: 'GST', taxIdLabel: 'GSTIN', locale: 'en-IN' },
};
const DEFAULT_CONFIG = {
    currencyCode: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    taxLabel: 'Tax',
    taxIdLabel: 'Tax ID',
    locale: 'en-US'
};
function getCountryConfig(country) {
    if (!country)
        return DEFAULT_CONFIG;
    // 1. Try specific country config first (for rich details like Tax Labels)
    if (COUNTRY_CONFIGS[country]) {
        return COUNTRY_CONFIGS[country];
    }
    // 2. Fallback to generic config with correct currency from map
    const currencyCode = country_currency_map_1.countryCurrencyMap[country] || 'USD';
    let currencySymbol = DEFAULT_CONFIG.currencySymbol;
    try {
        const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
        const symbolPart = parts.find(p => p.type === 'currency');
        if (symbolPart)
            currencySymbol = symbolPart.value;
    }
    catch (e) {
        // fallback
    }
    return {
        ...DEFAULT_CONFIG,
        currencyCode: currencyCode,
        currencySymbol: currencySymbol,
        // Keep default tax/date formats unless we have specific info
    };
}
function formatCurrency(amount, currencyCode = 'USD') {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
        }).format(amount);
    }
    catch (e) {
        return `${currencyCode} ${amount.toFixed(2)}`;
    }
}
function formatDate(date, country = 'United States', options) {
    const d = new Date(date);
    const config = getCountryConfig(country);
    // Prefer locale-based formatting
    if (config.locale) {
        return d.toLocaleDateString(config.locale, options);
    }
    // Fallback manual formatting (ignore options for now if manual)
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    if (config.dateFormat === 'DD/MM/YYYY')
        return `${day}/${month}/${year}`;
    if (config.dateFormat === 'YYYY-MM-DD')
        return `${year}-${month}-${day}`;
    if (config.dateFormat === 'YYYY/MM/DD')
        return `${year}/${month}/${day}`;
    return `${month}/${day}/${year}`;
}
function formatDateLong(date, country = 'United States') {
    const d = new Date(date);
    const config = getCountryConfig(country);
    return d.toLocaleDateString(config.locale || 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}
