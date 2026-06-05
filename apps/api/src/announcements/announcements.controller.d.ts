import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
export declare class AnnouncementsController {
    private readonly announcementsService;
    constructor(announcementsService: AnnouncementsService);
    create(req: any, businessIdHeader: string, createAnnouncementDto: CreateAnnouncementDto): Promise<{
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
    findAll(req: any, businessIdHeader: string): Promise<{
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
    update(req: any, businessIdHeader: string, id: string, updateAnnouncementDto: Partial<CreateAnnouncementDto>): Promise<{
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
    markAsRead(req: any, id: string): Promise<{
        id: string;
        userId: string;
        readAt: Date;
        announcementId: string;
    } | {
        status: string;
    }>;
    remove(req: any, businessIdHeader: string, id: string): Promise<{
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
