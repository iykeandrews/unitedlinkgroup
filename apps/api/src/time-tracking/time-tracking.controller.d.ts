import { Request } from 'express';
import { TimeTrackingService } from './time-tracking.service';
export declare class TimeTrackingController {
    private readonly timeTrackingService;
    constructor(timeTrackingService: TimeTrackingService);
    importTimesheets(file: any, body: {
        businessId: string;
    }, user: any): Promise<any>;
    clockIn(body: {
        businessId?: string;
        locationId?: string;
        lat?: number;
        lng?: number;
    }, user: any, ip: string, req: Request): Promise<{
        id: string;
        status: string;
        workerType: string;
        createdAt: Date;
        updatedAt: Date;
        endTime: Date | null;
        startTime: Date;
        clockInIp: string | null;
        clockOutIp: string | null;
        clockInLat: number | null;
        clockInLng: number | null;
        clockOutLat: number | null;
        clockOutLng: number | null;
        employeeNote: string | null;
        employeeId: string;
        locationId: string | null;
    }>;
    clockOut(body: {
        businessId?: string;
        note?: string;
        lat?: number;
        lng?: number;
    }, user: any, ip: string, req: Request): Promise<{
        id: string;
        status: string;
        workerType: string;
        createdAt: Date;
        updatedAt: Date;
        endTime: Date | null;
        startTime: Date;
        clockInIp: string | null;
        clockOutIp: string | null;
        clockInLat: number | null;
        clockInLng: number | null;
        clockOutLat: number | null;
        clockOutLng: number | null;
        employeeNote: string | null;
        employeeId: string;
        locationId: string | null;
    }>;
    adminClockIn(body: {
        employeeId: string;
        locationId?: string;
    }, user: any): Promise<any>;
    adminClockOut(body: {
        employeeId: string;
    }, user: any): Promise<any>;
    getEmployeeStatusForAdmin(employeeId: string, user: any): Promise<{
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
    startBreak(body: {
        businessId?: string;
        type?: string;
        lat?: number;
        lng?: number;
    }, user: any): Promise<any>;
    endBreak(body: {
        businessId?: string;
        lat?: number;
        lng?: number;
    }, user: any): Promise<any>;
    locationPing(body: {
        businessId?: string;
        lat?: number;
        lng?: number;
    }, user: any): Promise<{
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
    getStatus(user: any, businessId?: string): Promise<{
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
    getTimesheets(queryEmployeeId: string, start: string, end: string, user: any, headerBusinessId?: string): Promise<{
        id: string;
        status: string;
        workerType: string;
        createdAt: Date;
        updatedAt: Date;
        endTime: Date | null;
        startTime: Date;
        clockInIp: string | null;
        clockOutIp: string | null;
        clockInLat: number | null;
        clockInLng: number | null;
        clockOutLat: number | null;
        clockOutLng: number | null;
        employeeNote: string | null;
        employeeId: string;
        locationId: string | null;
    }[]>;
    updateTimesheet(id: string, body: any, user: any): Promise<{
        id: string;
        status: string;
        workerType: string;
        createdAt: Date;
        updatedAt: Date;
        endTime: Date | null;
        startTime: Date;
        clockInIp: string | null;
        clockOutIp: string | null;
        clockInLat: number | null;
        clockInLng: number | null;
        clockOutLat: number | null;
        clockOutLng: number | null;
        employeeNote: string | null;
        employeeId: string;
        locationId: string | null;
    }>;
    deleteTimesheet(id: string, user: any): Promise<{
        id: string;
        status: string;
        workerType: string;
        createdAt: Date;
        updatedAt: Date;
        endTime: Date | null;
        startTime: Date;
        clockInIp: string | null;
        clockOutIp: string | null;
        clockInLat: number | null;
        clockInLng: number | null;
        clockOutLat: number | null;
        clockOutLng: number | null;
        employeeNote: string | null;
        employeeId: string;
        locationId: string | null;
    }>;
    restoreTimesheet(id: string, user: any): Promise<{
        id: string;
        status: string;
        workerType: string;
        createdAt: Date;
        updatedAt: Date;
        endTime: Date | null;
        startTime: Date;
        clockInIp: string | null;
        clockOutIp: string | null;
        clockInLat: number | null;
        clockInLng: number | null;
        clockOutLat: number | null;
        clockOutLng: number | null;
        employeeNote: string | null;
        employeeId: string;
        locationId: string | null;
    }>;
}
