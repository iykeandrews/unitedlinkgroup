import { ContractsService } from './contracts.service';
export declare class ContractsController {
    private readonly service;
    constructor(service: ContractsService);
    list(req: any, headerBusinessId?: string, query?: any): Promise<({
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
    create(req: any, headerBusinessId: string | undefined, businessId: string | undefined, dto: any): Promise<{
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
    update(req: any, headerBusinessId: string | undefined, businessId: string | undefined, id: string, dto: any): Promise<{
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
    delete(req: any, headerBusinessId: string | undefined, businessId: string | undefined, id: string): Promise<{
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
