import { PrismaService } from './prisma.service';
export declare class AppService {
    private prisma;
    constructor(prisma: PrismaService);
    getHello(): string;
    getBusinesses(): Promise<{
        id: string;
        status: string;
        address: string | null;
        city: string | null;
        state: string | null;
        zip: string | null;
        country: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        logoUrl: string | null;
        ein: string | null;
        mobile: string | null;
        currencyCode: string | null;
        governmentInfo: string | null;
        businessType: string | null;
        industry: string | null;
        employeeCount: string | null;
        modules: string | null;
        settings: string | null;
        ownerId: string;
    }[]>;
}
