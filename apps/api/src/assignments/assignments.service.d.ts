import { PrismaService } from '../prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
export declare class AssignmentsService {
    private prisma;
    constructor(prisma: PrismaService);
    private resolveActorUserId;
    private getBusinessIdFromUser;
    private validateBusinessAccess;
    findAll(user: any, businessIdHeader?: string, query?: any): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        locationId: string | null;
        title: string;
        priority: string;
        description: string | null;
        createdByUserId: string | null;
        startAt: Date | null;
        dueAt: Date | null;
        completedAt: Date | null;
        assigneeId: string | null;
    })[]>;
    findOne(user: any, id: string): Promise<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        locationId: string | null;
        title: string;
        priority: string;
        description: string | null;
        createdByUserId: string | null;
        startAt: Date | null;
        dueAt: Date | null;
        completedAt: Date | null;
        assigneeId: string | null;
    }>;
    create(user: any, dto: CreateAssignmentDto, businessIdHeader?: string): Promise<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        locationId: string | null;
        title: string;
        priority: string;
        description: string | null;
        createdByUserId: string | null;
        startAt: Date | null;
        dueAt: Date | null;
        completedAt: Date | null;
        assigneeId: string | null;
    }>;
    update(user: any, id: string, dto: UpdateAssignmentDto): Promise<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        businessId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        locationId: string | null;
        title: string;
        priority: string;
        description: string | null;
        createdByUserId: string | null;
        startAt: Date | null;
        dueAt: Date | null;
        completedAt: Date | null;
        assigneeId: string | null;
    }>;
    remove(user: any, id: string): Promise<{
        ok: boolean;
    }>;
}
