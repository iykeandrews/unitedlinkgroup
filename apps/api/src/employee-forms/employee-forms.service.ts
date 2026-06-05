import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
import { CreateEmployeeFormTemplateDto } from './dto/create-employee-form-template.dto';
import { UpdateEmployeeFormTemplateDto } from './dto/update-employee-form-template.dto';
import { AssignEmployeeFormTemplateDto } from './dto/assign-employee-form-template.dto';
import { SubmitEmployeeFormAssignmentDto } from './dto/submit-employee-form-assignment.dto';

@Injectable()
export class EmployeeFormsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private push: PushService,
  ) {}

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
    if (employee) return;
    throw new BadRequestException('Access denied');
  }

  private async resolveBusinessId(user: any, businessId?: string) {
    if (businessId) return businessId;
    const actorUserId = this.resolveActorUserId(user);
    if (!actorUserId) throw new BadRequestException('Business context required');
    return this.getBusinessIdFromUser(actorUserId);
  }

  async listTemplates(user: any, businessIdHeader?: string, query?: any) {
    const businessId = await this.resolveBusinessId(user, businessIdHeader || query?.businessId);
    await this.validateBusinessAccess(businessId, user);
    const where: any = { businessId };
    if (query?.type) where.type = String(query.type).toUpperCase();
    if (query?.status) where.status = String(query.status).toUpperCase();
    if (query?.q) {
      const q = String(query.q);
      where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
    }
    return this.prisma.employeeFormTemplate.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async createTemplate(user: any, dto: CreateEmployeeFormTemplateDto, businessIdHeader?: string) {
    const businessId = await this.resolveBusinessId(user, dto.businessId || businessIdHeader);
    await this.validateBusinessAccess(businessId, user);
    const actorUserId = this.resolveActorUserId(user);

    const created = await this.prisma.employeeFormTemplate.create({
      data: {
        businessId,
        type: dto.type ? String(dto.type).toUpperCase() : 'EMPLOYMENT_FORM',
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ? String(dto.status).toUpperCase() : 'ACTIVE',
        version: dto.version ?? null,
        body: dto.body ?? null,
        fields: dto.fields ?? null,
        fileUrl: dto.fileUrl ?? null,
        acknowledgementRequired: !!dto.acknowledgementRequired,
        requiresSignature: true,
        createdByUserId: actorUserId || null,
      } as any,
    });
    return created;
  }

  async updateTemplate(user: any, id: string, dto: UpdateEmployeeFormTemplateDto) {
    const existing = await this.prisma.employeeFormTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    await this.validateBusinessAccess(existing.businessId, user);

    return this.prisma.employeeFormTemplate.update({
      where: { id },
      data: {
        ...(typeof dto.type !== 'undefined' ? { type: String(dto.type).toUpperCase() } : {}),
        ...(typeof dto.title !== 'undefined' ? { title: dto.title } : {}),
        ...(typeof dto.description !== 'undefined' ? { description: dto.description ?? null } : {}),
        ...(typeof dto.status !== 'undefined' ? { status: String(dto.status).toUpperCase() } : {}),
        ...(typeof dto.version !== 'undefined' ? { version: dto.version ?? null } : {}),
        ...(typeof dto.body !== 'undefined' ? { body: dto.body ?? null } : {}),
        ...(typeof dto.fields !== 'undefined' ? { fields: dto.fields ?? null } : {}),
        ...(typeof dto.fileUrl !== 'undefined' ? { fileUrl: dto.fileUrl ?? null } : {}),
        ...(typeof dto.acknowledgementRequired !== 'undefined' ? { acknowledgementRequired: !!dto.acknowledgementRequired } : {}),
        requiresSignature: true,
      } as any,
    });
  }

  async archiveTemplate(user: any, id: string) {
    const existing = await this.prisma.employeeFormTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    await this.validateBusinessAccess(existing.businessId, user);
    return this.prisma.employeeFormTemplate.update({ where: { id }, data: { status: 'ARCHIVED' } as any });
  }

  async assignTemplate(user: any, templateId: string, dto: AssignEmployeeFormTemplateDto, businessIdHeader?: string) {
    const template = await this.prisma.employeeFormTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Template not found');

    const businessId = await this.resolveBusinessId(user, businessIdHeader || template.businessId);
    await this.validateBusinessAccess(businessId, user);
    if (template.businessId !== businessId) throw new BadRequestException('Template does not belong to this business');

    const assignAll = String(dto.assignAll || '').toLowerCase() === 'true';
    let employeeIds: string[] = [];
    if (assignAll) {
      const all = await this.prisma.employee.findMany({ where: { businessId, status: 'ACTIVE' } as any, select: { id: true } });
      employeeIds = all.map(e => e.id);
    } else if (Array.isArray(dto.employeeIds)) {
      employeeIds = dto.employeeIds.map(String);
    }
    employeeIds = Array.from(new Set(employeeIds)).filter(Boolean);
    if (employeeIds.length === 0) throw new BadRequestException('No employees selected');

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    const results = await Promise.allSettled(
      employeeIds.map(employeeId =>
        this.prisma.employeeFormAssignment.upsert({
          where: { templateId_employeeId: { templateId, employeeId } },
          update: {
            status: 'PENDING',
            dueAt,
            submittedAt: null,
            values: null,
            signatureName: null,
            signedAt: null,
          } as any,
          create: {
            businessId,
            templateId,
            employeeId,
            status: 'PENDING',
            dueAt,
          } as any,
        })
      )
    );

    const assigned = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - assigned;
    return { assigned, failed };
  }

  async listAssignmentsAdmin(user: any, businessIdHeader?: string, query?: any) {
    const businessId = await this.resolveBusinessId(user, businessIdHeader || query?.businessId);
    await this.validateBusinessAccess(businessId, user);
    const where: any = { businessId };
    if (query?.templateId) where.templateId = String(query.templateId);
    if (query?.status) where.status = String(query.status).toUpperCase();
    if (query?.employeeId) where.employeeId = String(query.employeeId);
    return this.prisma.employeeFormAssignment.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      include: { employee: true, template: true } as any,
    });
  }

  async listMyAssignments(user: any, query?: any) {
    const actorUserId = this.resolveActorUserId(user);
    if (!actorUserId) throw new BadRequestException('Invalid user');
    const employee = await this.prisma.employee.findFirst({ where: { userId: actorUserId } });
    if (!employee) throw new BadRequestException('No employee profile found');

    const where: any = { employeeId: employee.id };
    if (query?.status) where.status = String(query.status).toUpperCase();
    return this.prisma.employeeFormAssignment.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { assignedAt: 'desc' }],
      include: { template: true } as any,
    });
  }

  async getMyAssignment(user: any, id: string) {
    const actorUserId = this.resolveActorUserId(user);
    if (!actorUserId) throw new BadRequestException('Invalid user');
    const employee = await this.prisma.employee.findFirst({ where: { userId: actorUserId } });
    if (!employee) throw new BadRequestException('No employee profile found');
    const item = await this.prisma.employeeFormAssignment.findUnique({
      where: { id },
      include: { template: true, business: true, employee: true } as any,
    });
    if (!item) throw new NotFoundException('Assignment not found');
    if (item.employeeId !== employee.id) throw new BadRequestException('Access denied');
    return item;
  }

  async submitMyAssignment(user: any, id: string, dto: SubmitEmployeeFormAssignmentDto) {
    const actorUserId = this.resolveActorUserId(user);
    if (!actorUserId) throw new BadRequestException('Invalid user');
    const employee = await this.prisma.employee.findFirst({ where: { userId: actorUserId } });
    if (!employee) throw new BadRequestException('No employee profile found');

    const assignment = await this.prisma.employeeFormAssignment.findUnique({
      where: { id },
      include: { template: true, business: true } as any,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.employeeId !== employee.id) throw new BadRequestException('Access denied');
    if (assignment.status === 'SUBMITTED') throw new BadRequestException('Form already submitted');
    if (!dto.signatureName?.trim()) throw new BadRequestException('Signature name is required');
    const sig = typeof (dto as any).signatureData === 'string' ? (dto as any).signatureData.trim() : '';
    if (!sig) throw new BadRequestException('Signature is required');
    if (!sig.startsWith('data:image/')) throw new BadRequestException('Invalid signature format');
    if (sig.length > 900000) throw new BadRequestException('Signature is too large');

    const values = typeof dto.values === 'string' ? dto.values : null;
    const now = new Date();
    const signatureData = typeof (dto as any).signatureData === 'string' ? (dto as any).signatureData.trim() : null;

    const updated: any = await this.prisma.employeeFormAssignment.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: now,
        values,
        signatureName: dto.signatureName.trim(),
        signatureData,
        signedAt: now,
      } as any,
      include: { template: true } as any,
    });
    const template: any = updated?.template || {};

    const businessId = assignment.businessId;
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    const recipients = new Set<string>();
    if (business?.ownerId) recipients.add(business.ownerId);

    const admins = await this.prisma.employee.findMany({
      where: { businessId, role: { in: ['BUSINESS_ADMIN', 'MANAGER'] } as any, userId: { not: null } } as any,
      select: { userId: true },
    });
    for (const a of admins) {
      if (a.userId) recipients.add(a.userId);
    }

    const title = String(template.type || '').toUpperCase() === 'SOP' ? 'SOP acknowledged' : 'Employment form submitted';
    const message = `${employee.firstName} ${employee.lastName} submitted “${String(template.title || '')}”.`;
    const metadata = {
      kind: 'EMPLOYEE_FORM_SUBMITTED',
      assignmentId: updated.id,
      templateId: updated.templateId,
      employeeId: employee.id,
      businessId,
      type: template.type,
    };
    for (const userId of recipients) {
      await this.notifications.createNotification(userId, 'INFO', title, message, metadata);
      await this.notifications.sendPush(userId, { type: 'INFO', title, message, metadata, actionUrl: '/dashboard/people' });
      await this.push.send(userId, { type: 'INFO', title, message, metadata, actionUrl: '/dashboard/people' });
    }

    return updated;
  }

  async adminGetAssignment(user: any, id: string) {
    const item = await this.prisma.employeeFormAssignment.findUnique({
      where: { id },
      include: { template: true, business: true, employee: true } as any,
    });
    if (!item) throw new NotFoundException('Assignment not found');
    await this.validateBusinessAccess(item.businessId, user);
    return item;
  }
}
