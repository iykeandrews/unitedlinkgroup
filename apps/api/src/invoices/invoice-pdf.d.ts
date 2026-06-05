type InvoicePdfArgs = {
    business: any;
    invoice: any;
    businessEmail?: string;
};
export declare function generateInvoicePdf({ business, invoice, businessEmail }: InvoicePdfArgs): Promise<Buffer>;
export {};
