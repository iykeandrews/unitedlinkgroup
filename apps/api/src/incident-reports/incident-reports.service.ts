import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as XLSX from 'xlsx';

@Injectable()
export class IncidentReportsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  private getUserId(user: any): string {
    return user.userId || user.sub || user.id;
  }

  private async validateBusinessAccess(targetBusinessId: string, user: any) {
    if (user.role === 'SUPER_ADMIN') return;
    
    // Check if user owns the business
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: this.getUserId(user) } });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    // Check if user is an employee of the business
    const employee = await this.prisma.employee.findFirst({ 
        where: { userId: this.getUserId(user), businessId: targetBusinessId } 
    });
    if (employee) return;

    throw new BadRequestException('Access denied: You do not have access to this business data');
  }

  private async getBusinessId(user: any): Promise<string> {
    const userId = this.getUserId(user);
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) return employee.businessId;

    const business = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (business) return business.id;

    throw new BadRequestException('User is not associated with a business');
  }

  private async resolveBusinessId(user: any, businessIdHeader?: string): Promise<string> {
    let businessId = businessIdHeader;
    if (!businessId || user.role !== 'SUPER_ADMIN') {
        businessId = await this.getBusinessId(user);
    }
    
    if (user.role === 'SUPER_ADMIN' && !businessId) {
        throw new BadRequestException('Business context required for Super Admin');
    }
    return businessId;
  }

  private async generateReportNumber(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    for (let attempt = 0; attempt < 5; attempt++) {
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const reportNumber = `IR-${y}${m}${d}-${rand}`;
      const existing = await this.prisma.incidentReport.findFirst({ where: { reportNumber } });
      if (!existing) return reportNumber;
    }
    return `IR-${Date.now()}`;
  }

  private parseIsoDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  private parseSearchDayRange(value: string): { start: Date; end: Date } | null {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!isoDay) return null;
    const year = Number(isoDay[1]);
    const month = Number(isoDay[2]);
    const day = Number(isoDay[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  async create(
    data: CreateIncidentReportDto,
    user: any,
    businessIdHeader?: string,
    context?: { userAgent?: string }
  ) {
    const businessId = await this.resolveBusinessId(user, businessIdHeader);
    await this.validateBusinessAccess(businessId, user);

    const submittedById = this.getUserId(user);

    const userEmployee = await this.prisma.employee.findFirst({
      where: { userId: submittedById, businessId },
    });

    let reportingOfficerEmployeeId: string | undefined = data.reportingOfficerEmployeeId || undefined;
    if (user.role === 'EMPLOYEE') {
      if (!userEmployee) throw new BadRequestException('Employee profile not found');
      if (data.reportingOfficerEmployeeId && data.reportingOfficerEmployeeId !== userEmployee.id) {
        throw new BadRequestException('Employees cannot submit reports for other officers');
      }
      reportingOfficerEmployeeId = userEmployee.id;
    } else {
      if (!reportingOfficerEmployeeId && userEmployee) {
        reportingOfficerEmployeeId = userEmployee.id;
      }
    }

    if (reportingOfficerEmployeeId) {
      const officer = await this.prisma.employee.findFirst({
        where: { id: reportingOfficerEmployeeId, businessId, status: 'ACTIVE' },
      });
      if (!officer) throw new BadRequestException('Reporting officer not found or not active');
    }

    if (data.assignedSupervisorId) {
      const supervisor = await this.prisma.employee.findFirst({
        where: { id: data.assignedSupervisorId, businessId, status: 'ACTIVE' },
      });
      if (!supervisor) throw new BadRequestException('Assigned supervisor not found or not active');
    }

    const incidentAt = this.parseIsoDate(data.incidentAt || data.date) || null;
    const reportNumber = await this.generateReportNumber();

    const { images, persons, evidenceCollected, incidentAt: _incidentAt, date: _date, deviceInfo: clientDeviceInfo, geoLat, geoLng, ...rest } = data;

    const deviceInfo = JSON.stringify({
      userAgent: context?.userAgent || null,
      submittedByRole: user.role || null,
      client: clientDeviceInfo || null,
    });

    let resolvedLocationId: string | undefined = rest.locationId || undefined;
    if (user.role === 'EMPLOYEE') {
      if (!userEmployee) throw new BadRequestException('Employee profile not found');
      const activeTimesheet = await this.prisma.timesheet.findFirst({
        where: { employeeId: userEmployee.id, endTime: null },
        orderBy: { startTime: 'desc' },
        select: { id: true, locationId: true },
      });

      if (!activeTimesheet?.locationId) {
        throw new BadRequestException('You must be clocked in at a site to submit an incident report');
      }
      resolvedLocationId = activeTimesheet.locationId;
    }

    if (resolvedLocationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: resolvedLocationId },
        select: { id: true, businessId: true },
      });
      if (!location || location.businessId !== businessId) {
        throw new BadRequestException('Invalid incident location for this business');
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const incident = await tx.incidentReport.create({
        data: {
          ...rest,
          reportNumber,
          businessId,
          reporterId: submittedById,
          submittedById,
          reportingOfficerEmployeeId,
          assignedSupervisorId: data.assignedSupervisorId || undefined,
          images: images ? JSON.stringify(images) : undefined,
          evidenceCollected: evidenceCollected ? JSON.stringify(evidenceCollected) : undefined,
          date: incidentAt ?? new Date(),
          incidentAt: incidentAt ?? undefined,
          deviceInfo,
          geoLat: typeof geoLat === 'number' ? geoLat : undefined,
          geoLng: typeof geoLng === 'number' ? geoLng : undefined,
          locationId: resolvedLocationId,
        },
        include: {
          location: true,
          reporter: true,
          submittedBy: true,
          reportingOfficer: true,
          assignedSupervisor: true,
          assignedInvestigator: true,
          evidence: true,
          persons: true,
          timeline: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (persons?.length) {
        await tx.incidentPerson.createMany({
          data: persons.map((p) => ({
            incidentId: incident.id,
            role: p.role,
            name: p.name,
            contactInfo: p.contactInfo || null,
          })),
        });
      }

      await tx.incidentTimelineEvent.create({
        data: {
          incidentId: incident.id,
          eventType: 'CREATED',
          actorUserId: submittedById,
          payload: JSON.stringify({
            status: incident.status,
            severity: incident.severity,
            reportingOfficerEmployeeId: reportingOfficerEmployeeId || null,
          }),
        },
      });

      return tx.incidentReport.findUnique({
        where: { id: incident.id },
        include: {
          location: true,
          reporter: true,
          submittedBy: true,
          reportingOfficer: true,
          assignedSupervisor: true,
          assignedInvestigator: true,
          evidence: true,
          persons: true,
          timeline: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    if (!created) throw new BadRequestException('Failed to create incident report');

    if (created.severity === 'CRITICAL') {
      const business = await this.prisma.business.findUnique({ where: { id: businessId } });
      const managerEmployees = await this.prisma.employee.findMany({
        where: { businessId, role: { in: ['BUSINESS_ADMIN', 'MANAGER'] }, userId: { not: null } } as any,
        select: { userId: true },
      });
      const recipientUserIds = new Set<string>();
      if (business?.ownerId) recipientUserIds.add(business.ownerId);
      managerEmployees.forEach((e) => e.userId && recipientUserIds.add(e.userId));
      for (const uid of recipientUserIds) {
        await this.notifications.createNotification(
          uid,
          'CRITICAL',
          'Critical incident reported',
          `${created.title} (${created.reportNumber || created.id})`,
          { incidentId: created.id, reportNumber: created.reportNumber, severity: created.severity }
        );
        await this.notifications.sendPush(uid, {
          type: 'CRITICAL',
          title: 'Critical incident reported',
          message: `${created.title}`,
          metadata: { incidentId: created.id },
        });
      }
    }

    return created;
  }

  async findAll(
    user: any,
    businessIdHeader?: string,
    query?: {
      page?: number;
      pageSize?: number;
      search?: string;
      locationId?: string;
      type?: string;
      severity?: string;
      status?: string;
      reportingOfficerEmployeeId?: string;
      from?: string;
      to?: string;
    }
  ) {
    let businessId = businessIdHeader;
    if (!businessId || user.role !== 'SUPER_ADMIN') {
      try {
        businessId = await this.getBusinessId(user);
      } catch (e) {
        if (user.role === 'SUPER_ADMIN') return { items: [], total: 0, page: 1, pageSize: 20 };
        throw e;
      }
    }

    if (!businessId) return { items: [], total: 0, page: 1, pageSize: 20 };

    await this.validateBusinessAccess(businessId, user);

    const page = Math.max(1, query?.page || 1);
    const pageSize = Math.min(100, Math.max(5, query?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = { businessId };
    if (query?.locationId) where.locationId = query.locationId;
    if (query?.type) where.type = query.type;
    if (query?.severity) where.severity = query.severity;
    if (query?.status) where.status = query.status;
    if (query?.reportingOfficerEmployeeId) where.reportingOfficerEmployeeId = query.reportingOfficerEmployeeId;

    const fromDate = this.parseIsoDate(query?.from || null);
    const toDate = this.parseIsoDate(query?.to || null);
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = fromDate;
      if (toDate) where.date.lte = toDate;
    }

    if (query?.search) {
      const s = query.search.trim();
      if (s) {
        const createdAtRange = this.parseSearchDayRange(s);
        where.OR = [
          { title: { contains: s, mode: 'insensitive' } },
          { description: { contains: s, mode: 'insensitive' } },
          { reportNumber: { contains: s, mode: 'insensitive' } },
          {
            submittedBy: {
              is: {
                OR: [
                  { firstName: { contains: s, mode: 'insensitive' } },
                  { lastName: { contains: s, mode: 'insensitive' } },
                  { email: { contains: s, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            reportingOfficer: {
              is: {
                OR: [
                  { firstName: { contains: s, mode: 'insensitive' } },
                  { lastName: { contains: s, mode: 'insensitive' } },
                ],
              },
            },
          },
          ...(createdAtRange ? [{ createdAt: { gte: createdAtRange.start, lt: createdAtRange.end } }] : []),
        ];
      }
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.incidentReport.count({ where }),
      this.prisma.incidentReport.findMany({
        where,
        include: {
          location: true,
          submittedBy: true,
          reportingOfficer: true,
          assignedSupervisor: true,
          assignedInvestigator: true,
          evidence: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string, user: any) {
    const report = await this.prisma.incidentReport.findUnique({
        where: { id },
        include: {
          location: true,
          reporter: true,
          submittedBy: true,
          reportingOfficer: true,
          assignedSupervisor: true,
          assignedInvestigator: true,
          persons: true,
          evidence: true,
          timeline: { orderBy: { createdAt: 'asc' } }
        }
    });

    if (!report) throw new NotFoundException('Incident report not found');

    await this.validateBusinessAccess(report.businessId, user);
    return report;
  }

  async update(id: string, data: Partial<CreateIncidentReportDto>, user: any) {
    const report = await this.prisma.incidentReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Incident report not found');

    await this.validateBusinessAccess(report.businessId, user);

    const userId = this.getUserId(user);
    const { images, persons, evidenceCollected, incidentAt, date, deviceInfo: clientDeviceInfo, geoLat, geoLng, ...rest } = data;
    const nextIncidentAt = this.parseIsoDate(incidentAt || date) || null;
    const nextEvidenceCollected = evidenceCollected ? JSON.stringify(evidenceCollected) : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const beforeStatus = report.status;
      const updatedIncident = await tx.incidentReport.update({
        where: { id },
        data: {
          ...rest,
          images: images ? JSON.stringify(images) : undefined,
          evidenceCollected: nextEvidenceCollected,
          date: nextIncidentAt ?? undefined,
          incidentAt: nextIncidentAt ?? undefined,
          deviceInfo: clientDeviceInfo ? clientDeviceInfo : undefined,
          geoLat: typeof geoLat === 'number' ? geoLat : undefined,
          geoLng: typeof geoLng === 'number' ? geoLng : undefined,
        },
        include: {
          location: true,
          reporter: true,
          submittedBy: true,
          reportingOfficer: true,
          assignedSupervisor: true,
          assignedInvestigator: true,
          persons: true,
          evidence: true,
          timeline: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (persons) {
        await tx.incidentPerson.deleteMany({ where: { incidentId: id } });
        if (persons.length) {
          await tx.incidentPerson.createMany({
            data: persons.map((p) => ({
              incidentId: id,
              role: p.role,
              name: p.name,
              contactInfo: p.contactInfo || null,
            })),
          });
        }
      }

      const eventType = beforeStatus !== updatedIncident.status ? 'STATUS_CHANGED' : 'UPDATED';
      await tx.incidentTimelineEvent.create({
        data: {
          incidentId: id,
          eventType,
          actorUserId: userId,
          payload: JSON.stringify({
            before: { status: beforeStatus },
            after: { status: updatedIncident.status },
          }),
        },
      });

      return tx.incidentReport.findUnique({
        where: { id },
        include: {
          location: true,
          reporter: true,
          submittedBy: true,
          reportingOfficer: true,
          assignedSupervisor: true,
          assignedInvestigator: true,
          persons: true,
          evidence: true,
          timeline: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    if (!updated) throw new BadRequestException('Failed to update incident report');

    if (report.status !== updated.status && updated.status === 'ESCALATED') {
      const business = await this.prisma.business.findUnique({ where: { id: report.businessId } });
      const managerEmployees = await this.prisma.employee.findMany({
        where: { businessId: report.businessId, role: { in: ['BUSINESS_ADMIN', 'MANAGER'] }, userId: { not: null } } as any,
        select: { userId: true },
      });
      const recipientUserIds = new Set<string>();
      if (business?.ownerId) recipientUserIds.add(business.ownerId);
      managerEmployees.forEach((e) => e.userId && recipientUserIds.add(e.userId));
      for (const uid of recipientUserIds) {
        await this.notifications.createNotification(
          uid,
          'WARNING',
          'Incident escalated',
          `${updated.title} (${updated.reportNumber || updated.id})`,
          { incidentId: updated.id, reportNumber: updated.reportNumber, status: updated.status }
        );
        await this.notifications.sendPush(uid, {
          type: 'WARNING',
          title: 'Incident escalated',
          message: `${updated.title}`,
          metadata: { incidentId: updated.id },
        });
      }
    }

    return updated;
  }

  async remove(id: string, user: any) {
    const report = await this.prisma.incidentReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Incident report not found');

    await this.validateBusinessAccess(report.businessId, user);

    return this.prisma.incidentReport.delete({ where: { id } });
  }

  async addInvestigationNote(id: string, user: any, note: string) {
    const incident = await this.findOne(id, user);
    const userId = this.getUserId(user);
    await this.prisma.incidentTimelineEvent.create({
      data: {
        incidentId: incident.id,
        eventType: 'NOTE_ADDED',
        actorUserId: userId,
        payload: JSON.stringify({ note }),
      },
    });
    return { ok: true };
  }

  async assignInvestigator(id: string, user: any, investigatorEmployeeId: string) {
    const incident = await this.prisma.incidentReport.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident report not found');
    await this.validateBusinessAccess(incident.businessId, user);

    const target = await this.prisma.employee.findFirst({
      where: { id: investigatorEmployeeId, businessId: incident.businessId, status: 'ACTIVE' },
      include: { user: true },
    });
    if (!target) throw new BadRequestException('Investigator not found or not active');

    const userId = this.getUserId(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.incidentReport.update({
        where: { id },
        data: { assignedInvestigatorId: investigatorEmployeeId },
      });
      await tx.incidentTimelineEvent.create({
        data: {
          incidentId: id,
          eventType: 'INVESTIGATOR_ASSIGNED',
          actorUserId: userId,
          payload: JSON.stringify({ investigatorEmployeeId }),
        },
      });
    });

    if (target.userId) {
      await this.notifications.createNotification(
        target.userId,
        'INFO',
        'Incident assigned',
        `You were assigned to investigate incident ${incident.reportNumber || incident.id}`,
        { incidentId: incident.id }
      );
      await this.notifications.sendPush(target.userId, {
        type: 'INFO',
        title: 'Incident assigned',
        message: `Incident ${incident.reportNumber || incident.id}`,
        metadata: { incidentId: incident.id },
      });
    }

    return { ok: true };
  }

  async addEvidence(
    id: string,
    user: any,
    file: { url: string; filename: string; originalName: string; mimeType?: string; sizeBytes?: number }
  ) {
    const incident = await this.prisma.incidentReport.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident report not found');
    await this.validateBusinessAccess(incident.businessId, user);

    const userId = this.getUserId(user);
    const mimeType = file.mimeType || '';
    const kind =
      mimeType.startsWith('image/')
        ? 'IMAGE'
        : mimeType.startsWith('video/')
          ? 'VIDEO'
          : mimeType.startsWith('audio/')
            ? 'AUDIO'
            : 'DOCUMENT';

    const created = await this.prisma.$transaction(async (tx) => {
      const evidence = await tx.incidentEvidence.create({
        data: {
          incidentId: id,
          kind,
          url: file.url,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType || null,
          sizeBytes: typeof file.sizeBytes === 'number' ? file.sizeBytes : null,
          uploadedById: userId,
        },
      });

      await tx.incidentTimelineEvent.create({
        data: {
          incidentId: id,
          eventType: 'EVIDENCE_ADDED',
          actorUserId: userId,
          payload: JSON.stringify({
            evidenceId: evidence.id,
            kind,
            url: file.url,
            originalName: file.originalName,
          }),
        },
      });

      return evidence;
    });

    return created;
  }

  async getSummaryByLocation(user: any, businessIdHeader?: string, status?: string) {
    const businessId = await this.resolveBusinessId(user, businessIdHeader);
    await this.validateBusinessAccess(businessId, user);

    const normalizedStatus = (status || 'ACTIVE').toUpperCase();
    const locationWhere: any = { businessId };
    if (normalizedStatus !== 'ALL') {
      locationWhere.status = normalizedStatus;
    }

    const locations = await this.prisma.location.findMany({
      where: locationWhere,
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    });

    const incidents = await this.prisma.incidentReport.findMany({
      where: { businessId },
      select: { id: true, locationId: true, severity: true, status: true, date: true },
    });

    const byLoc = new Map<string, any>();
    for (const l of locations) {
      byLoc.set(l.id, {
        locationId: l.id,
        locationName: l.name,
        locationStatus: l.status,
        totalIncidents: 0,
        openIncidents: 0,
        criticalIncidents: 0,
        lastIncidentDate: null as string | null,
        assignedSecurityTeam: [] as any[],
      });
    }

    for (const inc of incidents) {
      if (!inc.locationId) continue;
      const entry = byLoc.get(inc.locationId);
      if (!entry) continue;
      entry.totalIncidents += 1;
      if (inc.status && ['OPEN', 'REPORTED', 'UNDER_INVESTIGATION', 'ESCALATED'].includes(inc.status)) entry.openIncidents += 1;
      if (inc.severity === 'CRITICAL') entry.criticalIncidents += 1;
      const dt = inc.date ? new Date(inc.date).toISOString() : null;
      if (dt && (!entry.lastIncidentDate || dt > entry.lastIncidentDate)) entry.lastIncidentDate = dt;
    }

    const team = await this.prisma.employee.findMany({
      where: { businessId, status: 'ACTIVE', defaultLocationId: { not: null } } as any,
      select: { id: true, firstName: true, lastName: true, badgeNumber: true, defaultLocationId: true },
    });
    for (const e of team) {
      const locId = (e as any).defaultLocationId as string | null;
      if (!locId) continue;
      const entry = byLoc.get(locId);
      if (!entry) continue;
      entry.assignedSecurityTeam.push({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        badgeNumber: (e as any).badgeNumber || null,
      });
    }

    return Array.from(byLoc.values());
  }

  async getAnalytics(user: any, businessIdHeader?: string, period: 'daily' | 'weekly' | 'monthly' = 'weekly') {
    const businessId = await this.resolveBusinessId(user, businessIdHeader);
    await this.validateBusinessAccess(businessId, user);

    const incidents = await this.prisma.incidentReport.findMany({
      where: { businessId },
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        date: true,
        locationId: true,
        reportingOfficerEmployeeId: true,
      },
      orderBy: { date: 'asc' },
    });

    const trendMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    const sevMap = new Map<string, number>();
    const locMap = new Map<string, number>();
    const officerMap = new Map<string, number>();

    const keyForDate = (d: Date) => {
      if (period === 'daily') return d.toISOString().slice(0, 10);
      if (period === 'monthly') return d.toISOString().slice(0, 7);
      const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const day = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() - day + 1);
      return tmp.toISOString().slice(0, 10);
    };

    for (const inc of incidents) {
      const d = inc.date ? new Date(inc.date) : null;
      if (d) {
        const k = keyForDate(d);
        trendMap.set(k, (trendMap.get(k) || 0) + 1);
      }
      typeMap.set(inc.type || 'UNKNOWN', (typeMap.get(inc.type || 'UNKNOWN') || 0) + 1);
      sevMap.set(inc.severity || 'UNKNOWN', (sevMap.get(inc.severity || 'UNKNOWN') || 0) + 1);
      if (inc.locationId) locMap.set(inc.locationId, (locMap.get(inc.locationId) || 0) + 1);
      if (inc.reportingOfficerEmployeeId) officerMap.set(inc.reportingOfficerEmployeeId, (officerMap.get(inc.reportingOfficerEmployeeId) || 0) + 1);
    }

    const locations = await this.prisma.location.findMany({
      where: { businessId },
      select: { id: true, name: true },
    });
    const locationNameMap = new Map(locations.map((l) => [l.id, l.name]));

    const officers = await this.prisma.employee.findMany({
      where: { businessId },
      select: { id: true, firstName: true, lastName: true, badgeNumber: true },
    });
    const officerNameMap = new Map(officers.map((o) => [o.id, { name: `${o.firstName} ${o.lastName}`.trim(), badgeNumber: (o as any).badgeNumber || null }]));

    return {
      trend: Array.from(trendMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count })),
      byType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
      bySeverity: Array.from(sevMap.entries()).map(([severity, count]) => ({ severity, count })),
      byLocation: Array.from(locMap.entries()).map(([locationId, count]) => ({ locationId, locationName: locationNameMap.get(locationId) || locationId, count })),
      byOfficer: Array.from(officerMap.entries()).map(([employeeId, count]) => {
        const meta = officerNameMap.get(employeeId);
        return { employeeId, officerName: meta?.name || employeeId, badgeNumber: meta?.badgeNumber || null, count };
      }),
    };
  }

  async exportIncidents(
    user: any,
    businessIdHeader: string | undefined,
    format: 'csv' | 'xlsx',
    query?: {
      search?: string;
      locationId?: string;
      type?: string;
      severity?: string;
      status?: string;
      reportingOfficerEmployeeId?: string;
      from?: string;
      to?: string;
    }
  ) {
    const businessId = await this.resolveBusinessId(user, businessIdHeader);
    await this.validateBusinessAccess(businessId, user);

    const where: any = { businessId };
    if (query?.locationId) where.locationId = query.locationId;
    if (query?.type) where.type = query.type;
    if (query?.severity) where.severity = query.severity;
    if (query?.status) where.status = query.status;
    if (query?.reportingOfficerEmployeeId) where.reportingOfficerEmployeeId = query.reportingOfficerEmployeeId;

    const fromDate = this.parseIsoDate(query?.from || null);
    const toDate = this.parseIsoDate(query?.to || null);
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = fromDate;
      if (toDate) where.date.lte = toDate;
    }

    if (query?.search) {
      const s = query.search.trim();
      if (s) {
        where.OR = [
          { title: { contains: s, mode: 'insensitive' } },
          { description: { contains: s, mode: 'insensitive' } },
          { reportNumber: { contains: s, mode: 'insensitive' } },
        ];
      }
    }

    const incidents = await this.prisma.incidentReport.findMany({
      where,
      include: {
        location: true,
        reportingOfficer: true,
        assignedSupervisor: true,
        assignedInvestigator: true,
        submittedBy: true,
        evidence: true,
        persons: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const rows = incidents.map((i: any) => {
      const officer = i.reportingOfficer ? `${i.reportingOfficer.firstName} ${i.reportingOfficer.lastName}`.trim() : '';
      const officerBadge = i.reportingOfficer?.badgeNumber || '';
      const submittedBy = i.submittedBy ? `${i.submittedBy.firstName || ''} ${i.submittedBy.lastName || ''}`.trim() || i.submittedBy.email : '';
      const supervisor = i.assignedSupervisor ? `${i.assignedSupervisor.firstName} ${i.assignedSupervisor.lastName}`.trim() : '';
      const investigator = i.assignedInvestigator ? `${i.assignedInvestigator.firstName} ${i.assignedInvestigator.lastName}`.trim() : '';
      let evidenceCollected = '';
      try {
        const parsed = i.evidenceCollected ? JSON.parse(i.evidenceCollected) : [];
        evidenceCollected = Array.isArray(parsed) ? parsed.join(' | ') : '';
      } catch {}
      const persons = (i.persons || []).map((p: any) => `${p.role}:${p.name}${p.contactInfo ? `(${p.contactInfo})` : ''}`).join(' | ');
      const evidenceUrls = (i.evidence || []).map((e: any) => e.url).join(' | ');

      return {
        reportNumber: i.reportNumber || i.id,
        title: i.title,
        incidentType: i.type,
        severity: i.severity,
        status: i.status,
        incidentAt: (i.incidentAt || i.date)?.toISOString?.() || '',
        reportedAt: i.reportedAt?.toISOString?.() || '',
        shift: i.shift || '',
        buildingArea: i.buildingArea || '',
        location: i.location?.name || '',
        reportingOfficer: officer,
        reportingOfficerBadge: officerBadge,
        assignedSupervisor: supervisor,
        assignedInvestigator: investigator,
        submittedBy,
        submittedByRole: i.submittedBy?.role || '',
        responseAction: i.responseAction || '',
        witnessPresent: i.witnessPresent ? 'YES' : 'NO',
        lawEnforcementInvolved: i.lawEnforcementInvolved ? 'YES' : 'NO',
        evidenceCollected,
        geoLat: typeof i.geoLat === 'number' ? i.geoLat : '',
        geoLng: typeof i.geoLng === 'number' ? i.geoLng : '',
        narrative: i.description,
        personsInvolved: persons,
        evidenceReferences: evidenceUrls,
      };
    });

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Incident Reports');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return {
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `incident-reports-${new Date().toISOString().slice(0, 10)}.xlsx`,
        data: buf,
      };
    }

    const escape = (v: any) => {
      const s = String(v ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.split('"').join('""')}"`;
      return s;
    };
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const csv = [headers.map(escape).join(',')].concat(rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))).join('\n');
    return {
      mime: 'text/csv;charset=utf-8',
      filename: `incident-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      data: csv,
    };
  }
}
