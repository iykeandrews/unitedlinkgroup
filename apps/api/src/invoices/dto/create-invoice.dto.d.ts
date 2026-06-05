import { CreateInvoiceItemDto } from './create-invoice-item.dto';
export declare class CreateInvoiceDto {
    clientId: string;
    issueDate: string;
    dueDate: string;
    items: CreateInvoiceItemDto[];
    locationId?: string;
    invoiceNumber?: string;
    status?: string;
    notes?: string;
}
