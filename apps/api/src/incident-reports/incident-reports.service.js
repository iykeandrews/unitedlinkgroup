"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentReportsService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
let IncidentReportsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var IncidentReportsService = _classThis = class {
        constructor(prisma, notifications) {
            this.prisma = prisma;
            this.notifications = notifications;
        }
        getUserId(user) {
            return user.userId || user.sub || user.id;
        }
        async validateBusinessAccess(targetBusinessId, user) {
            if (user.role === 'SUPER_ADMIN')
                return;
            // Check if user owns the business
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: this.getUserId(user) } });
            if (ownedBusiness && ownedBusiness.id === targetBusinessId)
                return;
            // Check if user is an employee of the business
            const employee = await this.prisma.employee.findFirst({
                where: { userId: this.getUserId(user), businessId: targetBusinessId }
            });
            if (employee)
                return;
            throw new common_1.BadRequestException('Access denied: You do not have access to this business data');
        }
        async getBusinessId(user) {
            const userId = this.getUserId(user);
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee)
                return employee.businessId;
            const business = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (business)
                return business.id;
            throw new common_1.BadRequestException('User is not associated with a business');
        }
        async resolveBusinessId(user, businessIdHeader) {
            let businessId = businessIdHeader;
            if (!businessId || user.role !== 'SUPER_ADMIN') {
                businessId = await this.getBusinessId(user);
            }
            if (user.role === 'SUPER_ADMIN' && !businessId) {
                throw new common_1.BadRequestException('Business context required for Super Admin');
            }
            return businessId;
        }
        async generateReportNumber() {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            for (let attempt = 0; attempt < 5; attempt++) {
                const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
                const reportNumber = `IR-${y}${m}${d}-${rand}`;
                const existing = await this.prisma.incidentReport.findFirst({ where: { reportNumber } });
                if (!existing)
                    return reportNumber;
            }
            return `IR-${Date.now()}`;
        }
        parseIsoDate(value) {
            if (!value)
                return null;
            const d = new Date(value);
            if (Number.isNaN(d.getTime()))
                return null;
            return d;
        }
        async create(data, user, businessIdHeader, context) {
            const businessId = await this.resolveBusinessId(user, businessIdHeader);
            await this.validateBusinessAccess(businessId, user);
            const submittedById = this.getUserId(user);
            const userEmployee = await this.prisma.employee.findFirst({
                where: { userId: submittedById, businessId },
            });
            let reportingOfficerEmployeeId = data.reportingOfficerEmployeeId || undefined;
            if (user.role === 'EMPLOYEE') {
                if (!userEmployee)
                    throw new common_1.BadRequestException('Employee profile not found');
                if (data.reportingOfficerEmployeeId && data.reportingOfficerEmployeeId !== userEmployee.id) {
                    throw new common_1.BadRequestException('Employees cannot submit reports for other officers');
                }
                reportingOfficerEmployeeId = userEmployee.id;
            }
            else {
                if (!reportingOfficerEmployeeId && userEmployee) {
                    reportingOfficerEmployeeId = userEmployee.id;
                }
            }
            if (reportingOfficerEmployeeId) {
                const officer = await this.prisma.employee.findFirst({
                    where: { id: reportingOfficerEmployeeId, businessId, status: 'ACTIVE' },
                });
                if (!officer)
                    throw new common_1.BadRequestException('Reporting officer not found or not active');
            }
            if (data.assignedSupervisorId) {
                const supervisor = await this.prisma.employee.findFirst({
                    where: { id: data.assignedSupervisorId, businessId, status: 'ACTIVE' },
                });
                if (!supervisor)
                    throw new common_1.BadRequestException('Assigned supervisor not found or not active');
            }
            const incidentAt = this.parseIsoDate(data.incidentAt || data.date) || null;
            const reportNumber = await this.generateReportNumber();
            const { images, persons, evidenceCollected, incidentAt: _incidentAt, date: _date, deviceInfo: clientDeviceInfo, geoLat, geoLng, ...rest } = data;
            const deviceInfo = JSON.stringify({
                userAgent: (context === null || context === void 0 ? void 0 : context.userAgent) || null,
                submittedByRole: user.role || null,
                client: clientDeviceInfo || null,
            });
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
                        date: incidentAt !== null && incidentAt !== void 0 ? incidentAt : new Date(),
                        incidentAt: incidentAt !== null && incidentAt !== void 0 ? incidentAt : undefined,
                        deviceInfo,
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
                        evidence: true,
                        persons: true,
                        timeline: { orderBy: { createdAt: 'asc' } },
                    },
                });
                if (persons === null || persons === void 0 ? void 0 : persons.length) {
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
            if (!created)
                throw new common_1.BadRequestException('Failed to create incident report');
            if (created.severity === 'CRITICAL') {
                const business = await this.prisma.business.findUnique({ where: { id: businessId } });
                const managerEmployees = await this.prisma.employee.findMany({
                    where: { businessId, role: { in: ['BUSINESS_ADMIN', 'MANAGER'] }, userId: { not: null } },
                    select: { userId: true },
                });
                const recipientUserIds = new Set();
                if (business === null || business === void 0 ? void 0 : business.ownerId)
                    recipientUserIds.add(business.ownerId);
                managerEmployees.forEach((e) => e.userId && recipientUserIds.add(e.userId));
                for (const uid of recipientUserIds) {
                    await this.notifications.createNotification(uid, 'CRITICAL', 'Critical incident reported', `${created.title} (${created.reportNumber || created.id})`, { incidentId: created.id, reportNumber: created.reportNumber, severity: created.severity });
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
        async findAll(user, businessIdHeader, query) {
            let businessId = businessIdHeader;
            if (!businessId || user.role !== 'SUPER_ADMIN') {
                try {
                    businessId = await this.getBusinessId(user);
                }
                catch (e) {
                    if (user.role === 'SUPER_ADMIN')
                        return { items: [], total: 0, page: 1, pageSize: 20 };
                    throw e;
                }
            }
            if (!businessId)
                return { items: [], total: 0, page: 1, pageSize: 20 };
            await this.validateBusinessAccess(businessId, user);
            const page = Math.max(1, (query === null || query === void 0 ? void 0 : query.page) || 1);
            const pageSize = Math.min(100, Math.max(5, (query === null || query === void 0 ? void 0 : query.pageSize) || 20));
            const skip = (page - 1) * pageSize;
            const where = { businessId };
            if (query === null || query === void 0 ? void 0 : query.locationId)
                where.locationId = query.locationId;
            if (query === null || query === void 0 ? void 0 : query.type)
                where.type = query.type;
            if (query === null || query === void 0 ? void 0 : query.severity)
                where.severity = query.severity;
            if (query === null || query === void 0 ? void 0 : query.status)
                where.status = query.status;
            if (query === null || query === void 0 ? void 0 : query.reportingOfficerEmployeeId)
                where.reportingOfficerEmployeeId = query.reportingOfficerEmployeeId;
            const fromDate = this.parseIsoDate((query === null || query === void 0 ? void 0 : query.from) || null);
            const toDate = this.parseIsoDate((query === null || query === void 0 ? void 0 : query.to) || null);
            if (fromDate || toDate) {
                where.date = {};
                if (fromDate)
                    where.date.gte = fromDate;
                if (toDate)
                    where.date.lte = toDate;
            }
            if (query === null || query === void 0 ? void 0 : query.search) {
                const s = query.search.trim();
                if (s) {
                    where.OR = [
                        { title: { contains: s, mode: 'insensitive' } },
                        { description: { contains: s, mode: 'insensitive' } },
                        { reportNumber: { contains: s, mode: 'insensitive' } },
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
        async findOne(id, user) {
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
            if (!report)
                throw new common_1.NotFoundException('Incident report not found');
            await this.validateBusinessAccess(report.businessId, user);
            return report;
        }
        async update(id, data, user) {
            const report = await this.prisma.incidentReport.findUnique({ where: { id } });
            if (!report)
                throw new common_1.NotFoundException('Incident report not found');
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
                        date: nextIncidentAt !== null && nextIncidentAt !== void 0 ? nextIncidentAt : undefined,
                        incidentAt: nextIncidentAt !== null && nextIncidentAt !== void 0 ? nextIncidentAt : undefined,
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
            if (!updated)
                throw new common_1.BadRequestException('Failed to update incident report');
            if (report.status !== updated.status && updated.status === 'ESCALATED') {
                const business = await this.prisma.business.findUnique({ where: { id: report.businessId } });
                const managerEmployees = await this.prisma.employee.findMany({
                    where: { businessId: report.businessId, role: { in: ['BUSINESS_ADMIN', 'MANAGER'] }, userId: { not: null } },
                    select: { userId: true },
                });
                const recipientUserIds = new Set();
                if (business === null || business === void 0 ? void 0 : business.ownerId)
                    recipientUserIds.add(business.ownerId);
                managerEmployees.forEach((e) => e.userId && recipientUserIds.add(e.userId));
                for (const uid of recipientUserIds) {
                    await this.notifications.createNotification(uid, 'WARNING', 'Incident escalated', `${updated.title} (${updated.reportNumber || updated.id})`, { incidentId: updated.id, reportNumber: updated.reportNumber, status: updated.status });
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
        async remove(id, user) {
            const report = await this.prisma.incidentReport.findUnique({ where: { id } });
            if (!report)
                throw new common_1.NotFoundException('Incident report not found');
            await this.validateBusinessAccess(report.businessId, user);
            return this.prisma.incidentReport.delete({ where: { id } });
        }
        async addInvestigationNote(id, user, note) {
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
        async assignInvestigator(id, user, investigatorEmployeeId) {
            const incident = await this.prisma.incidentReport.findUnique({ where: { id } });
            if (!incident)
                throw new common_1.NotFoundException('Incident report not found');
            await this.validateBusinessAccess(incident.businessId, user);
            const target = await this.prisma.employee.findFirst({
                where: { id: investigatorEmployeeId, businessId: incident.businessId, status: 'ACTIVE' },
                include: { user: true },
            });
            if (!target)
                throw new common_1.BadRequestException('Investigator not found or not active');
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
                await this.notifications.createNotification(target.userId, 'INFO', 'Incident assigned', `You were assigned to investigate incident ${incident.reportNumber || incident.id}`, { incidentId: incident.id });
                await this.notifications.sendPush(target.userId, {
                    type: 'INFO',
                    title: 'Incident assigned',
                    message: `Incident ${incident.reportNumber || incident.id}`,
                    metadata: { incidentId: incident.id },
                });
            }
            return { ok: true };
        }
        async addEvidence(id, user, file) {
            const incident = await this.prisma.incidentReport.findUnique({ where: { id } });
            if (!incident)
                throw new common_1.NotFoundException('Incident report not found');
            await this.validateBusinessAccess(incident.businessId, user);
            const userId = this.getUserId(user);
            const mimeType = file.mimeType || '';
            const kind = mimeType.startsWith('image/')
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
        async getSummaryByLocation(user, businessIdHeader, status) {
            const businessId = await this.resolveBusinessId(user, businessIdHeader);
            await this.validateBusinessAccess(businessId, user);
            const normalizedStatus = (status || 'ACTIVE').toUpperCase();
            const locationWhere = { businessId };
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
            const byLoc = new Map();
            for (const l of locations) {
                byLoc.set(l.id, {
                    locationId: l.id,
                    locationName: l.name,
                    locationStatus: l.status,
                    totalIncidents: 0,
                    openIncidents: 0,
                    criticalIncidents: 0,
                    lastIncidentDate: null,
                    assignedSecurityTeam: [],
                });
            }
            for (const inc of incidents) {
                if (!inc.locationId)
                    continue;
                const entry = byLoc.get(inc.locationId);
                if (!entry)
                    continue;
                entry.totalIncidents += 1;
                if (inc.status && ['OPEN', 'REPORTED', 'UNDER_INVESTIGATION', 'ESCALATED'].includes(inc.status))
                    entry.openIncidents += 1;
                if (inc.severity === 'CRITICAL')
                    entry.criticalIncidents += 1;
                const dt = inc.date ? new Date(inc.date).toISOString() : null;
                if (dt && (!entry.lastIncidentDate || dt > entry.lastIncidentDate))
                    entry.lastIncidentDate = dt;
            }
            const team = await this.prisma.employee.findMany({
                where: { businessId, status: 'ACTIVE', defaultLocationId: { not: null } },
                select: { id: true, firstName: true, lastName: true, badgeNumber: true, defaultLocationId: true },
            });
            for (const e of team) {
                const locId = e.defaultLocationId;
                if (!locId)
                    continue;
                const entry = byLoc.get(locId);
                if (!entry)
                    continue;
                entry.assignedSecurityTeam.push({
                    id: e.id,
                    name: `${e.firstName} ${e.lastName}`.trim(),
                    badgeNumber: e.badgeNumber || null,
                });
            }
            return Array.from(byLoc.values());
        }
        async getAnalytics(user, businessIdHeader, period = 'weekly') {
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
            const trendMap = new Map();
            const typeMap = new Map();
            const sevMap = new Map();
            const locMap = new Map();
            const officerMap = new Map();
            const keyForDate = (d) => {
                if (period === 'daily')
                    return d.toISOString().slice(0, 10);
                if (period === 'monthly')
                    return d.toISOString().slice(0, 7);
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
                if (inc.locationId)
                    locMap.set(inc.locationId, (locMap.get(inc.locationId) || 0) + 1);
                if (inc.reportingOfficerEmployeeId)
                    officerMap.set(inc.reportingOfficerEmployeeId, (officerMap.get(inc.reportingOfficerEmployeeId) || 0) + 1);
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
            const officerNameMap = new Map(officers.map((o) => [o.id, { name: `${o.firstName} ${o.lastName}`.trim(), badgeNumber: o.badgeNumber || null }]));
            return {
                trend: Array.from(trendMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count })),
                byType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
                bySeverity: Array.from(sevMap.entries()).map(([severity, count]) => ({ severity, count })),
                byLocation: Array.from(locMap.entries()).map(([locationId, count]) => ({ locationId, locationName: locationNameMap.get(locationId) || locationId, count })),
                byOfficer: Array.from(officerMap.entries()).map(([employeeId, count]) => {
                    const meta = officerNameMap.get(employeeId);
                    return { employeeId, officerName: (meta === null || meta === void 0 ? void 0 : meta.name) || employeeId, badgeNumber: (meta === null || meta === void 0 ? void 0 : meta.badgeNumber) || null, count };
                }),
            };
        }
        async exportIncidents(user, businessIdHeader, format, query) {
            const businessId = await this.resolveBusinessId(user, businessIdHeader);
            await this.validateBusinessAccess(businessId, user);
            const where = { businessId };
            if (query === null || query === void 0 ? void 0 : query.locationId)
                where.locationId = query.locationId;
            if (query === null || query === void 0 ? void 0 : query.type)
                where.type = query.type;
            if (query === null || query === void 0 ? void 0 : query.severity)
                where.severity = query.severity;
            if (query === null || query === void 0 ? void 0 : query.status)
                where.status = query.status;
            if (query === null || query === void 0 ? void 0 : query.reportingOfficerEmployeeId)
                where.reportingOfficerEmployeeId = query.reportingOfficerEmployeeId;
            const fromDate = this.parseIsoDate((query === null || query === void 0 ? void 0 : query.from) || null);
            const toDate = this.parseIsoDate((query === null || query === void 0 ? void 0 : query.to) || null);
            if (fromDate || toDate) {
                where.date = {};
                if (fromDate)
                    where.date.gte = fromDate;
                if (toDate)
                    where.date.lte = toDate;
            }
            if (query === null || query === void 0 ? void 0 : query.search) {
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
            const rows = incidents.map((i) => {
                var _a, _b, _c, _d, _e, _f, _g;
                const officer = i.reportingOfficer ? `${i.reportingOfficer.firstName} ${i.reportingOfficer.lastName}`.trim() : '';
                const officerBadge = ((_a = i.reportingOfficer) === null || _a === void 0 ? void 0 : _a.badgeNumber) || '';
                const submittedBy = i.submittedBy ? `${i.submittedBy.firstName || ''} ${i.submittedBy.lastName || ''}`.trim() || i.submittedBy.email : '';
                const supervisor = i.assignedSupervisor ? `${i.assignedSupervisor.firstName} ${i.assignedSupervisor.lastName}`.trim() : '';
                const investigator = i.assignedInvestigator ? `${i.assignedInvestigator.firstName} ${i.assignedInvestigator.lastName}`.trim() : '';
                let evidenceCollected = '';
                try {
                    const parsed = i.evidenceCollected ? JSON.parse(i.evidenceCollected) : [];
                    evidenceCollected = Array.isArray(parsed) ? parsed.join(' | ') : '';
                }
                catch { }
                const persons = (i.persons || []).map((p) => `${p.role}:${p.name}${p.contactInfo ? `(${p.contactInfo})` : ''}`).join(' | ');
                const evidenceUrls = (i.evidence || []).map((e) => e.url).join(' | ');
                return {
                    reportNumber: i.reportNumber || i.id,
                    title: i.title,
                    incidentType: i.type,
                    severity: i.severity,
                    status: i.status,
                    incidentAt: ((_c = (_b = (i.incidentAt || i.date)) === null || _b === void 0 ? void 0 : _b.toISOString) === null || _c === void 0 ? void 0 : _c.call(_b)) || '',
                    reportedAt: ((_e = (_d = i.reportedAt) === null || _d === void 0 ? void 0 : _d.toISOString) === null || _e === void 0 ? void 0 : _e.call(_d)) || '',
                    shift: i.shift || '',
                    buildingArea: i.buildingArea || '',
                    location: ((_f = i.location) === null || _f === void 0 ? void 0 : _f.name) || '',
                    reportingOfficer: officer,
                    reportingOfficerBadge: officerBadge,
                    assignedSupervisor: supervisor,
                    assignedInvestigator: investigator,
                    submittedBy,
                    submittedByRole: ((_g = i.submittedBy) === null || _g === void 0 ? void 0 : _g.role) || '',
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
                const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
                return {
                    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    filename: `incident-reports-${new Date().toISOString().slice(0, 10)}.xlsx`,
                    data: buf,
                };
            }
            const escape = (v) => {
                const s = String(v !== null && v !== void 0 ? v : '');
                if (s.includes('"') || s.includes(',') || s.includes('\n'))
                    return `"${s.split('"').join('""')}"`;
                return s;
            };
            const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
            const csv = [headers.map(escape).join(',')].concat(rows.map((r) => headers.map((h) => escape(r[h])).join(','))).join('\n');
            return {
                mime: 'text/csv;charset=utf-8',
                filename: `incident-reports-${new Date().toISOString().slice(0, 10)}.csv`,
                data: csv,
            };
        }
    };
    __setFunctionName(_classThis, "IncidentReportsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        IncidentReportsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return IncidentReportsService = _classThis;
})();
exports.IncidentReportsService = IncidentReportsService;
