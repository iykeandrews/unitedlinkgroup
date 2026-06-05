import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
export declare class AssignmentsController {
    private readonly assignmentsService;
    constructor(assignmentsService: AssignmentsService);
    findAll(req: any, businessId?: string, query?: any): Promise<({
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
    findOne(req: any, id: string): Promise<{
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
    create(req: any, dto: CreateAssignmentDto, businessId?: string): Promise<{
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
    update(req: any, id: string, dto: UpdateAssignmentDto): Promise<{
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
    remove(req: any, id: string): Promise<{
        ok: boolean;
    }>;
}
