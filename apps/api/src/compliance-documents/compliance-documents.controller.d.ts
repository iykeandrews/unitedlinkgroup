import { ComplianceDocumentsService } from './compliance-documents.service';
import { UpsertComplianceDocumentDto } from './dto/upsert-compliance-document.dto';
export declare class ComplianceDocumentsController {
    private readonly service;
    constructor(service: ComplianceDocumentsService);
    list(req: any, headerBusinessId?: string, query?: any): Promise<({
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
    create(req: any, headerBusinessId: string | undefined, businessId: string | undefined, dto: UpsertComplianceDocumentDto): Promise<{
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
    update(req: any, headerBusinessId: string | undefined, businessId: string | undefined, id: string, dto: Partial<UpsertComplianceDocumentDto>): Promise<{
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
    delete(req: any, headerBusinessId: string | undefined, businessId: string | undefined, id: string): Promise<{
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
