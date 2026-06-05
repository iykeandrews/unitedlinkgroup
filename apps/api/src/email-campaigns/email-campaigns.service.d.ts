import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEmailCampaignDto } from './dto/create-email-campaign.dto';
export declare class EmailCampaignsService {
    private prisma;
    private auditService;
    private notificationsService;
    constructor(prisma: PrismaService, auditService: AuditService, notificationsService: NotificationsService);
    private transporter;
    private verified;
    private getEnv;
    private getTransporter;
    private parseSpecificTarget;
    private uniqEmails;
    private toHtml;
    private htmlToText;
    private renderEmailShell;
    private resolveRecipients;
    private sendEmailToRecipients;
    create(dto: CreateEmailCampaignDto, userId: string, businessId: string): Promise<{
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
    findAll(businessId: string): Promise<({
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
    findOne(id: string, businessId: string): Promise<({
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
    send(id: string, userId: string, businessId: string): Promise<{
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
    remove(id: string, userId: string, businessId: string): Promise<{
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
