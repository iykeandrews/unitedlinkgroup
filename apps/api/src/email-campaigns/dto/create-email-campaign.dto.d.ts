declare class EmailAttachmentDto {
    filename: string;
    contentBase64: string;
    contentType: string;
}
export declare class CreateEmailCampaignDto {
    subject: string;
    content: string;
    attachments?: EmailAttachmentDto[];
    targetType: 'ALL' | 'DEPARTMENT' | 'ROLE' | 'SPECIFIC';
    targetValue?: string;
    scheduledAt?: Date;
    status?: 'DRAFT' | 'SCHEDULED' | 'SENT';
}
export {};
