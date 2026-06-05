import { VendorsService } from './vendors.service';
export declare class VendorsController {
    private readonly vendorsService;
    constructor(vendorsService: VendorsService);
    getPublicBySlug(slug: string): Promise<{
        companyName: any;
        businessName: any;
        logoUrl: any;
        portalSlug: any;
        status: any;
        loginUrl: string;
    }>;
    list(req: any, businessId?: string): Promise<{
        business: {
            id: string;
            status: string;
            name: string;
        };
        vendors: any;
    }>;
    create(req: any, body: any, businessId?: string): Promise<any>;
    update(req: any, id: string, body: any, businessId?: string): Promise<any>;
    activate(req: any, id: string, businessId?: string): Promise<any>;
    deactivate(req: any, id: string, businessId?: string): Promise<any>;
    getMyProfile(req: any): Promise<{
        id: any;
        companyName: any;
        contactFirstName: any;
        contactLastName: any;
        email: any;
        phone: any;
        website: any;
        serviceCategory: any;
        portalSlug: any;
        status: any;
        notes: any;
        agreementStartDate: any;
        agreementEndDate: any;
        accessReports: any;
        accessContracts: any;
        accessCompliance: any;
        accessAnnouncements: any;
        accessIncidentReports: boolean;
        accessTimeTracking: boolean;
        portalUrl: string;
        business: any;
        user: any;
    }>;
    getMyPortal(req: any): Promise<{
        vendor: {
            id: any;
            companyName: any;
            contactFirstName: any;
            contactLastName: any;
            email: any;
            phone: any;
            website: any;
            serviceCategory: any;
            portalSlug: any;
            status: any;
            notes: any;
            agreementStartDate: any;
            agreementEndDate: any;
            permissions: {
                accessReports: boolean;
                accessContracts: boolean;
                accessCompliance: boolean;
                accessAnnouncements: boolean;
                accessIncidentReports: boolean;
                accessTimeTracking: boolean;
            };
        };
        business: {
            id: string;
            status: string;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            name: string;
            logoUrl: string | null;
            mobile: string | null;
            currencyCode: string | null;
            businessType: string | null;
            industry: string | null;
        } | null;
        reports: {
            summary: {
                activeClients: number;
                activeLocations: number;
                invoicesTracked: number;
                recentPayments: number;
                totalInvoiced: number;
                outstandingInvoices: number;
                paymentsReceived: number;
                currencyCode: string;
            };
            recentInvoices: {
                id: any;
                invoiceNumber: any;
                clientName: any;
                total: any;
                status: any;
                dueDate: any;
                createdAt: any;
            }[];
            recentPayments: {
                id: any;
                amount: any;
                paymentDate: any;
                method: any;
                reference: any;
                notes: any;
            }[];
        } | null;
        contracts: any[];
        complianceDocuments: any[];
        announcements: any[];
        incidentReports: {
            id: any;
            reportNumber: any;
            title: any;
            type: any;
            severity: any;
            status: any;
            date: any;
            locationName: any;
            reportingOfficerName: string | null;
            assignedSupervisorName: string | null;
        }[];
        timeTracking: {
            id: any;
            employeeName: string;
            startTime: any;
            endTime: any;
            status: any;
            locationName: any;
            clockInIp: any;
            clockOutIp: any;
        }[];
    }>;
}
