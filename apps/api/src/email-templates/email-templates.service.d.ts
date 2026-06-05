import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
export declare class EmailTemplatesService {
    private prisma;
    private auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    create(dto: CreateEmailTemplateDto, userId: string, businessId: string): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    }>;
    findAll(businessId: string): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    }[]>;
    findOne(id: string, businessId: string): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    } | null>;
    update(id: string, dto: CreateEmailTemplateDto, userId: string, businessId: string): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    }>;
    remove(id: string, userId: string, businessId: string): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    }>;
}
