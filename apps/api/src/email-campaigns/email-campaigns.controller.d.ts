import { EmailCampaignsService } from './email-campaigns.service';
import { CreateEmailCampaignDto } from './dto/create-email-campaign.dto';
export declare class EmailCampaignsController {
    private readonly emailCampaignsService;
    constructor(emailCampaignsService: EmailCampaignsService);
    create(req: any, createEmailCampaignDto: CreateEmailCampaignDto, headerBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        subject: string;
        sentAt: Date | null;
        recipientCount: number;
        senderId: string;
    }>;
    findAll(req: any, headerBusinessId?: string): Promise<({
        sender: {
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        subject: string;
        sentAt: Date | null;
        recipientCount: number;
        senderId: string;
    })[]>;
    findOne(req: any, id: string, headerBusinessId?: string): Promise<({
        sender: {
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        subject: string;
        sentAt: Date | null;
        recipientCount: number;
        senderId: string;
    }) | null>;
    send(req: any, id: string, headerBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        subject: string;
        sentAt: Date | null;
        recipientCount: number;
        senderId: string;
    }>;
    remove(req: any, id: string, headerBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        subject: string;
        sentAt: Date | null;
        recipientCount: number;
        senderId: string;
    }>;
}
