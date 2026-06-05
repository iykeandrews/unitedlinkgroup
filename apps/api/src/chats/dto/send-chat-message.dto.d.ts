declare class ChatAttachmentDto {
    type: string;
    url: string;
    filename?: string;
    originalName?: string;
    mimeType?: string;
    size?: number;
}
export declare class SendChatMessageDto {
    text?: string;
    replyToId?: string;
    attachments?: ChatAttachmentDto[];
}
export {};
