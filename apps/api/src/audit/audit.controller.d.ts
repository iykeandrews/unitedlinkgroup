import { AuditService } from './audit.service';
import { PrismaService } from '../prisma.service';
export declare class AuditController {
    private readonly auditService;
    private readonly prisma;
    constructor(auditService: AuditService, prisma: PrismaService);
    getLogs(req: any, businessId?: string, resource?: string, resourceId?: string, action?: string, limit?: string, headerBusinessId?: string): Promise<{
        id: string;
        action: string;
        resource: string;
        resourceId: string | null;
        at: Date;
        by: string;
        details: any;
    }[]>;
}
