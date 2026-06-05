import { PrismaService } from '../prisma.service';
import { UpsertComplianceDocumentDto } from './dto/upsert-compliance-document.dto';
export declare class ComplianceDocumentsService {
    private prisma;
    constructor(prisma: PrismaService);
    private getUserId;
    private resolveBusinessId;
    private assertBusinessAccess;
    list(user: any, headerBusinessId?: string, queryBusinessId?: string, q?: any): Promise<({
        ownerEmployee: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
        } | null;
    } & {
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
        title: string;
        fileUrl: string | null;
        createdByUserId: string | null;
        effectiveDate: Date | null;
        category: string;
        version: string | null;
        reviewDate: Date | null;
        acknowledgementRequired: boolean;
        ownerEmployeeId: string | null;
    })[]>;
    create(user: any, headerBusinessId: string | undefined, dto: UpsertComplianceDocumentDto, queryBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
        title: string;
        fileUrl: string | null;
        createdByUserId: string | null;
        effectiveDate: Date | null;
        category: string;
        version: string | null;
        reviewDate: Date | null;
        acknowledgementRequired: boolean;
        ownerEmployeeId: string | null;
    }>;
    update(user: any, headerBusinessId: string | undefined, id: string, dto: Partial<UpsertComplianceDocumentDto>, queryBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
        title: string;
        fileUrl: string | null;
        createdByUserId: string | null;
        effectiveDate: Date | null;
        category: string;
        version: string | null;
        reviewDate: Date | null;
        acknowledgementRequired: boolean;
        ownerEmployeeId: string | null;
    }>;
    delete(user: any, headerBusinessId: string | undefined, id: string, queryBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string | null;
        title: string;
        fileUrl: string | null;
        createdByUserId: string | null;
        effectiveDate: Date | null;
        category: string;
        version: string | null;
        reviewDate: Date | null;
        acknowledgementRequired: boolean;
        ownerEmployeeId: string | null;
    }>;
}
