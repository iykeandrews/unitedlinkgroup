type SendEmailArgs = {
    to: string;
    cc?: string | string[];
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
    }>;
};
export declare class SmtpMailerService {
    private transporter;
    private verified;
    private getTransporter;
    send(args: SendEmailArgs): Promise<any>;
}
export {};
