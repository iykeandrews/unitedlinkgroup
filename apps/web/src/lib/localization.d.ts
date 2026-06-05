export interface LocalizationConfig {
    currencyCode: string;
    currencySymbol: string;
    dateFormat: string;
    taxLabel: string;
    taxIdLabel: string;
    locale: string;
}
export declare function getCountryConfig(country: string | null | undefined): LocalizationConfig;
export declare function formatCurrency(amount: number, currencyCode?: string): string;
export declare function formatDate(date: Date | string, country?: string | undefined, options?: Intl.DateTimeFormatOptions): string;
export declare function formatDateLong(date: Date | string, country?: string | undefined): string;
