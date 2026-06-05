import { PrismaService } from '../prisma.service';
export declare class ContractsService {
    private prisma;
    constructor(prisma: PrismaService);
    private getUserId;
    private resolveBusinessId;
    private assertBusinessAccess;
    list(user: any, headerBusinessId?: string, queryBusinessId?: string, q?: any): Promise<({
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
        } | null;
        client: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string | null;
        title: string;
        fileUrl: string | null;
        createdByUserId: string | null;
        counterpartyName: string | null;
        effectiveDate: Date | null;
        endDate: Date | null;
        clientId: string | null;
    })[]>;
    create(user: any, headerBusinessId: string | undefined, dto: any, queryBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string | null;
        title: string;
        fileUrl: string | null;
        createdByUserId: string | null;
        counterpartyName: string | null;
        effectiveDate: Date | null;
        endDate: Date | null;
        clientId: string | null;
    }>;
    update(user: any, headerBusinessId: string | undefined, id: string, dto: any, queryBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string | null;
        title: string;
        fileUrl: string | null;
        createdByUserId: string | null;
        counterpartyName: string | null;
        effectiveDate: Date | null;
        endDate: Date | null;
        clientId: string | null;
    }>;
    delete(user: any, headerBusinessId: string | undefined, id: string, queryBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string | null;
        title: string;
        fileUrl: string | null;
        createdByUserId: string | null;
        counterpartyName: string | null;
        effectiveDate: Date | null;
        endDate: Date | null;
        clientId: string | null;
    }>;
}
