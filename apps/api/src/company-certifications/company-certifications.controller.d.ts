import { CompanyCertificationsService } from './company-certifications.service';
import { UpsertCompanyCertificationDto } from './dto/upsert-company-certification.dto';
export declare class CompanyCertificationsController {
    private readonly service;
    constructor(service: CompanyCertificationsService);
    list(req: any, headerBusinessId?: string, queryBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        issuingOrganization: string | null;
        credentialId: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
        fileUrl: string | null;
        createdByUserId: string | null;
    }[]>;
    create(req: any, headerBusinessId: string | undefined, queryBusinessId: string | undefined, dto: UpsertCompanyCertificationDto): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        issuingOrganization: string | null;
        credentialId: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
        fileUrl: string | null;
        createdByUserId: string | null;
    }>;
    update(req: any, headerBusinessId: string | undefined, queryBusinessId: string | undefined, id: string, dto: Partial<UpsertCompanyCertificationDto>): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        issuingOrganization: string | null;
        credentialId: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
        fileUrl: string | null;
        createdByUserId: string | null;
    }>;
    delete(req: any, headerBusinessId: string | undefined, queryBusinessId: string | undefined, id: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        issuingOrganization: string | null;
        credentialId: string | null;
        issueDate: Date | null;
        expiryDate: Date | null;
        fileUrl: string | null;
        createdByUserId: string | null;
    }>;
}
