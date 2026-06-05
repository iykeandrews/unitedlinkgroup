import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
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
