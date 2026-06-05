import { PrismaService } from '../prisma.service';
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    logAction(data: {
        businessId: string;
        userId: string;
        action: string;
        resource: string;
        resourceId?: string;
        details?: any;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    getLogs(params: {
        businessId?: string;
        resource?: string;
        resourceId?: string;
        action?: string;
        limit?: number;
    }): Promise<{
        id: string;
        action: string;
        resource: string;
        resourceId: string | null;
        at: Date;
        by: string;
        details: any;
    }[]>;
}
