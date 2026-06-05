
import { countryCurrencyMap } from './country-currency-map';

export interface LocalizationConfig {
  currencyCode: string;
  currencySymbol: string;
  dateFormat: string;
  taxLabel: string;
  taxIdLabel: string;
  locale: string;
}

const COUNTRY_CONFIGS: Record<string, LocalizationConfig> = {
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

const DEFAULT_CONFIG: LocalizationConfig = {
  currencyCode: 'USD',
  currencySymbol: '$',
  dateFormat: 'MM/DD/YYYY',
  taxLabel: 'Tax',
  taxIdLabel: 'Tax ID',
  locale: 'en-US'
};

export function getCountryConfig(country: string | null | undefined): LocalizationConfig {
  if (!country) return DEFAULT_CONFIG;
  
  // 1. Try specific country config first (for rich details like Tax Labels)
  if (COUNTRY_CONFIGS[country]) {
      return COUNTRY_CONFIGS[country];
  }

  // 2. Fallback to generic config with correct currency from map
  const currencyCode = countryCurrencyMap[country] || 'USD';
  
  let currencySymbol = DEFAULT_CONFIG.currencySymbol;
  try {
     const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
     const symbolPart = parts.find(p => p.type === 'currency');
     if (symbolPart) currencySymbol = symbolPart.value;
  } catch (e) {
      // fallback
  }
  
  return {
      ...DEFAULT_CONFIG,
      currencyCode: currencyCode,
      currencySymbol: currencySymbol,
      // Keep default tax/date formats unless we have specific info
  };
}

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (e) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function formatDate(date: Date | string, country: string | undefined = 'United States', options?: Intl.DateTimeFormatOptions): string {
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

    if (config.dateFormat === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
    if (config.dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
    if (config.dateFormat === 'YYYY/MM/DD') return `${year}/${month}/${day}`;
    return `${month}/${day}/${year}`;
}

export function formatDateLong(date: Date | string, country: string | undefined = 'United States'): string {
    const d = new Date(date);
    const config = getCountryConfig(country);
    
    return d.toLocaleDateString(config.locale || 'en-US', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });
}
