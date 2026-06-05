import { PrismaService } from '../prisma.service';
import { UpsertCompanyCertificationDto } from './dto/upsert-company-certification.dto';
export declare class CompanyCertificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    private getUserId;
    private resolveBusinessId;
    private assertBusinessAccess;
    list(user: any, headerBusinessId?: string, queryBusinessId?: string): Promise<{
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
    create(user: any, headerBusinessId: string | undefined, dto: UpsertCompanyCertificationDto, queryBusinessId?: string): Promise<{
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
    update(user: any, headerBusinessId: string | undefined, id: string, dto: Partial<UpsertCompanyCertificationDto>, queryBusinessId?: string): Promise<{
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
    delete(user: any, headerBusinessId: string | undefined, id: string, queryBusinessId?: string): Promise<{
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
