import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { Shift, Prisma } from '@unitedlinkgroup/database';
import { resolveTaxContext } from '../common/tax.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
import { AuditService } from '../audit/audit.service';
import crypto from 'crypto';

@Injectable()
export class SchedulingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private push: PushService,
    private audit: AuditService
  ) {}

  private async validateBusinessAccess(targetBusinessId: string, user: any) {
    const business = await this.prisma.business.findUnique({ where: { id: targetBusinessId } });
    if (!business) {
      throw new BadRequestException('Business not found');
    }
    if (user.role === 'SUPER_ADMIN') return;
    
    // Check if user owns the business
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    // Check if user is an employee of the business
    const employee = await this.prisma.employee.findFirst({ 
        where: { userId: user.userId || user.sub || user.id, businessId: targetBusinessId } 
    });
    if (employee) return;

    throw new BadRequestException('Access denied: You do not have access to this business data');
  }

  private resolveActorUserId(user: any) {
    return user?.userId || user?.sub || user?.id;
  }

  private async assertNoShiftOverlap(params: {
    employeeId: string;
    start: Date;
    end?: Date;
    excludeGroupId?: string | null;
    excludeShiftId?: string | null;
  }) {
    const end = params.end ?? params.start;
    const exclusions: any[] = [];
    if (params.excludeGroupId) {
      exclusions.push({ groupId: params.excludeGroupId });
    }
    if (params.excludeShiftId) {
      exclusions.push({ id: params.excludeShiftId });
    }
    const overlaps = await this.prisma.shift.findFirst({
      where: {
        employeeId: params.employeeId,
        status: { in: ['DRAFT', 'PUBLISHED', 'OPEN', 'COMPLETED'] } as any,
        ...(exclusions.length ? { NOT: exclusions } : {}),
        OR: [
          {
            startTime: { lte: params.start },
            endTime: { gte: params.start },
          },
          {
            startTime: { lte: end },
            endTime: { gte: end },
          },
          {
            startTime: { gte: params.start },
            endTime: { lte: end },
          },
        ],
      } as any,
      select: { id: true }
    });
    if (overlaps) {
      throw new BadRequestException('Shift overlaps with an existing shift');
    }
  }

  private async findTrackedTimesheetForShift(params: {
    employeeId?: string | null;
    locationId?: string | null;
    startTime?: Date | null;
    endTime?: Date | null;
  }) {
    if (!params.employeeId || !params.startTime) return null;
    const shiftStartMs = params.startTime.getTime();
    const shiftEndMs = (params.endTime ?? params.startTime).getTime();
    const nowMs = Date.now();

    const candidates = await this.prisma.timesheet.findMany({
      where: {
        employeeId: params.employeeId,
        ...(params.locationId ? { locationId: params.locationId } : {}),
        startTime: { lte: params.endTime ?? params.startTime },
        OR: [{ endTime: null }, { endTime: { gte: params.startTime } }],
      },
      include: {
        breaks: {
          where: { endTime: null },
          select: { id: true, type: true, startTime: true },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 5,
    });

    for (const t of candidates) {
      const tStartMs = new Date(t.startTime).getTime();
      const tEndMs = t.endTime ? new Date(t.endTime).getTime() : nowMs;
      if (tStartMs <= shiftEndMs && tEndMs >= shiftStartMs) return t;
    }

    return null;
  }

  private async assertShiftPlacementUnlocked(params: {
    employeeId?: string | null;
    locationId?: string | null;
    startTime?: Date | null;
    endTime?: Date | null;
  }) {
    const trackedTimesheet = await this.findTrackedTimesheetForShift(params);
    if (trackedTimesheet) {
      const hasActiveBreak = Array.isArray((trackedTimesheet as any).breaks) && (trackedTimesheet as any).breaks.length > 0;
      const stateLabel = hasActiveBreak
        ? 'on break'
        : trackedTimesheet.endTime
          ? 'clocked out'
          : 'clocked in';

      throw new BadRequestException(`This shift is locked because the employee has already ${stateLabel} for this scheduled location`);
    }

    if (params.startTime) {
      const now = new Date();
      if (now.getTime() >= params.startTime.getTime()) {
        throw new BadRequestException('This shift is locked because it has already started');
      }
    }
  }

  private async getEmployeeForActor(user: any, businessId: string) {
    const userId = this.resolveActorUserId(user);
    if (!userId) return null;
    return this.prisma.employee.findFirst({ where: { userId, businessId } });
  }

  private async getAdminUsersForBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    const users: Array<{ id: string; email: string | null }> = [];

    if (business?.ownerId) {
      const owner = await this.prisma.user.findUnique({ where: { id: business.ownerId } });
      if (owner) users.push({ id: owner.id, email: owner.email || null });
    }

    const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
    for (const sa of superAdmins) users.push({ id: sa.id, email: sa.email || null });

    const map = new Map<string, { id: string; email: string | null }>();
    for (const u of users) map.set(u.id, u);
    return Array.from(map.values());
  }

  private async notifyOpenShiftCandidates(
    shift: any,
    opts?: { onlyEmployeeIds?: string[] | null; excludeEmployeeIds?: string[] | null }
  ) {
    const onlyEmployeeIds = Array.isArray(opts?.onlyEmployeeIds) ? opts?.onlyEmployeeIds.map(String) : null;
    const excludeEmployeeIds = new Set((opts?.excludeEmployeeIds || []).map(String));
    const employees = await this.prisma.employee.findMany({
      where: {
        businessId: shift.businessId,
        status: 'ACTIVE',
        ...(onlyEmployeeIds ? { id: { in: onlyEmployeeIds } } : {})
      },
      include: { user: true }
    });

    const title = 'Open shift available';
    const locLabel = shift.location?.name ? ` @ ${shift.location.name}` : '';
    const message = `Open shift ${new Date(shift.startTime).toLocaleString()}${locLabel}. Tap to apply.`;

    let notified = 0;
    for (const e of employees) {
      if (!e.userId || excludeEmployeeIds.has(String(e.id))) continue;
      notified += 1;
      await this.notifications.createNotification(e.userId, 'INFO', title, message, { shiftId: shift.id });
      await this.notifications.sendPush(e.userId, { type: 'INFO', title, message, metadata: { shiftId: shift.id } });
      await this.push.send(e.userId, { type: 'INFO', title, message, metadata: { shiftId: shift.id }, actionUrl: '/dashboard/scheduling' });
    }

    return notified;
  }

  async recordCallout(
    shiftId: string,
    body: any,
    user: any,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employee: true, location: { include: { client: true } } as any }
    });
    if (!shift) throw new BadRequestException('Shift not found');
    await this.validateBusinessAccess(shift.businessId, user);

    if (!shift.employeeId) throw new BadRequestException('Shift has no assigned employee');

    if (String(user?.role || '').toUpperCase() === 'EMPLOYEE') {
      const actorEmp = await this.getEmployeeForActor(user, shift.businessId);
      if (!actorEmp || actorEmp.id !== shift.employeeId) {
        throw new BadRequestException('Access denied: cannot call out for another employee');
      }
    }

    const reasonCode = String(body?.reasonCode || '').trim();
    const type = String(body?.type || '').trim().toUpperCase();
    const noticeAtRaw = body?.noticeAt;
    const noticeAt = noticeAtRaw ? new Date(noticeAtRaw) : new Date();
    const reasonNote = body?.reasonNote ? String(body.reasonNote) : undefined;
    const documentationUrl = body?.documentationUrl ? String(body.documentationUrl) : undefined;

    if (!reasonCode) throw new BadRequestException('Call-out reason is required');
    if (!['EXCUSED', 'UNEXCUSED', 'EMERGENCY'].includes(type)) {
      throw new BadRequestException('Invalid call-out type');
    }
    if (Number.isNaN(noticeAt.getTime())) throw new BadRequestException('Invalid notice time');

    const existing = await (this.prisma as any).shiftCallout.findUnique({ where: { shiftId } });
    if (existing) throw new BadRequestException('Call-out already recorded for this shift');

    const actorUserId = this.resolveActorUserId(user);

    const created = await (this.prisma as any).shiftCallout.create({
      data: {
        businessId: shift.businessId,
        shiftId,
        absentEmployeeId: shift.employeeId,
        reasonCode,
        reasonNote,
        type,
        noticeAt,
        documentationUrl,
        submittedByUserId: actorUserId || null
      }
    });

    if (actorUserId) {
      await this.audit.logAction({
        businessId: shift.businessId,
        userId: actorUserId,
        action: 'CALLOUT_RECORDED',
        resource: 'SHIFT',
        resourceId: shiftId,
        details: {
          calloutId: created.id,
          absentEmployeeId: created.absentEmployeeId,
          reasonCode,
          type,
          noticeAt
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent
      });
    }

    const supervisors = await this.getAdminUsersForBusiness(shift.businessId);
    const title = 'Officer call-out approval needed';
    const locLabel = shift.location?.name ? ` @ ${shift.location.name}` : '';
    const dateLabel = new Date(shift.startTime).toLocaleString();
    const message = `Call-out for shift ${dateLabel}${locLabel}. Admin approval is required before the shift can be opened.`;
    for (const sup of supervisors) {
      await this.notifications.createNotification(sup.id, 'WARNING', title, message, { shiftId, calloutId: created.id });
      await this.notifications.sendPush(sup.id, { type: 'WARNING', title, message, metadata: { shiftId, calloutId: created.id } });
      await this.push.send(sup.id, { type: 'WARNING', title, message, metadata: { shiftId, calloutId: created.id }, actionUrl: '/dashboard/requests/approvals' });
    }

    return { shiftId, calloutId: created.id, status: 'PENDING_APPROVAL' };
  }

  async listPendingCallouts(user: any, businessIdHeader?: string) {
    const where: any = { resolvedAt: null };
    if (String(user?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      if (!businessIdHeader) return [];
      await this.validateBusinessAccess(businessIdHeader, user);
      where.businessId = businessIdHeader;
    } else if (businessIdHeader) {
      where.businessId = businessIdHeader;
    }
    const rows = await (this.prisma as any).shiftCallout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        absentEmployee: true,
        submittedBy: true,
        shift: { include: { location: true } },
      } as any,
    });
    return rows
      .filter((row: any) => !!row?.shift?.employeeId && String(row?.shift?.status || '').toUpperCase() !== 'OPEN')
      .map((row: any) => ({ ...row, status: 'PENDING' }));
  }

  async approveCallout(calloutId: string, user: any) {
    const callout = await (this.prisma as any).shiftCallout.findUnique({
      where: { id: calloutId },
      include: { shift: { include: { location: true } }, absentEmployee: true } as any,
    });
    if (!callout) throw new BadRequestException('Call-out not found');
    await this.validateBusinessAccess(callout.businessId, user);
    if (callout.resolvedAt) {
      throw new BadRequestException('Call-out has already been processed');
    }

    await this.prisma.shift.update({
      where: { id: callout.shiftId },
      data: { employeeId: null, status: 'OPEN' } as any,
    });

    await (this.prisma as any).shiftCallout.update({
      where: { id: calloutId },
      data: { status: 'APPROVED' },
    });

    const notified = await this.notifyOpenShiftCandidates(callout.shift, {
      excludeEmployeeIds: [callout.absentEmployeeId],
    });

    if (callout.absentEmployee?.userId) {
      const title = 'Call-out approved';
      const message = `Your call-out for ${new Date(callout.shift.startTime).toLocaleString()} has been approved and the shift is now open.`;
      await this.notifications.createNotification(callout.absentEmployee.userId, 'INFO', title, message, { shiftId: callout.shiftId, calloutId });
      await this.notifications.sendPush(callout.absentEmployee.userId, { type: 'INFO', title, message, metadata: { shiftId: callout.shiftId, calloutId } });
      await this.push.send(callout.absentEmployee.userId, { type: 'INFO', title, message, metadata: { shiftId: callout.shiftId, calloutId }, actionUrl: '/dashboard/scheduling' });
    }

    return { callout: { ...callout, status: 'APPROVED' }, notified };
  }

  async rejectCallout(calloutId: string, body: any, user: any) {
    const callout = await (this.prisma as any).shiftCallout.findUnique({
      where: { id: calloutId },
      include: { shift: true, absentEmployee: true } as any,
    });
    if (!callout) throw new BadRequestException('Call-out not found');
    await this.validateBusinessAccess(callout.businessId, user);
    if (callout.resolvedAt) {
      throw new BadRequestException('Call-out has already been processed');
    }

    if (callout.absentEmployee?.userId) {
      const title = 'Call-out not approved';
      const message = `Your call-out for ${new Date(callout.shift.startTime).toLocaleString()} was not approved.`;
      await this.notifications.createNotification(callout.absentEmployee.userId, 'WARNING', title, message, { shiftId: callout.shiftId, calloutId });
      await this.notifications.sendPush(callout.absentEmployee.userId, { type: 'WARNING', title, message, metadata: { shiftId: callout.shiftId, calloutId } });
      await this.push.send(callout.absentEmployee.userId, { type: 'WARNING', title, message, metadata: { shiftId: callout.shiftId, calloutId }, actionUrl: '/dashboard/scheduling' });
    }

    const updated = await (this.prisma as any).shiftCallout.update({
      where: { id: calloutId },
      data: {
        status: 'REJECTED',
        resolvedAt: new Date(),
        resolvedByUserId: this.resolveActorUserId(user) || null,
      },
    });
    return { ...updated, status: 'REJECTED', reason: body?.reason ? String(body.reason) : null };
  }

  async getMyCallouts(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');

    const rows = await (this.prisma as any).shiftCallout.findMany({
      where: { absentEmployeeId: employee.id },
      orderBy: { createdAt: 'desc' },
      include: {
        shift: { include: { location: true, employee: true } } as any,
        absentEmployee: true,
        submittedBy: true,
        resolvedBy: true,
      } as any,
    });

    return rows.map((row: any) => {
      const savedStatus = String(row?.status || '').toUpperCase();
      const shiftStatus = String(row?.shift?.status || '').toUpperCase();
      const currentEmployeeId = String(row?.shift?.employeeId || '');
      const absentEmployeeId = String(row?.absentEmployeeId || '');
      let status = 'PENDING';
      if (savedStatus === 'COVERED' || (row?.resolvedAt && currentEmployeeId && currentEmployeeId !== absentEmployeeId)) {
        status = 'COVERED';
      } else if (savedStatus === 'REJECTED' || row?.resolvedAt) {
        status = 'REJECTED';
      } else if (savedStatus === 'APPROVED' || (!row?.resolvedAt && (shiftStatus === 'OPEN' || !currentEmployeeId))) {
        status = 'APPROVED_OPEN';
      }
      return { ...row, status };
    });
  }

  async reassignShift(
    shiftId: string,
    body: any,
    user: any,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employee: true, location: true }
    });
    if (!shift) throw new BadRequestException('Shift not found');
    await this.validateBusinessAccess(shift.businessId, user);

    const replacementEmployeeId = String(body?.replacementEmployeeId || '').trim();
    if (!replacementEmployeeId) throw new BadRequestException('Replacement officer is required');

    const replacement = await this.prisma.employee.findUnique({ where: { id: replacementEmployeeId }, include: { user: true } });
    if (!replacement || replacement.businessId !== shift.businessId) throw new BadRequestException('Replacement officer not found');
    if (replacement.status !== 'ACTIVE') throw new BadRequestException('Replacement officer is not active');

    await this.assertShiftPlacementUnlocked({
      employeeId: shift.employeeId,
      locationId: shift.locationId,
      startTime: new Date(shift.startTime),
      endTime: shift.endTime ? new Date(shift.endTime) : null,
    });

    const ok = await this.validateAvailability(replacementEmployeeId, new Date(shift.startTime), new Date(shift.endTime));
    if (!ok.ok) throw new BadRequestException(ok.message);

    const actorUserId = this.resolveActorUserId(user);

    const callout = await (this.prisma as any).shiftCallout.findUnique({ where: { shiftId } }).catch(() => null);
    const absentEmployeeId = callout?.absentEmployeeId || null;
    const reassignedAt = new Date();

    const updatedShift = await this.prisma.shift.update({
      where: { id: shiftId },
      data: { employeeId: replacementEmployeeId, status: 'PUBLISHED' }
    });

    const responseMinutes = callout?.noticeAt
      ? Math.max(0, Math.round((reassignedAt.getTime() - new Date(callout.noticeAt).getTime()) / (1000 * 60)))
      : null;

    const coverage = await (this.prisma as any).shiftCoverage.create({
      data: {
        businessId: shift.businessId,
        shiftId,
        calloutId: callout?.id || null,
        absentEmployeeId,
        replacementEmployeeId,
        method: 'DIRECT',
        reassignedAt,
        reassignedByUserId: actorUserId || null,
        acceptedAt: reassignedAt,
        responseMinutes: responseMinutes ?? null
      }
    });

    if (callout?.id) {
      await (this.prisma as any).shiftCallout.update({
        where: { id: callout.id },
        data: { status: 'COVERED', resolvedAt: reassignedAt, resolvedByUserId: actorUserId || null }
      });
    }

    if (actorUserId) {
      await this.audit.logAction({
        businessId: shift.businessId,
        userId: actorUserId,
        action: 'SHIFT_REASSIGNED',
        resource: 'SHIFT',
        resourceId: shiftId,
        details: {
          coverageId: coverage.id,
          replacementEmployeeId,
          absentEmployeeId,
          responseMinutes
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent
      });
    }

    if (replacement.userId) {
      const title = 'Shift assigned (coverage)';
      const message = `You were assigned a coverage shift on ${new Date(shift.startTime).toLocaleString()}.`;
      await this.notifications.createNotification(replacement.userId, 'INFO', title, message, { shiftId, coverageId: coverage.id });
      await this.notifications.sendPush(replacement.userId, { type: 'INFO', title, message, metadata: { shiftId, coverageId: coverage.id } });
      await this.push.send(replacement.userId, { type: 'INFO', title, message, metadata: { shiftId, coverageId: coverage.id }, actionUrl: '/dashboard/scheduling' });
    }

    const supervisors = await this.getAdminUsersForBusiness(shift.businessId);
    const title = 'Shift coverage filled';
    const message = `Coverage assigned to ${replacement.firstName} ${replacement.lastName} for ${new Date(shift.startTime).toLocaleString()}.`;
    for (const sup of supervisors) {
      await this.notifications.createNotification(sup.id, 'SUCCESS', title, message, { shiftId, coverageId: coverage.id });
      await this.notifications.sendPush(sup.id, { type: 'SUCCESS', title, message, metadata: { shiftId, coverageId: coverage.id } });
      await this.push.send(sup.id, { type: 'SUCCESS', title, message, metadata: { shiftId, coverageId: coverage.id }, actionUrl: '/dashboard/scheduling' });
    }

    return { shift: updatedShift, coverageId: coverage.id };
  }

  async broadcastOpenShift(
    shiftId: string,
    body: any,
    user: any,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { location: true }
    });
    if (!shift) throw new BadRequestException('Shift not found');
    await this.validateBusinessAccess(shift.businessId, user);

    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Shift must be open to broadcast');
    }

    const actorUserId = this.resolveActorUserId(user);
    const onlyEmployeeIds = Array.isArray(body?.employeeIds) ? body.employeeIds.map((x: any) => String(x)) : null;

    const employees = await this.prisma.employee.findMany({
      where: {
        businessId: shift.businessId,
        status: 'ACTIVE',
        ...(onlyEmployeeIds ? { id: { in: onlyEmployeeIds } } : {})
      },
      include: { user: true }
    });

    const title = 'Open shift available';
    const locLabel = shift.location?.name ? ` @ ${shift.location.name}` : '';
    const message = `Open shift ${new Date(shift.startTime).toLocaleString()}${locLabel}. Tap to apply.`;

    let notified = 0;
    for (const e of employees) {
      if (!e.userId) continue;
      notified += 1;
      await this.notifications.createNotification(e.userId, 'INFO', title, message, { shiftId });
      await this.notifications.sendPush(e.userId, { type: 'INFO', title, message, metadata: { shiftId } });
      await this.push.send(e.userId, { type: 'INFO', title, message, metadata: { shiftId }, actionUrl: '/dashboard/scheduling' });
    }

    if (actorUserId) {
      await this.audit.logAction({
        businessId: shift.businessId,
        userId: actorUserId,
        action: 'SHIFT_BROADCAST',
        resource: 'SHIFT',
        resourceId: shiftId,
        details: { notified },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent
      });
    }

    return { shiftId, notified };
  }

  async getShiftHistory(shiftId: string, user: any) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        employee: true,
        location: { include: { client: true } } as any,
        applications: { include: { employee: true } } as any,
        callout: { include: { absentEmployee: true, submittedBy: true, resolvedBy: true } } as any,
        coverages: {
          orderBy: { reassignedAt: 'asc' },
          include: { replacementEmployee: true, reassignedBy: true, callout: true } as any
        } as any
      } as any
    });
    if (!shift) throw new BadRequestException('Shift not found');
    await this.validateBusinessAccess(shift.businessId, user);

    if (String(user?.role || '').toUpperCase() === 'EMPLOYEE') {
      const actorEmp = await this.getEmployeeForActor(user, shift.businessId);
      const selfShift = actorEmp && (actorEmp.id === shift.employeeId || actorEmp.id === (shift as any).callout?.absentEmployeeId);
      const selfCoverage = actorEmp && Array.isArray((shift as any).coverages) && (shift as any).coverages.some((c: any) => c.replacementEmployeeId === actorEmp.id);
      if (!selfShift && !selfCoverage) {
        throw new BadRequestException('Access denied: cannot view history for this shift');
      }
    }

    const logs = await this.audit.getLogs({ businessId: shift.businessId, resource: 'SHIFT', resourceId: shiftId, limit: 200 });
    return { shift, logs };
  }

  async createShift(data: Prisma.ShiftCreateInput, user: any): Promise<Shift> {
    // Extract business ID from data
    let businessId: string | undefined;
    if (data.business?.connect?.id) {
        businessId = data.business.connect.id;
    } else if ((data as any).businessId) {
        businessId = (data as any).businessId;
    }

    if (!businessId) {
        // Try to resolve from user if not provided? 
        // Or fail? Usually shift creation requires business context.
        // If user is employee/manager, we can infer.
        try {
            businessId = await this.getBusinessId(user.userId || user.sub || user.id);
            // Inject into data if missing
            if (!data.business && !(data as any).businessId) {
                data.business = { connect: { id: businessId } };
            }
        } catch (e) {
            throw new BadRequestException('Business context required');
        }
    }

    if (businessId) {
        await this.validateBusinessAccess(businessId, user);
    }

    const startTime = new Date(data.startTime as any);
    const endTime = (data as any).endTime ? new Date((data as any).endTime as any) : null;
    if (!endTime) {
      throw new BadRequestException('End time is required');
    }
    if (startTime >= endTime) {
      throw new BadRequestException('End time must be after start time');
    }

    const employeeConnectId = (data as any)?.employee?.connect?.id as string | undefined;
    const locationConnectId = (data as any)?.location?.connect?.id as string | undefined;
    const groupId = (data as any).groupId ? String((data as any).groupId) : crypto.randomUUID();
    const notes = typeof (data as any).notes === 'string' ? (data as any).notes : ((data as any).notes ?? null);
    const breakMinutesRaw = (data as any).breakMinutes;
    const breakMinutes =
      typeof breakMinutesRaw === 'number'
        ? Math.max(0, Math.trunc(breakMinutesRaw))
        : typeof breakMinutesRaw === 'string'
          ? Math.max(0, Math.trunc(parseInt(breakMinutesRaw, 10) || 0))
          : 0;

    // Check for overlaps for the same employee
    if (employeeConnectId) {
      // Check if employee is active
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeConnectId },
      });

      if (!employee || employee.status !== 'ACTIVE') {
        throw new BadRequestException('Cannot schedule a deactivated employee');
      }
      await this.assertNoShiftOverlap({
        employeeId: employeeConnectId,
        start: startTime,
        end: endTime,
        excludeGroupId: groupId,
      });
    }

    // Draft schedules can be prepared before final availability review.
    // Publish-time validation already blocks unavailable assignments from going live.

    const createData: any = {
      business: { connect: { id: businessId } },
      startTime,
      endTime,
      breakMinutes,
      status: 'DRAFT',
      groupId,
      notes,
    };
    if (employeeConnectId) createData.employee = { connect: { id: employeeConnectId } };
    if (locationConnectId) createData.location = { connect: { id: locationConnectId } };

    const created = await this.prisma.shift.create({ data: createData });
    const empId = created.employeeId;
    if (empId && String((created as any).status || '').toUpperCase() !== 'DRAFT') {
      const employee = await this.prisma.employee.findUnique({ where: { id: empId }, include: { user: true } });
      if (employee?.userId) {
        const title = 'New shift scheduled';
        const message = `You have a shift on ${new Date(created.startTime).toLocaleDateString()}.`;
        await this.notifications.createNotification(employee.userId, 'INFO', title, message, { shiftId: created.id });
        await this.notifications.sendPush(employee.userId, { type: 'INFO', title, message, metadata: { shiftId: created.id } });
        await this.push.send(employee.userId, { type: 'INFO', title, message, metadata: { shiftId: created.id }, actionUrl: '/dashboard/scheduling' });
        const user = employee.user;
        if (user?.email) {
          await this.notifications.sendEmail(user.email, title, message);
        }
      }
    }
    return created;
  }
  
  async getTaxContextForBusiness(userId: string, locationId?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');
    return resolveTaxContext(this.prisma, employee.businessId, locationId);
  }

  async getShifts(businessId: string, start: Date, end: Date, user: any, employeeId?: string): Promise<Shift[]> {
    await this.validateBusinessAccess(businessId, user);
    const rows = await this.prisma.shift.findMany({
      where: {
        businessId,
        ...(employeeId ? { employeeId } : {}),
        startTime: { lte: end },
        endTime: { gte: start },
        status: { in: ['DRAFT', 'PUBLISHED', 'OPEN', 'CANCELLED'] } as any,
      },
      include: {
        employee: true,
        location: { include: { client: true } } as any,
        applications: { include: { employee: true } } as any,
        callout: { include: { absentEmployee: true } } as any,
        coverages: { include: { replacementEmployee: true, reassignedBy: true } } as any,
      } as any,
    }) as unknown as Shift[];
    const byGroup = new Map<string, Shift>();
    const score = (s: any) => {
      const st = String(s?.status || '').toUpperCase();
      if (st === 'DRAFT') return 4;
      if (st === 'CANCELLED') return 3;
      if (st === 'PUBLISHED') return 2;
      if (st === 'OPEN') return 1;
      return 0;
    };
    for (const s of rows) {
      const gid = (s as any).groupId || s.id;
      const cur = byGroup.get(gid);
      if (!cur || score(s) > score(cur)) byGroup.set(gid, s);
    }
    return Array.from(byGroup.values());
  }

  async applyForShift(shiftId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');
    
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new BadRequestException('Shift not found');
    
    // Validate that employee belongs to the same business as the shift
    if (shift.businessId !== employee.businessId) {
        throw new BadRequestException('Access denied: Cannot apply for shift in another business');
    }

    if (shift.status !== 'OPEN') throw new BadRequestException('Shift is not open for application');

    // Check if already applied
    const existing = await (this.prisma as any).shiftApplication.findUnique({
      where: {
        shiftId_employeeId: {
          shiftId,
          employeeId: employee.id
        }
      }
    });
    
    if (existing) throw new BadRequestException('Already applied for this shift');

    const application = await (this.prisma as any).shiftApplication.create({
      data: {
        shiftId,
        employeeId: employee.id,
        status: 'PENDING'
      }
    });

    // Notify admin/superadmin approvers
    const businessId = shift.businessId;
    const uniqueAdmins = await this.getAdminUsersForBusiness(businessId);

    const title = 'New Shift Application';
    const message = `${employee.firstName} ${employee.lastName} applied for shift on ${new Date(shift.startTime).toLocaleDateString()}`;

    for (const admin of uniqueAdmins) {
        await this.notifications.createNotification(admin.id, 'INFO', title, message, { shiftId, applicationId: application.id });
        await this.notifications.sendPush(admin.id, { type: 'INFO', title, message, metadata: { shiftId, applicationId: application.id } });
        await this.push.send(admin.id, { type: 'INFO', title, message, metadata: { shiftId, applicationId: application.id }, actionUrl: '/dashboard/requests/approvals' });
    }

    return application;
  }

  async declineShiftApplication(applicationId: string, user: any) {
      const app = await (this.prisma as any).shiftApplication.findUnique({
          where: { id: applicationId },
          include: { shift: true, employee: { include: { user: true } } }
      });
      if (!app) throw new BadRequestException('Application not found');

      await this.validateBusinessAccess(app.shift.businessId, user);

      // Update application status
      await (this.prisma as any).shiftApplication.update({
          where: { id: applicationId },
          data: { status: 'REJECTED' }
      });

      // Notify Employee
      if (app.employee.user) {
          const title = 'Shift Application Declined';
          const message = `Your application for shift on ${new Date(app.shift.startTime).toLocaleDateString()} has been declined.`;
          const userId = app.employee.user.id;

          await this.notifications.createNotification(userId, 'WARNING', title, message, { shiftId: app.shiftId });
          await this.notifications.sendPush(userId, { type: 'WARNING', title, message, metadata: { shiftId: app.shiftId } });
          await this.push.send(userId, { type: 'WARNING', title, message, metadata: { shiftId: app.shiftId }, actionUrl: '/dashboard/scheduling' });

          if (app.employee.user.email) {
              await this.notifications.sendEmail(app.employee.user.email, title, message);
          }
      }

      return { success: true };
  }

  async approveShiftApplication(applicationId: string, user: any) {
      const app = await (this.prisma as any).shiftApplication.findUnique({ 
          where: { id: applicationId },
          include: { shift: true, employee: { include: { user: true } } }
      });
      if (!app) throw new BadRequestException('Application not found');
      
      await this.validateBusinessAccess(app.shift.businessId, user);

      const start = new Date(app.shift.startTime);
      const end = app.shift.endTime ? new Date(app.shift.endTime) : undefined;
      const ok = await this.validateAvailability(app.employeeId, start, end);
      if (!ok.ok) {
        throw new BadRequestException(ok.message);
      }
      
      // Update application status
      await (this.prisma as any).shiftApplication.update({
          where: { id: applicationId },
          data: { status: 'APPROVED' }
      });

      // Update Shift
      const updatedShift = await this.prisma.shift.update({
          where: { id: app.shiftId },
          data: {
              employeeId: app.employeeId,
              status: 'PUBLISHED'
          }
      });

      const callout = await (this.prisma as any).shiftCallout.findUnique({ where: { shiftId: app.shiftId } }).catch(() => null);
      if (callout && !callout.resolvedAt) {
        const reassignedAt = new Date();
        const acceptedAt = app.createdAt ? new Date(app.createdAt) : reassignedAt;
        const responseMinutes = callout.noticeAt
          ? Math.max(0, Math.round((acceptedAt.getTime() - new Date(callout.noticeAt).getTime()) / (1000 * 60)))
          : null;

        await (this.prisma as any).shiftCoverage.create({
          data: {
            businessId: app.shift.businessId,
            shiftId: app.shiftId,
            calloutId: callout.id,
            absentEmployeeId: callout.absentEmployeeId,
            replacementEmployeeId: app.employeeId,
            method: 'APPLICATION',
            reassignedAt,
            reassignedByUserId: this.resolveActorUserId(user) || null,
            acceptedAt,
            responseMinutes: responseMinutes ?? null
          }
        });

        await (this.prisma as any).shiftCallout.update({
          where: { id: callout.id },
          data: { status: 'COVERED', resolvedAt: reassignedAt, resolvedByUserId: this.resolveActorUserId(user) || null }
        });
      }
      
      // Reject other applications for this shift
      await (this.prisma as any).shiftApplication.updateMany({
          where: { shiftId: app.shiftId, id: { not: applicationId } },
          data: { status: 'REJECTED' }
      });

      // Notify Employee
      if (app.employee.user) {
          const title = 'Shift Application Approved';
          const message = `Your application for shift on ${new Date(app.shift.startTime).toLocaleDateString()} has been approved.`;
          const userId = app.employee.user.id;
          
          await this.notifications.createNotification(userId, 'SUCCESS', title, message, { shiftId: app.shiftId });
          await this.notifications.sendPush(userId, { type: 'SUCCESS', title, message, metadata: { shiftId: app.shiftId } });
          await this.push.send(userId, { type: 'SUCCESS', title, message, metadata: { shiftId: app.shiftId }, actionUrl: '/dashboard/scheduling' });
          
          if (app.employee.user.email) {
              await this.notifications.sendEmail(app.employee.user.email, title, message);
          }
      }
      
      return updatedShift;
  }

  async getMyShifts(userId: string, start: Date, end: Date) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');
    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId: employee.id,
        startTime: { gte: start },
        endTime: { lte: end },
        status: 'PUBLISHED',
      },
      include: { location: true, employee: true, callout: true as any },
      orderBy: { startTime: 'asc' }
    });
    let totalHours = 0;
    let totalBreakMinutes = 0;
    for (const s of shifts) {
      const hours = s.endTime ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60) : 0;
      totalHours += Math.max(0, hours);
      const plannedBreakMinutesRaw = Number((s as any).breakMinutes || 0);
      const plannedBreakMinutes = Number.isFinite(plannedBreakMinutesRaw) ? Math.max(0, plannedBreakMinutesRaw) : 0;
      const requiredUnpaidBreakMinutes = hours >= 8 ? 30 : 0;
      totalBreakMinutes += Math.max(plannedBreakMinutes, requiredUnpaidBreakMinutes);
    }
    const netHours = Math.max(0, totalHours - (totalBreakMinutes / 60));
    const rate = employee.hourlyRate || 0;
    let payableHours = netHours;
    let estimatedEarnings = Number((netHours * rate).toFixed(2));
    if (employee.payType === 'HOURLY' && (employee.overtimeEligible ?? true)) {
      const weeklyHours: Record<string, number> = {};
      for (const s of shifts) {
        if (!s.endTime) continue;
        let durationMs = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
        const shiftHours = Math.max(0, durationMs / (1000 * 60 * 60));
        const plannedBreakMinutesRaw = Number((s as any).breakMinutes || 0);
        const plannedBreakMinutes = Number.isFinite(plannedBreakMinutesRaw) ? Math.max(0, plannedBreakMinutesRaw) : 0;
        const requiredUnpaidBreakMinutes = shiftHours >= 8 ? 30 : 0;
        const breakMinutes = Math.max(plannedBreakMinutes, requiredUnpaidBreakMinutes);
        durationMs -= breakMinutes * 60 * 1000;
        const netShiftHours = Math.max(0, durationMs / (1000 * 60 * 60));
        const date = new Date(s.startTime);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const weekStart = new Date(date.setDate(diff));
        weekStart.setHours(0,0,0,0);
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + netShiftHours;
      }
      let reg = 0;
      let ot = 0;
      Object.values(weeklyHours).forEach(wt => {
        if (wt > 40) {
          reg += 40;
          ot += wt - 40;
        } else {
          reg += wt;
        }
      });
      payableHours = Number((reg + ot).toFixed(2));
      estimatedEarnings = Number((reg * rate + ot * rate * 1.5).toFixed(2));
    }
    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        hourlyRate: employee.hourlyRate || 0,
      },
      shifts,
      summary: {
        totalHours: Number(totalHours.toFixed(2)),
        totalBreakMinutes,
        payableHours,
        estimatedEarnings,
      }
    };
  }
  
  async getMyPeerShifts(userId: string, start: Date, end: Date): Promise<Shift[]> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');
    const myShifts = await this.prisma.shift.findMany({
      where: {
        employeeId: employee.id,
        startTime: { gte: start },
        endTime: { lte: end },
        status: 'PUBLISHED',
      },
      select: { locationId: true },
    });
    const locationIds = Array.from(new Set(myShifts.map(s => s.locationId).filter(Boolean))) as string[];
    if (locationIds.length === 0) return [];
    return this.prisma.shift.findMany({
      where: {
        locationId: { in: locationIds },
        startTime: { gte: start },
        endTime: { lte: end },
        status: { in: ['PUBLISHED', 'OPEN'] },
        OR: [
          { employeeId: { not: employee.id } },
          { employeeId: null }
        ]
      },
      include: { employee: true, location: true, applications: { include: { employee: true } } } as any,
      orderBy: { startTime: 'asc' }
    }) as unknown as Shift[];
  }
  async updateShift(id: string, data: Prisma.ShiftUpdateInput, user: any): Promise<Shift> {
    const before = await this.prisma.shift.findUnique({ where: { id } });
    if (!before) throw new BadRequestException('Shift not found');

    await this.validateBusinessAccess(before.businessId, user);

    const now = new Date();
    if (now.getTime() >= before.startTime.getTime()) {
      throw new BadRequestException('This shift is locked because it has already started');
    }

    const beforeStatus = String((before as any)?.status || '').toUpperCase();
    const nextStatus = typeof (data as any)?.status === 'string' ? String((data as any).status).toUpperCase() : null;
    if (nextStatus && (nextStatus === 'PUBLISHED' || nextStatus === 'OPEN')) {
      throw new BadRequestException('Use Publish to make schedules visible to employees');
    }

    const groupId = (before as any).groupId || before.id;
    const nextStart = (data.startTime as any) ? new Date(data.startTime as any) : new Date(before.startTime);
    const nextEnd = (data.endTime as any) ? new Date(data.endTime as any) : new Date(before.endTime);
    const nextNotes = typeof (data as any).notes !== 'undefined' ? (data as any).notes : (before as any).notes;
    const breakMinutesRaw = (data as any).breakMinutes;
    const nextBreakMinutes =
      typeof breakMinutesRaw === 'number'
        ? Math.max(0, Math.trunc(breakMinutesRaw))
        : typeof breakMinutesRaw === 'string'
          ? Math.max(0, Math.trunc(parseInt(breakMinutesRaw, 10) || 0))
          : ((before as any).breakMinutes ?? 0);

    let nextEmployeeId: string | null = before.employeeId || null;
    if ((data as any).employee?.connect?.id) nextEmployeeId = (data as any).employee.connect.id;
    if ((data as any).employee?.disconnect) nextEmployeeId = null;

    let nextLocationId: string | null = before.locationId || null;
    if ((data as any).location?.connect?.id) nextLocationId = (data as any).location.connect.id;
    if ((data as any).location?.disconnect) nextLocationId = null;

    const shouldEnforceAvailability =
      beforeStatus !== 'DRAFT' &&
      beforeStatus !== 'PUBLISHED' &&
      beforeStatus !== 'OPEN' &&
      nextStatus !== 'DRAFT';

    if (nextEmployeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: nextEmployeeId } });
      if (!employee || employee.status !== 'ACTIVE') {
        throw new BadRequestException('Cannot schedule a deactivated employee');
      }
      if (shouldEnforceAvailability) {
        const ok = await this.validateAvailability(nextEmployeeId, nextStart, nextEnd);
        if (!ok.ok) throw new BadRequestException(ok.message);
      }
      await this.assertNoShiftOverlap({
        employeeId: nextEmployeeId,
        start: nextStart,
        end: nextEnd,
        excludeGroupId: groupId || null,
        excludeShiftId: id,
      });
    }

    if (beforeStatus === 'PUBLISHED' || beforeStatus === 'OPEN') {
      const existingDraft = await this.prisma.shift.findFirst({
        where: { businessId: before.businessId, groupId, status: 'DRAFT' } as any,
      });

      const actorUserId = this.resolveActorUserId(user);
      if (actorUserId) {
        await this.audit.logAction({
          businessId: before.businessId,
          userId: actorUserId,
          action: 'SHIFT_DRAFT_CREATED',
          resource: 'SHIFT',
          resourceId: existingDraft?.id || before.id,
          details: { fromStatus: beforeStatus, originalShiftId: before.id },
        });
      }

      if (existingDraft) {
        return this.prisma.shift.update({
          where: { id: existingDraft.id },
          data: {
            startTime: nextStart,
            endTime: nextEnd,
            breakMinutes: nextBreakMinutes,
            notes: nextNotes,
            employeeId: nextEmployeeId,
            locationId: nextLocationId,
          } as any,
        });
      }

      return this.prisma.shift.create({
        data: {
          businessId: before.businessId,
          groupId,
          startTime: nextStart,
          endTime: nextEnd,
          breakMinutes: nextBreakMinutes,
          notes: nextNotes,
          status: 'DRAFT',
          employeeId: nextEmployeeId,
          locationId: nextLocationId,
        } as any,
      });
    }

    if (beforeStatus === 'ARCHIVED') {
      throw new BadRequestException('Cannot edit an archived shift');
    }

    return this.prisma.shift.update({
      where: { id },
      data: {
        ...(typeof (data as any).startTime !== 'undefined' ? { startTime: nextStart } : {}),
        ...(typeof (data as any).endTime !== 'undefined' ? { endTime: nextEnd } : {}),
        ...(typeof (data as any).breakMinutes !== 'undefined' ? { breakMinutes: nextBreakMinutes } : {}),
        ...(typeof (data as any).notes !== 'undefined' ? { notes: nextNotes } : {}),
        ...(typeof nextStatus === 'string' ? { status: nextStatus } : {}),
        employeeId: nextEmployeeId,
        locationId: nextLocationId,
      } as any,
    });
  }

  async deleteShift(id: string, user: any): Promise<Shift> {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new BadRequestException('Shift not found');

    await this.validateBusinessAccess(shift.businessId, user);
    await this.assertShiftPlacementUnlocked({
      employeeId: shift.employeeId,
      locationId: shift.locationId,
      startTime: shift.startTime,
      endTime: shift.endTime,
    });

    const status = String((shift as any).status || '').toUpperCase();
    const groupId = (shift as any).groupId || shift.id;

    if (status === 'PUBLISHED' || status === 'OPEN') {
      const active = await this.prisma.shift.findFirst({
        where: { businessId: shift.businessId, groupId, status: { in: ['PUBLISHED', 'OPEN'] } as any } as any,
        orderBy: { createdAt: 'desc' }
      });
      const drafts = await this.prisma.shift.findMany({
        where: { businessId: shift.businessId, groupId, status: { in: ['DRAFT', 'CANCELLED'] } as any } as any,
        select: { id: true }
      });

      if (drafts.length) {
        await this.prisma.shift.deleteMany({ where: { id: { in: drafts.map(d => d.id) } } });
      }
      if (active) {
        await this.prisma.shift.update({ where: { id: active.id }, data: { status: 'ARCHIVED' } as any });
        if ((active as any).employeeId) {
          const employee = await this.prisma.employee.findUnique({
            where: { id: (active as any).employeeId },
            include: { user: true } as any
          });
          if (employee?.userId) {
            const title = 'Shift cancelled';
            const msg = `Your shift on ${new Date((active as any).startTime).toLocaleString()} was cancelled.`;
            const metadata = { kind: 'SHIFT_CANCELLED', shiftId: active.id, groupId, startTime: (active as any).startTime, endTime: (active as any).endTime };
            await this.notifications.createNotification(employee.userId, 'WARNING', title, msg, metadata);
            await this.notifications.sendPush(employee.userId, { type: 'WARNING', title, message: msg, metadata, actionUrl: '/dashboard/scheduling' });
            await this.push.send(employee.userId, { type: 'WARNING', title, message: msg, metadata, actionUrl: '/dashboard/scheduling' });
          }
        }
        return active as any;
      }
      return shift as any;
    }

    const published = await this.prisma.shift.findFirst({
      where: { businessId: shift.businessId, groupId, status: { in: ['PUBLISHED', 'OPEN'] } as any } as any,
      orderBy: { createdAt: 'desc' }
    });
    await this.prisma.shift.delete({ where: { id } });
    return published ? (published as any) : (shift as any);
  }
  
  async publishShifts(businessId: string, start: Date, end: Date, user: any): Promise<void> {
      await this.validateBusinessAccess(businessId, user);

      const drafts = await this.prisma.shift.findMany({
        where: {
          businessId,
          startTime: { gte: start },
          endTime: { lte: end },
          status: { in: ['DRAFT', 'CANCELLED'] } as any
        },
        include: { employee: true }
      });
      const violations: string[] = [];
      for (const s of drafts) {
        if (String((s as any).status || '').toUpperCase() !== 'DRAFT') continue;
        if (s.employeeId) {
          const ok = await this.validateAvailability(s.employeeId, new Date(s.startTime), s.endTime ? new Date(s.endTime) : undefined);
          if (!ok.ok) {
            const name = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : s.employeeId;
            violations.push(`${name}: ${ok.message}`);
          }
        }
      }
      if (violations.length > 0) {
        throw new BadRequestException(`Cannot publish. ${violations.join(' | ')}`);
      }

      const draftsByGroup = new Map<string, any>();
      for (const s of drafts) {
        const gid = (s as any).groupId || s.id;
        const existing = draftsByGroup.get(gid);
        if (!existing) draftsByGroup.set(gid, s);
        else {
          const exStatus = String(existing.status || '').toUpperCase();
          const sStatus = String(s.status || '').toUpperCase();
          if (exStatus !== 'DRAFT' && sStatus === 'DRAFT') draftsByGroup.set(gid, s);
        }
      }

      for (const s of draftsByGroup.values()) {
        const gid = (s as any).groupId || s.id;
        const st = String((s as any).status || '').toUpperCase();
        const active = await this.prisma.shift.findFirst({
          where: { businessId, groupId: gid, status: { in: ['PUBLISHED', 'OPEN'] } as any } as any,
          orderBy: { createdAt: 'desc' }
        });

        if (st === 'CANCELLED') {
          if (active) {
            await this.prisma.shift.update({ where: { id: active.id }, data: { status: 'ARCHIVED' } as any });
          }
          await this.prisma.shift.delete({ where: { id: s.id } });
          continue;
        }

        const nextStatus = s.employeeId ? 'PUBLISHED' : 'OPEN';
        await this.prisma.shift.update({ where: { id: s.id }, data: { status: nextStatus } as any });
        if (active) {
          await this.prisma.shift.update({ where: { id: active.id }, data: { status: 'ARCHIVED' } as any });
        }
      }

      const employeeUsers = await this.prisma.user.findMany({
        where: { employeeProfiles: { some: { businessId, status: 'ACTIVE', userId: { not: null } } as any } } as any,
        select: { id: true, email: true }
      });
      const business = await this.prisma.business.findUnique({ where: { id: businessId } });
      const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
      const adminUsers: Array<{ id: string; email: string | null }> = [];
      if (business?.ownerId) {
        const owner = await this.prisma.user.findUnique({ where: { id: business.ownerId } });
        if (owner) adminUsers.push({ id: owner.id, email: owner.email || null });
      }
      for (const sa of superAdmins) {
        adminUsers.push({ id: sa.id, email: sa.email || null });
      }
      const managers = await this.prisma.employee.findMany({
        where: { businessId, role: 'MANAGER' },
        include: { user: true }
      });
      const managerUsers = managers.map(m => m.user).filter(Boolean) as Array<{ id: string; email: string | null }>;
      const allUsersMap = new Map<string, { id: string; email: string | null }>();
      for (const u of [...employeeUsers, ...adminUsers, ...managerUsers]) {
        allUsersMap.set(u.id, u);
      }
      const title = 'Weekly schedule published';
      const msg = `Schedule for ${start.toDateString()} - ${end.toDateString()} is now published.`;
      for (const u of allUsersMap.values()) {
        const metadata = { kind: 'SCHEDULE_PUBLISHED', start, end };
        await this.notifications.createNotification(u.id, 'SUCCESS', title, msg, metadata);
        await this.notifications.sendPush(u.id, { type: 'SUCCESS', title, message: msg, metadata, actionUrl: '/dashboard/scheduling' });
        await this.push.send(u.id, { type: 'SUCCESS', title, message: msg, metadata, actionUrl: '/dashboard/scheduling' });
        if (u.email) {
          await this.notifications.sendEmail(u.email, title, msg);
        }
      }
  }

  async autoSchedule(
    businessId: string,
    start: Date,
    end: Date,
    user: any,
    opts?: { clientId?: string }
  ): Promise<{ assigned: number; unfilled: number; total: number }> {
    await this.validateBusinessAccess(businessId, user);

    const clientId = opts?.clientId && opts.clientId !== 'all' ? String(opts.clientId) : null;

    const draftShifts = await this.prisma.shift.findMany({
      where: {
        businessId,
        status: 'DRAFT',
        employeeId: null,
        startTime: { gte: start },
        endTime: { lte: end },
        locationId: { not: null },
      } as any,
      include: { location: { include: { client: true } } as any } as any,
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });

    const targetShifts = clientId
      ? draftShifts.filter(s => (s as any)?.location?.clientId === clientId)
      : draftShifts;

    if (targetShifts.length === 0) {
      return { assigned: 0, unfilled: 0, total: 0 };
    }

    const employees = await this.prisma.employee.findMany({
      where: { businessId, status: 'ACTIVE' } as any,
      select: { id: true, firstName: true, lastName: true, defaultLocationId: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }) as Array<{ id: string; firstName: string; lastName: string; defaultLocationId: string | null }>;

    if (employees.length === 0) {
      return { assigned: 0, unfilled: targetShifts.length, total: targetShifts.length };
    }

    const employeeIds = employees.map(e => e.id);

    const existing = await this.prisma.shift.findMany({
      where: {
        businessId,
        employeeId: { in: employeeIds },
        status: { in: ['DRAFT', 'PUBLISHED', 'OPEN', 'COMPLETED'] } as any,
        startTime: { lte: end },
        endTime: { gte: start },
      } as any,
      select: { employeeId: true, startTime: true, endTime: true, breakMinutes: true, groupId: true },
    }) as Array<{ employeeId: string; startTime: Date; endTime: Date; breakMinutes: number; groupId: string | null }>;

    const minutesByEmployee = new Map<string, number>();
    for (const id of employeeIds) minutesByEmployee.set(id, 0);
    for (const s of existing) {
      const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
      const mins = Math.max(0, Math.trunc(ms / 60000) - Math.max(0, Math.trunc((s as any).breakMinutes || 0)));
      minutesByEmployee.set(s.employeeId, (minutesByEmployee.get(s.employeeId) || 0) + mins);
    }

    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      } as any,
      select: { employeeId: true, startDate: true, endDate: true, resumedAt: true, isAllDay: true, startTime: true, endTime: true },
    }) as Array<{
      employeeId: string;
      startDate: Date;
      endDate: Date;
      resumedAt: Date | null;
      isAllDay: boolean;
      startTime: string | null;
      endTime: string | null;
    }>;

    const leaveByEmployee = new Map<string, typeof leaveRequests>();
    for (const r of leaveRequests) {
      const arr = leaveByEmployee.get(r.employeeId) || [];
      arr.push(r);
      leaveByEmployee.set(r.employeeId, arr);
    }

    const isOnLeave = (employeeId: string, s: Date, e: Date) => {
      const arr = leaveByEmployee.get(employeeId) || [];
      for (const r of arr) {
        const leaveStart = new Date(r.startDate);
        const leaveEnd = new Date(r.resumedAt || r.endDate);
        if (!r.isAllDay) {
          const sameDay = s.toDateString() === leaveStart.toDateString();
          if (sameDay && r.startTime && r.endTime) {
            const [sh, sm] = r.startTime.split(':').map(Number);
            const [eh, em] = r.endTime.split(':').map(Number);
            const t0 = new Date(leaveStart);
            t0.setHours(sh || 0, sm || 0, 0, 0);
            const t1 = new Date(leaveStart);
            t1.setHours(eh || 0, em || 0, 0, 0);
            if (s < t1 && e > t0) return true;
            continue;
          }
        }
        if (s <= leaveEnd && e >= leaveStart) return true;
      }
      return false;
    };

    let assigned = 0;
    for (const shift of targetShifts) {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);
      const shiftLocationId = shift.locationId as string | null;
      const shiftClientId = (shift as any)?.location?.clientId ? String((shift as any).location.clientId) : null;

      const sorted = [...employees].sort((a, b) => {
        const aMins = minutesByEmployee.get(a.id) || 0;
        const bMins = minutesByEmployee.get(b.id) || 0;
        if (aMins !== bMins) return aMins - bMins;
        const aLoc = a.defaultLocationId && shiftLocationId && a.defaultLocationId === shiftLocationId ? 0 : 1;
        const bLoc = b.defaultLocationId && shiftLocationId && b.defaultLocationId === shiftLocationId ? 0 : 1;
        if (aLoc !== bLoc) return aLoc - bLoc;
        const aName = `${a.lastName} ${a.firstName}`;
        const bName = `${b.lastName} ${b.firstName}`;
        return aName.localeCompare(bName);
      });

      let picked: string | null = null;
      for (const emp of sorted) {
        if (isOnLeave(emp.id, shiftStart, shiftEnd)) continue;
        const ok = await this.validateAvailability(emp.id, shiftStart, shiftEnd);
        if (!ok.ok) continue;
        try {
          await this.assertNoShiftOverlap({
            employeeId: emp.id,
            start: shiftStart,
            end: shiftEnd,
            excludeGroupId: (shift as any).groupId || null,
            excludeShiftId: shift.id,
          });
        } catch {
          continue;
        }
        if (clientId && shiftClientId && clientId !== shiftClientId) continue;
        picked = emp.id;
        break;
      }

      if (!picked) continue;

      await this.prisma.shift.update({
        where: { id: shift.id },
        data: { employeeId: picked } as any,
      });

      const ms = shiftEnd.getTime() - shiftStart.getTime();
      const mins = Math.max(0, Math.trunc(ms / 60000) - Math.max(0, Math.trunc((shift as any).breakMinutes || 0)));
      minutesByEmployee.set(picked, (minutesByEmployee.get(picked) || 0) + mins);
      assigned++;
    }

    const total = targetShifts.length;
    const unfilled = total - assigned;
    return { assigned, unfilled, total };
  }

  async getBusinessId(userId: string): Promise<string> {
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) return ownedBusiness.id;

    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) return employee.businessId;

    throw new BadRequestException('User is not associated with a business');
  }

  private async validateAvailability(employeeId: string, start: Date, end?: Date): Promise<{ ok: boolean; message?: string }> {
    const records = await (this.prisma as any).availability.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });
    if (!records || records.length === 0) return { ok: true };
    const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][start.getDay()];
    const applies = (rec: any, date: Date) => {
      const rep = String(rec.repeat || '').toUpperCase();
      if (rep === 'WEEKLY') {
        const days = typeof rec.repeatDays === 'string' ? rec.repeatDays.split(',') : [];
        if (!days.includes(dayKey)) return false;
        if (String(rec.endOption || '').toUpperCase() === 'ENDS_ON' && rec.endOn) {
          if (date > new Date(rec.endOn)) return false;
        }
        return true;
      }
      const sd = rec.startDate ? new Date(rec.startDate) : null;
      const ed = rec.endDate ? new Date(rec.endDate) : null;
      if (!sd) return false;
      const d0 = new Date(sd);
      d0.setHours(0,0,0,0);
      const d1 = new Date(sd);
      d1.setHours(23,59,59,999);
      const sameDay = date.toDateString() === sd.toDateString();
      if (ed) {
        return date >= d0 && date <= ed;
      }
      return sameDay;
    };
    const withinTime = (rec: any, s: Date, e?: Date) => {
      if (!!rec.allDay) return true;
      const sd = new Date(rec.startDate);
      const ed = rec.endDate ? new Date(rec.endDate) : null;
      const startMinutes = sd.getHours()*60 + sd.getMinutes();
      const endMinutes = ed ? (ed.getHours()*60 + ed.getMinutes()) : (23*60+59);
      const sMin = s.getHours()*60 + s.getMinutes();
      const eMin = e ? (e.getHours()*60 + e.getMinutes()) : sMin;
      return sMin >= startMinutes && eMin <= endMinutes;
    };
    const overlapsTime = (rec: any, s: Date, e?: Date) => {
      if (!!rec.allDay) return true;
      const sd = new Date(rec.startDate);
      const ed = rec.endDate ? new Date(rec.endDate) : null;
      const startMinutes = sd.getHours()*60 + sd.getMinutes();
      const endMinutes = ed ? (ed.getHours()*60 + ed.getMinutes()) : (23*60+59);
      const sMin = s.getHours()*60 + s.getMinutes();
      const eMin = e ? (e.getHours()*60 + e.getMinutes()) : sMin;
      return sMin < endMinutes && eMin > startMinutes;
    };
    const availableWindows: Array<{ startMin: number; endMin: number }> = [];
    let blocked = false;
    for (const r of records) {
      if (!applies(r, start)) continue;
      if (r.isAvailable) {
        if (!!r.allDay) {
          availableWindows.push({ startMin: 0, endMin: 24*60-1 });
        } else {
          const sd = new Date(r.startDate);
          const ed = r.endDate ? new Date(r.endDate) : null;
          const startMin = sd.getHours()*60 + sd.getMinutes();
          const endMin = ed ? (ed.getHours()*60 + ed.getMinutes()) : (24*60-1);
          availableWindows.push({ startMin, endMin });
        }
      } else {
        const overlaps = !!r.allDay || overlapsTime(r, start, end);
        if (overlaps) blocked = true;
      }
    }
    const sMin = start.getHours()*60 + start.getMinutes();
    const eMin = end ? (end.getHours()*60 + end.getMinutes()) : sMin;
    const fits = availableWindows.length === 0
      ? !blocked
      : availableWindows.some(w => sMin >= w.startMin && eMin <= w.endMin) && !blocked;
    if (fits) return { ok: true };
    const next = await this.nextAvailable(employeeId, start);
    const msgBase = 'Employee is not available for that period';
    const message = next ? `${msgBase}. Next available: ${next.label}` : msgBase;
    return { ok: false, message };
  }

  private async nextAvailable(employeeId: string, from: Date): Promise<{ date: Date; label: string } | null> {
    const records = await (this.prisma as any).availability.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });
    if (!records || records.length === 0) return null;
    for (let i = 0; i < 30; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const dayKey = ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()];
      const windows: Array<{ startMin: number; endMin: number }> = [];
      for (const r of records) {
        const rep = String(r.repeat || '').toUpperCase();
        const appliesWeekly = rep === 'WEEKLY' && (typeof r.repeatDays === 'string' ? r.repeatDays.split(',').includes(dayKey) : false);
        const appliesOnce = r.startDate && new Date(r.startDate).toDateString() === d.toDateString();
        if (!(appliesWeekly || appliesOnce)) continue;
        if (!r.isAvailable) continue;
        if (!!r.allDay) {
          windows.push({ startMin: 0, endMin: 24*60-1 });
        } else {
          const sd = new Date(r.startDate);
          const ed = r.endDate ? new Date(r.endDate) : null;
          const startMin = sd.getHours()*60 + sd.getMinutes();
          const endMin = ed ? (ed.getHours()*60 + ed.getMinutes()) : (24*60-1);
          windows.push({ startMin, endMin });
        }
      }
      if (windows.length > 0) {
        const w = windows.sort((a,b) => a.startMin - b.startMin)[0];
        const startH = Math.floor(w.startMin/60);
        const startM = w.startMin%60;
        const endH = Math.floor(w.endMin/60);
        const endM = w.endMin%60;
        const fmt = (h: number, m: number) => {
          const hh = ((h%12)||12);
          const mm = m.toString().padStart(2,'0');
          const ap = h >= 12 ? 'PM' : 'AM';
          return `${hh}:${mm} ${ap}`;
        };
        const label = `${d.toDateString()} ${fmt(startH,startM)} - ${fmt(endH,endM)}`;
        return { date: d, label };
      }
    }
    return null;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleShiftReminders() {
    const logger = new Logger('ShiftReminders');
    const now = new Date();
    
    // 1 Hour Reminder (55-65 mins)
    const start1h = new Date(now.getTime() + 55 * 60000);
    const end1h = new Date(now.getTime() + 65 * 60000);
    
    // 30 Min Reminder (25-35 mins)
    const start30m = new Date(now.getTime() + 25 * 60000);
    const end30m = new Date(now.getTime() + 35 * 60000);
    
    // 15 Min Reminder (10-20 mins)
    const start15m = new Date(now.getTime() + 10 * 60000);
    const end15m = new Date(now.getTime() + 20 * 60000);
    
    // 5 Min Before End (4-6 mins from now)
    const endMinus5Start = new Date(now.getTime() + 4 * 60000);
    const endMinus5End = new Date(now.getTime() + 6 * 60000);
    
    // 10 Min After End (5-15 mins ago)
    const endPlus10Start = new Date(now.getTime() - 15 * 60000);
    const endPlus10End = new Date(now.getTime() - 5 * 60000);
    
    // 1 Hour After End
    const endPlus1h = new Date(now.getTime() - 60 * 60000);
    
    try {
        // 1 Hour
        const shifts1h = await this.prisma.shift.findMany({
            where: {
                status: 'PUBLISHED',
                employeeId: { not: null },
                startTime: { gte: start1h, lte: end1h },
                reminderSent1h: false
            } as any,
            include: { employee: { include: { user: true } } }
        });
        
        for (const s of shifts1h) {
            const shift = s as any;
            if (!shift.employee?.user) continue;
            const title = 'Upcoming Shift Reminder';
            const msg = `Your shift starts in about 1 hour at ${new Date(shift.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`;
            await this.sendReminder(shift.employee.user.id, shift.employee.user.email, title, msg, shift.id, '/dashboard/scheduling');
            await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderSent1h: true } as any });
            logger.log(`Sent 1h reminder for shift ${shift.id}`);
        }

        // 30 Min
        const shifts30m = await this.prisma.shift.findMany({
            where: {
                status: 'PUBLISHED',
                employeeId: { not: null },
                startTime: { gte: start30m, lte: end30m },
                reminderSent30m: false
            } as any,
            include: { employee: { include: { user: true } } }
        });
        
        for (const s of shifts30m) {
            const shift = s as any;
            if (!shift.employee?.user) continue;
            const title = 'Shift Starts Soon';
            const msg = `Your shift starts in 30 minutes. Please be prepared and on site.`;
            await this.sendReminder(shift.employee.user.id, shift.employee.user.email, title, msg, shift.id, '/dashboard/scheduling');
            await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderSent30m: true } as any });
            logger.log(`Sent 30m reminder for shift ${shift.id}`);
        }

        // 15 Min
        const shifts15m = await this.prisma.shift.findMany({
            where: {
                status: 'PUBLISHED',
                employeeId: { not: null },
                startTime: { gte: start15m, lte: end15m },
                reminderSent10m: false
            } as any,
            include: { employee: { include: { user: true } } }
        });
        
        for (const s of shifts15m) {
            const shift = s as any;
            if (!shift.employee?.user) continue;
            const title = 'Clock In Reminder';
            const msg = `Your shift starts in 15 minutes. Please get ready to clock in on time.`;
            await this.sendReminder(shift.employee.user.id, shift.employee.user.email, title, msg, shift.id, '/dashboard/time');
            await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderSent10m: true } as any });
            logger.log(`Sent 15m reminder for shift ${shift.id}`);
        }

        // Every 5 minutes after shift start until the employee clocks in
        const missedClockInShifts = await this.prisma.shift.findMany({
            where: {
                status: 'PUBLISHED',
                employeeId: { not: null },
                startTime: { lte: now },
                endTime: { gt: now }
            } as any,
            include: { employee: { include: { user: true } }, location: true } as any
        });

        for (const s of missedClockInShifts) {
            const shift = s as any;
            if (!shift.employeeId || !shift.employee?.user) continue;

            const shiftStart = new Date(shift.startTime);
            const shiftEnd = new Date(shift.endTime);
            const preShiftWindow = new Date(shiftStart.getTime() - 6 * 60 * 60000);

            const activeOrCompletedTimesheet = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId: shift.employeeId,
                    startTime: {
                        gte: preShiftWindow,
                        lte: shiftEnd
                    }
                },
                orderBy: { startTime: 'desc' }
            });
            if (activeOrCompletedTimesheet) continue;

            const minutesLate = Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / 60000));
            if (minutesLate === 0 || minutesLate % 5 !== 0) continue;

            const recentReminder = await this.prisma.auditLog.findFirst({
                where: {
                    action: 'MISSED_CLOCK_IN_REMINDER',
                    resource: 'SHIFT',
                    resourceId: shift.id,
                    createdAt: { gte: new Date(now.getTime() - 4 * 60 * 1000) }
                } as any,
                orderBy: { createdAt: 'desc' }
            });
            if (recentReminder) continue;

            const locationLabel = shift.location?.name ? ` at ${shift.location.name}` : '';
            const title = 'Clock In Required';
            const msg = `Your shift started ${minutesLate} minute${minutesLate === 1 ? '' : 's'} ago${locationLabel}. Please clock in now.`;
            await this.sendReminder(shift.employee.user.id, shift.employee.user.email || null, title, msg, shift.id, '/dashboard/time');
            await this.prisma.auditLog.create({
                data: {
                    businessId: shift.businessId,
                    userId: null,
                    action: 'MISSED_CLOCK_IN_REMINDER',
                    resource: 'SHIFT',
                    resourceId: shift.id,
                    details: JSON.stringify({ employeeId: shift.employeeId, minutesLate })
                } as any
            });
            logger.log(`Sent missed clock-in reminder for shift ${shift.id} at ${minutesLate} minutes late`);
        }

        // 5 minutes before shift ends: remind to clock out
        const end5mShifts = await this.prisma.shift.findMany({
            where: {
                status: 'PUBLISHED',
                employeeId: { not: null },
                endTime: { gte: endMinus5Start, lte: endMinus5End },
                reminderEnd5mSent: false
            } as any,
            include: { employee: { include: { user: true } } }
        });
        for (const s of end5mShifts) {
            const shift = s as any;
            if (!shift.employee?.user) continue;
            const title = 'Shift Ending Soon';
            const msg = `Your shift ends in 5 minutes. Please prepare to clock out.`;
            await this.sendReminder(shift.employee.user.id, shift.employee.user.email, title, msg, shift.id, '/dashboard/time');
            await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderEnd5mSent: true } as any });
            logger.log(`Sent 5m-before-end reminder for shift ${shift.id}`);
        }

        // 10 minutes after end: if still clocked in, remind to clock out
        const endLate10mShifts = await this.prisma.shift.findMany({
            where: {
                status: 'PUBLISHED',
                employeeId: { not: null },
                endTime: { gte: endPlus10Start, lte: endPlus10End },
                reminderEndLate10mSent: false
            } as any,
            include: { employee: true }
        });
        for (const s of endLate10mShifts) {
            const shift = s as any;
            if (!shift.employeeId) continue;
            const activeTs = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId: shift.employeeId,
                    endTime: null,
                    startTime: { lte: shift.endTime }
                },
                orderBy: { startTime: 'desc' }
            });
            if (activeTs) {
                const employee = await this.prisma.employee.findUnique({ where: { id: shift.employeeId }, include: { user: true } });
                if (employee?.user) {
                    const title = 'Clock Out Reminder';
                    const msg = `Your scheduled shift ended 10 minutes ago. Please clock out.`;
                    await this.sendReminder(employee.user.id, employee.user.email || null, title, msg, shift.id, '/dashboard/time');
                    await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderEndLate10mSent: true } as any });
                    logger.log(`Sent 10m-after-end reminder for shift ${shift.id}`);
                }
            }
        }

        // 1 hour after end: if still clocked in, auto clock out
        const end1hShifts = await this.prisma.shift.findMany({
            where: {
                status: 'PUBLISHED',
                employeeId: { not: null },
                endTime: { lte: endPlus1h },
                autoClockout1hDone: false
            } as any
        });
        for (const s of end1hShifts) {
            const shift = s as any;
            if (!shift.employeeId) continue;
            const activeTs = await this.prisma.timesheet.findFirst({
                where: {
                    employeeId: shift.employeeId,
                    endTime: null
                },
                orderBy: { startTime: 'desc' }
            });
            if (activeTs) {
                // End any active break first
                const activeBreak = await this.prisma.break.findFirst({
                    where: { timesheetId: activeTs.id, endTime: null }
                });
                if (activeBreak) {
                    await this.prisma.break.update({
                        where: { id: activeBreak.id },
                        data: { endTime: new Date(shift.endTime) }
                    });
                }
                const autoEnd = new Date(new Date(shift.endTime).getTime() + 60 * 60000);
                await this.prisma.timesheet.update({
                    where: { id: activeTs.id },
                    data: {
                        endTime: autoEnd,
                        status: 'PENDING',
                        employeeNote: (activeTs.employeeNote ? activeTs.employeeNote + '\n' : '') + '[System] Auto-clocked out 1 hour after scheduled end.'
                    }
                });
                await this.prisma.shift.update({ where: { id: shift.id }, data: { autoClockout1hDone: true } as any });
                logger.log(`Auto-clocked out employee ${shift.employeeId} for shift ${shift.id}`);
            }
        }

        const openSoonStart = new Date(now.getTime() + 30 * 60000);
        const openSoonEnd = new Date(now.getTime() + 90 * 60000);
        const openShifts = await this.prisma.shift.findMany({
          where: {
            status: 'OPEN',
            startTime: { gte: openSoonStart, lte: openSoonEnd }
          } as any,
          include: { location: true } as any
        });

        for (const s of openShifts) {
          const shift = s as any;
          const recent = await this.prisma.auditLog.findFirst({
            where: {
              action: 'OPEN_SHIFT_REMINDER',
              resource: 'SHIFT',
              resourceId: shift.id,
              createdAt: { gte: new Date(now.getTime() - 2 * 60 * 60000) }
            } as any,
            orderBy: { createdAt: 'desc' }
          });
          if (recent) continue;

          const supervisors = await this.getAdminUsersForBusiness(shift.businessId);
          const title = 'Unfilled shift reminder';
          const locLabel = shift.location?.name ? ` @ ${shift.location.name}` : '';
          const msg = `Open shift starts soon: ${new Date(shift.startTime).toLocaleString()}${locLabel}.`;
          for (const sup of supervisors) {
            await this.notifications.createNotification(sup.id, 'WARNING', title, msg, { shiftId: shift.id });
            await this.notifications.sendPush(sup.id, { type: 'WARNING', title, message: msg, metadata: { shiftId: shift.id } });
            await this.push.send(sup.id, { type: 'WARNING', title, message: msg, metadata: { shiftId: shift.id }, actionUrl: '/dashboard/scheduling' });
          }

          await this.prisma.auditLog.create({
            data: {
              businessId: shift.businessId,
              userId: null,
              action: 'OPEN_SHIFT_REMINDER',
              resource: 'SHIFT',
              resourceId: shift.id,
              details: JSON.stringify({ windowMinutes: 60 })
            }
          });
        }

    } catch (e) {
        logger.error('Error sending shift reminders', e);
    }
  }

  async getMyAvailability(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) return [];

    const records = await (this.prisma as any).availability.findMany({
      where: { employeeId: employee.id, repeat: 'WEEKLY' }
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMapShort: Record<string, string> = { 'Sun': 'Sunday', 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday' };

    const uiData = days.map(d => ({ day: d, available: false, start: '', end: '' }));

    for (const r of records) {
        if (!r.isAvailable) continue;
        // repeatDays might be comma separated, but for this simple UI we assume one record per day
        const dayKeys = (r.repeatDays || '').split(',');
        for (const key of dayKeys) {
            const fullDay = dayMapShort[key];
            if (!fullDay) continue;

            const item = uiData.find(d => d.day === fullDay);
            if (item) {
                item.available = true;
                if (r.allDay) {
                    item.start = '';
                    item.end = '';
                } else {
                    item.start = new Date(r.startDate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                    item.end = r.endDate ? new Date(r.endDate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '';
                }
            }
        }
    }

    // Shift Sunday to end to match UI (Mon-Sun)
    const sunday = uiData.shift();
    if (sunday) uiData.push(sunday);

    return uiData;
  }

  async updateMyAvailability(userId: string, availabilityData: any[]) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('Employee profile not found');

    // Delete existing weekly availability
    await (this.prisma as any).availability.deleteMany({
      where: { employeeId: employee.id, repeat: 'WEEKLY' }
    });

    const dayMap: any = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 };
    const shortDayMap: any = { 'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun' };

    for (const item of availabilityData) {
      if (!item.available) continue;

      const targetDay = dayMap[item.day];
      const shortDay = shortDayMap[item.day];
      
      // Calculate next occurrence
      const now = new Date();
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7;

      const startBase = new Date(now);
      startBase.setDate(startBase.getDate() + daysUntil);

      let startDateTime = new Date(startBase);
      let endDateTime = new Date(startBase);
      let allDay = false;

      if (item.start && item.end) {
          const [sh, sm] = item.start.split(':');
          startDateTime.setHours(parseInt(sh), parseInt(sm), 0, 0);

          const [eh, em] = item.end.split(':');
          endDateTime.setHours(parseInt(eh), parseInt(em), 0, 0);
      } else {
          allDay = true;
          startDateTime.setHours(0, 0, 0, 0);
          endDateTime.setHours(23, 59, 59, 999);
      }

      await (this.prisma as any).availability.create({
        data: {
          employeeId: employee.id,
          isAvailable: true,
          startDate: startDateTime,
          endDate: endDateTime,
          allDay: allDay,
          repeat: 'WEEKLY',
          repeatDays: shortDay,
          endOption: 'NO_END'
        }
      });
    }
    return { success: true };
  }

  private async sendReminder(userId: string, email: string | null, title: string, message: string, shiftId: string, actionUrl: string) {
      await this.notifications.createNotification(userId, 'INFO', title, message, { shiftId });
      await this.notifications.sendPush(userId, { type: 'INFO', title, message, metadata: { shiftId } });
      await this.push.send(userId, { type: 'INFO', title, message, metadata: { shiftId }, actionUrl });
      if (email) {
          await this.notifications.sendEmail(email, title, message);
      }
  }

}
