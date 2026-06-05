import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  private resolveActorUserId(user: any) {
    return user?.userId || user?.sub || user?.id;
  }

  private async getBusinessIdFromUser(userId: string): Promise<string> {
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) return ownedBusiness.id;
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) return employee.businessId;
    throw new BadRequestException('User is not associated with a business');
  }

  private async validateBusinessAccess(targetBusinessId: string, user: any) {
    const business = await this.prisma.business.findUnique({ where: { id: targetBusinessId } });
    if (!business) throw new BadRequestException('Business not found');

    if (user.role === 'SUPER_ADMIN') return;

    const actorUserId = this.resolveActorUserId(user);
    if (!actorUserId) throw new BadRequestException('Invalid user');

    if (business.ownerId === actorUserId) return;

    const employee = await this.prisma.employee.findFirst({ where: { userId: actorUserId, businessId: targetBusinessId } });
    if (!employee) throw new BadRequestException('Access denied');
  }

  async findAll(user: any, businessIdHeader?: string, query?: any) {
    const actorUserId = this.resolveActorUserId(user);
    const businessId = businessIdHeader || (actorUserId ? await this.getBusinessIdFromUser(actorUserId) : null);
    if (!businessId) throw new BadRequestException('Business context required');

    await this.validateBusinessAccess(businessId, user);

    const where: any = { businessId };
    if (query?.status) where.status = String(query.status).toUpperCase();
    if (query?.priority) where.priority = String(query.priority).toUpperCase();
    if (query?.locationId) where.locationId = String(query.locationId);
    if (query?.assigneeId) where.assigneeId = String(query.assigneeId);
    if (query?.q) {
      const q = String(query.q);
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.operationAssignment.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignee: true,
        location: { include: { client: true } } as any,
        createdBy: true,
      } as any,
    });
  }

  async findOne(user: any, id: string) {
    const item = await this.prisma.operationAssignment.findUnique({
      where: { id },
      include: {
        assignee: true,
        location: { include: { client: true } } as any,
        createdBy: true,
      } as any,
    });
    if (!item) throw new NotFoundException('Assignment not found');
    await this.validateBusinessAccess(item.businessId, user);
    return item;
  }

  async create(user: any, dto: CreateAssignmentDto, businessIdHeader?: string) {
    const actorUserId = this.resolveActorUserId(user);
    const businessId = dto.businessId || businessIdHeader || (actorUserId ? await this.getBusinessIdFromUser(actorUserId) : null);
    if (!businessId) throw new BadRequestException('Business context required');
    await this.validateBusinessAccess(businessId, user);

    const status = dto.status ? String(dto.status).toUpperCase() : 'OPEN';
    const priority = dto.priority ? String(dto.priority).toUpperCase() : 'MEDIUM';

    const created = await this.prisma.operationAssignment.create({
      data: {
        businessId,
        title: dto.title,
        description: dto.description ?? null,
        status,
        priority,
        locationId: dto.locationId ?? null,
        assigneeId: dto.assigneeId ?? null,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        createdByUserId: actorUserId || null,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      } as any,
    });
    return this.findOne(user, created.id);
  }

  async update(user: any, id: string, dto: UpdateAssignmentDto) {
    const existing = await this.prisma.operationAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.validateBusinessAccess(existing.businessId, user);

    const nextStatus = dto.status ? String(dto.status).toUpperCase() : undefined;
    const nextPriority = dto.priority ? String(dto.priority).toUpperCase() : undefined;

    const updated = await this.prisma.operationAssignment.update({
      where: { id },
      data: {
        ...(typeof dto.title !== 'undefined' ? { title: dto.title } : {}),
        ...(typeof dto.description !== 'undefined' ? { description: dto.description ?? null } : {}),
        ...(typeof nextStatus !== 'undefined' ? { status: nextStatus } : {}),
        ...(typeof nextPriority !== 'undefined' ? { priority: nextPriority } : {}),
        ...(typeof dto.locationId !== 'undefined' ? { locationId: dto.locationId ?? null } : {}),
        ...(typeof dto.assigneeId !== 'undefined' ? { assigneeId: dto.assigneeId ?? null } : {}),
        ...(typeof dto.startAt !== 'undefined' ? { startAt: dto.startAt ? new Date(dto.startAt) : null } : {}),
        ...(typeof dto.dueAt !== 'undefined' ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
        ...(nextStatus === 'COMPLETED' ? { completedAt: new Date() } : nextStatus ? { completedAt: null } : {}),
      } as any,
    });
    return this.findOne(user, updated.id);
  }

  async remove(user: any, id: string) {
    const existing = await this.prisma.operationAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.validateBusinessAccess(existing.businessId, user);
    await this.prisma.operationAssignment.delete({ where: { id } });
    return { ok: true };
  }
}

