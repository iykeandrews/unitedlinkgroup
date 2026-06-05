import { PrismaService } from '../prisma.service';
import { Timesheet } from '@unitedlinkgroup/database';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
export declare class TimeTrackingService {
    private prisma;
    private notifications;
    private push;
    constructor(prisma: PrismaService, notifications: NotificationsService, push: PushService);
    private validateBusinessAccess;
    importTimesheets(fileBuffer: Buffer, businessId: string, user: any): Promise<any>;
    getEmployeeRecord(userId: string, businessId?: string, user?: any): Promise<string>;
    clockIn(employeeId: string, locationId: string | undefined, lat: number | undefined, lng: number | undefined, ip?: string, opts?: {
        bypassGeofence?: boolean;
    }): Promise<Timesheet>;
    private validateWithinClockLocation;
    private getClockLocationStatus;
    locationPing(employeeId: string, lat?: number, lng?: number): Promise<{
        ok: boolean;
        status: string;
        distanceMeters?: undefined;
        radiusMeters?: undefined;
    } | {
        ok: boolean;
        status: string;
        distanceMeters: number;
        radiusMeters: number;
    }>;
    private notifyLeavingSite;
    requireClockInShift(employeeId: string): Promise<{
        id: string;
        endTime: Date;
        startTime: Date;
        locationId: string | null;
    }>;
    adminClockIn(employeeId: string, locationId?: string, user?: any): Promise<any>;
    adminClockOut(employeeId: string, user?: any): Promise<any>;
    clockOut(employeeId: string, ip?: string, note?: string, lat?: number, lng?: number): Promise<Timesheet>;
    startBreak(employeeId: string, type?: string, lat?: number, lng?: number): Promise<any>;
    endBreak(employeeId: string, lat?: number, lng?: number): Promise<any>;
    getEmployeeStatus(employeeId: string, user?: any): Promise<{
        status: string;
        startTime: null;
        breakStartTime?: undefined;
    } | {
        status: string;
        startTime: Date;
        breakStartTime: Date;
    } | {
        status: string;
        startTime: Date;
        breakStartTime?: undefined;
    }>;
    getTimesheets(employeeId: string, start: Date, end: Date, user?: any): Promise<Timesheet[]>;
    updateTimesheet(id: string, data: any, user?: any): Promise<Timesheet>;
    deleteTimesheet(id: string, requestingEmployeeId?: string, user?: any): Promise<Timesheet>;
    restoreTimesheet(id: string, requestingEmployeeId?: string, user?: any): Promise<Timesheet>;
    getBusinessTimesheets(businessId: string, start: Date, end: Date, user?: any): Promise<Timesheet[]>;
    getBusinessId(userId: string): Promise<string>;
    private calculateDistance;
    handleAutoClockOut(): Promise<void>;
}
