import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
export declare class AnnouncementsService {
    private prisma;
    private auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    getBusinessId(user: any, businessIdHeader?: string): Promise<string>;
    create(dto: CreateAnnouncementDto, userId: string, businessId: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        priority: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        authorId: string;
    }>;
    update(id: string, dto: Partial<CreateAnnouncementDto>, userId: string, businessId: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        priority: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        authorId: string;
    }>;
    findAll(userId: string, businessId: string): Promise<{
        isRead: boolean;
        reads: {
            id: string;
            userId: string;
            readAt: Date;
            announcementId: string;
        }[];
        author: {
            firstName: string | null;
            lastName: string | null;
        };
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        priority: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        authorId: string;
    }[]>;
    markAsRead(announcementId: string, userId: string): Promise<{
        id: string;
        userId: string;
        readAt: Date;
        announcementId: string;
    } | {
        status: string;
    }>;
    remove(id: string, userId: string, businessId: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        priority: string;
        targetType: string;
        targetValue: string | null;
        scheduledAt: Date | null;
        authorId: string;
    }>;
}
