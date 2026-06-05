import { PrismaService } from '../prisma.service';
import { CreatePatrolLogDto } from './dto/create-patrol-log.dto';
export declare class PatrolLogsService {
    private prisma;
    constructor(prisma: PrismaService);
    private validateBusinessAccess;
    create(userId: string, createPatrolLogDto: CreatePatrolLogDto, user?: any): Promise<{
        user: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            email: string;
            role: string;
            createdAt: Date;
            updatedAt: Date;
            password: string;
        };
        servicePin: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            endTime: string | null;
            startTime: string | null;
            locationId: string;
            geoLat: number | null;
            geoLng: number | null;
            days: string | null;
            count: number;
            positionType: string;
            shiftType: string;
            payRate: number | null;
            specialInstructions: string | null;
        };
    } & {
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        message: string;
        geoLat: number | null;
        geoLng: number | null;
        imageUrl: string | null;
        servicePinId: string;
    }>;
    findAllByPin(servicePinId: string, user?: any): Promise<({
        user: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            email: string;
        };
    } & {
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        message: string;
        geoLat: number | null;
        geoLng: number | null;
        imageUrl: string | null;
        servicePinId: string;
    })[]>;
    findAllByLocation(locationId: string, user?: any): Promise<({
        user: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            email: string;
        };
        servicePin: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            endTime: string | null;
            startTime: string | null;
            locationId: string;
            geoLat: number | null;
            geoLng: number | null;
            days: string | null;
            count: number;
            positionType: string;
            shiftType: string;
            payRate: number | null;
            specialInstructions: string | null;
        };
    } & {
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        message: string;
        geoLat: number | null;
        geoLng: number | null;
        imageUrl: string | null;
        servicePinId: string;
    })[]>;
    findAll(user?: any): Promise<({
        user: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            email: string;
        };
        servicePin: {
            location: {
                id: string;
                businessId: string;
                status: string;
                address: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                geoLat: number | null;
                geoLng: number | null;
                endDate: Date | null;
                clientId: string | null;
                startDate: Date | null;
                code: string | null;
                radius: number | null;
                workOrder: string | null;
                taxOverrideInfo: string | null;
            };
        } & {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            endTime: string | null;
            startTime: string | null;
            locationId: string;
            geoLat: number | null;
            geoLng: number | null;
            days: string | null;
            count: number;
            positionType: string;
            shiftType: string;
            payRate: number | null;
            specialInstructions: string | null;
        };
    } & {
        id: string;
        userId: string;
        type: string;
        createdAt: Date;
        message: string;
        geoLat: number | null;
        geoLng: number | null;
        imageUrl: string | null;
        servicePinId: string;
    })[]>;
}
