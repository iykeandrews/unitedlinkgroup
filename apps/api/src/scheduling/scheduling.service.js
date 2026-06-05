"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const tax_util_1 = require("../common/tax.util");
const crypto_1 = __importDefault(require("crypto"));
let SchedulingService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _handleShiftReminders_decorators;
    var SchedulingService = _classThis = class {
        constructor(prisma, notifications, push, audit) {
            this.prisma = (__runInitializers(this, _instanceExtraInitializers), prisma);
            this.notifications = notifications;
            this.push = push;
            this.audit = audit;
        }
        async validateBusinessAccess(targetBusinessId, user) {
            const business = await this.prisma.business.findUnique({ where: { id: targetBusinessId } });
            if (!business) {
                throw new common_1.BadRequestException('Business not found');
            }
            if (user.role === 'SUPER_ADMIN')
                return;
            // Check if user owns the business
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
            if (ownedBusiness && ownedBusiness.id === targetBusinessId)
                return;
            // Check if user is an employee of the business
            const employee = await this.prisma.employee.findFirst({
                where: { userId: user.userId || user.sub || user.id, businessId: targetBusinessId }
            });
            if (employee)
                return;
            throw new common_1.BadRequestException('Access denied: You do not have access to this business data');
        }
        resolveActorUserId(user) {
            return (user === null || user === void 0 ? void 0 : user.userId) || (user === null || user === void 0 ? void 0 : user.sub) || (user === null || user === void 0 ? void 0 : user.id);
        }
        async assertNoShiftOverlap(params) {
            var _a;
            const end = (_a = params.end) !== null && _a !== void 0 ? _a : params.start;
            const overlaps = await this.prisma.shift.findFirst({
                where: {
                    employeeId: params.employeeId,
                    status: { in: ['DRAFT', 'PUBLISHED', 'OPEN', 'COMPLETED'] },
                    ...(params.excludeGroupId ? { NOT: { groupId: params.excludeGroupId } } : {}),
                    ...(params.excludeShiftId ? { NOT: { id: params.excludeShiftId } } : {}),
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
                },
                select: { id: true }
            });
            if (overlaps) {
                throw new common_1.BadRequestException('Shift overlaps with an existing shift');
            }
        }
        async getEmployeeForActor(user, businessId) {
            const userId = this.resolveActorUserId(user);
            if (!userId)
                return null;
            return this.prisma.employee.findFirst({ where: { userId, businessId } });
        }
        async getAdminUsersForBusiness(businessId) {
            const business = await this.prisma.business.findUnique({ where: { id: businessId } });
            const users = [];
            if (business === null || business === void 0 ? void 0 : business.ownerId) {
                const owner = await this.prisma.user.findUnique({ where: { id: business.ownerId } });
                if (owner)
                    users.push({ id: owner.id, email: owner.email || null });
            }
            const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
            for (const sa of superAdmins)
                users.push({ id: sa.id, email: sa.email || null });
            const map = new Map();
            for (const u of users)
                map.set(u.id, u);
            return Array.from(map.values());
        }
        async notifyOpenShiftCandidates(shift, opts) {
            var _a;
            const onlyEmployeeIds = Array.isArray(opts === null || opts === void 0 ? void 0 : opts.onlyEmployeeIds) ? opts === null || opts === void 0 ? void 0 : opts.onlyEmployeeIds.map(String) : null;
            const excludeEmployeeIds = new Set(((opts === null || opts === void 0 ? void 0 : opts.excludeEmployeeIds) || []).map(String));
            const employees = await this.prisma.employee.findMany({
                where: {
                    businessId: shift.businessId,
                    status: 'ACTIVE',
                    ...(onlyEmployeeIds ? { id: { in: onlyEmployeeIds } } : {})
                },
                include: { user: true }
            });
            const title = 'Open shift available';
            const locLabel = ((_a = shift.location) === null || _a === void 0 ? void 0 : _a.name) ? ` @ ${shift.location.name}` : '';
            const message = `Open shift ${new Date(shift.startTime).toLocaleString()}${locLabel}. Tap to apply.`;
            let notified = 0;
            for (const e of employees) {
                if (!e.userId || excludeEmployeeIds.has(String(e.id)))
                    continue;
                notified += 1;
                await this.notifications.createNotification(e.userId, 'INFO', title, message, { shiftId: shift.id });
                await this.notifications.sendPush(e.userId, { type: 'INFO', title, message, metadata: { shiftId: shift.id } });
                await this.push.send(e.userId, { type: 'INFO', title, message, metadata: { shiftId: shift.id }, actionUrl: '/dashboard/scheduling' });
            }
            return notified;
        }
        async recordCallout(shiftId, body, user, meta) {
            var _a;
            const shift = await this.prisma.shift.findUnique({
                where: { id: shiftId },
                include: { employee: true, location: { include: { client: true } } }
            });
            if (!shift)
                throw new common_1.BadRequestException('Shift not found');
            await this.validateBusinessAccess(shift.businessId, user);
            if (!shift.employeeId)
                throw new common_1.BadRequestException('Shift has no assigned employee');
            if (String((user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase() === 'EMPLOYEE') {
                const actorEmp = await this.getEmployeeForActor(user, shift.businessId);
                if (!actorEmp || actorEmp.id !== shift.employeeId) {
                    throw new common_1.BadRequestException('Access denied: cannot call out for another employee');
                }
            }
            const reasonCode = String((body === null || body === void 0 ? void 0 : body.reasonCode) || '').trim();
            const type = String((body === null || body === void 0 ? void 0 : body.type) || '').trim().toUpperCase();
            const noticeAtRaw = body === null || body === void 0 ? void 0 : body.noticeAt;
            const noticeAt = noticeAtRaw ? new Date(noticeAtRaw) : new Date();
            const reasonNote = (body === null || body === void 0 ? void 0 : body.reasonNote) ? String(body.reasonNote) : undefined;
            const documentationUrl = (body === null || body === void 0 ? void 0 : body.documentationUrl) ? String(body.documentationUrl) : undefined;
            if (!reasonCode)
                throw new common_1.BadRequestException('Call-out reason is required');
            if (!['EXCUSED', 'UNEXCUSED', 'EMERGENCY'].includes(type)) {
                throw new common_1.BadRequestException('Invalid call-out type');
            }
            if (Number.isNaN(noticeAt.getTime()))
                throw new common_1.BadRequestException('Invalid notice time');
            const existing = await this.prisma.shiftCallout.findUnique({ where: { shiftId } });
            if (existing)
                throw new common_1.BadRequestException('Call-out already recorded for this shift');
            const actorUserId = this.resolveActorUserId(user);
            const created = await this.prisma.shiftCallout.create({
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
                    ipAddress: meta === null || meta === void 0 ? void 0 : meta.ipAddress,
                    userAgent: meta === null || meta === void 0 ? void 0 : meta.userAgent
                });
            }
            const supervisors = await this.getAdminUsersForBusiness(shift.businessId);
            const title = 'Officer call-out approval needed';
            const locLabel = ((_a = shift.location) === null || _a === void 0 ? void 0 : _a.name) ? ` @ ${shift.location.name}` : '';
            const dateLabel = new Date(shift.startTime).toLocaleString();
            const message = `Call-out for shift ${dateLabel}${locLabel}. Admin approval is required before the shift can be opened.`;
            for (const sup of supervisors) {
                await this.notifications.createNotification(sup.id, 'WARNING', title, message, { shiftId, calloutId: created.id });
                await this.notifications.sendPush(sup.id, { type: 'WARNING', title, message, metadata: { shiftId, calloutId: created.id } });
                await this.push.send(sup.id, { type: 'WARNING', title, message, metadata: { shiftId, calloutId: created.id }, actionUrl: '/dashboard/requests/approvals' });
            }
            return { shiftId, calloutId: created.id, status: 'PENDING_APPROVAL' };
        }
        async listPendingCallouts(user, businessIdHeader) {
            const where = { resolvedAt: null };
            if (String((user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase() !== 'SUPER_ADMIN') {
                if (!businessIdHeader)
                    return [];
                await this.validateBusinessAccess(businessIdHeader, user);
                where.businessId = businessIdHeader;
            }
            else if (businessIdHeader) {
                where.businessId = businessIdHeader;
            }
            const rows = await this.prisma.shiftCallout.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    absentEmployee: true,
                    submittedBy: true,
                    shift: { include: { location: true } },
                },
            });
            return rows
                .filter((row) => { var _a, _b; return !!((_a = row === null || row === void 0 ? void 0 : row.shift) === null || _a === void 0 ? void 0 : _a.employeeId) && String(((_b = row === null || row === void 0 ? void 0 : row.shift) === null || _b === void 0 ? void 0 : _b.status) || '').toUpperCase() !== 'OPEN'; })
                .map((row) => ({ ...row, status: 'PENDING' }));
        }
        async approveCallout(calloutId, user) {
            var _a;
            const callout = await this.prisma.shiftCallout.findUnique({
                where: { id: calloutId },
                include: { shift: { include: { location: true } }, absentEmployee: true },
            });
            if (!callout)
                throw new common_1.BadRequestException('Call-out not found');
            await this.validateBusinessAccess(callout.businessId, user);
            if (callout.resolvedAt) {
                throw new common_1.BadRequestException('Call-out has already been processed');
            }
            await this.prisma.shift.update({
                where: { id: callout.shiftId },
                data: { employeeId: null, status: 'OPEN' },
            });
            await this.prisma.shiftCallout.update({
                where: { id: calloutId },
                data: { status: 'APPROVED' },
            });
            const notified = await this.notifyOpenShiftCandidates(callout.shift, {
                excludeEmployeeIds: [callout.absentEmployeeId],
            });
            if ((_a = callout.absentEmployee) === null || _a === void 0 ? void 0 : _a.userId) {
                const title = 'Call-out approved';
                const message = `Your call-out for ${new Date(callout.shift.startTime).toLocaleString()} has been approved and the shift is now open.`;
                await this.notifications.createNotification(callout.absentEmployee.userId, 'INFO', title, message, { shiftId: callout.shiftId, calloutId });
                await this.notifications.sendPush(callout.absentEmployee.userId, { type: 'INFO', title, message, metadata: { shiftId: callout.shiftId, calloutId } });
                await this.push.send(callout.absentEmployee.userId, { type: 'INFO', title, message, metadata: { shiftId: callout.shiftId, calloutId }, actionUrl: '/dashboard/scheduling' });
            }
            return { callout: { ...callout, status: 'APPROVED' }, notified };
        }
        async rejectCallout(calloutId, body, user) {
            var _a;
            const callout = await this.prisma.shiftCallout.findUnique({
                where: { id: calloutId },
                include: { shift: true, absentEmployee: true },
            });
            if (!callout)
                throw new common_1.BadRequestException('Call-out not found');
            await this.validateBusinessAccess(callout.businessId, user);
            if (callout.resolvedAt) {
                throw new common_1.BadRequestException('Call-out has already been processed');
            }
            if ((_a = callout.absentEmployee) === null || _a === void 0 ? void 0 : _a.userId) {
                const title = 'Call-out not approved';
                const message = `Your call-out for ${new Date(callout.shift.startTime).toLocaleString()} was not approved.`;
                await this.notifications.createNotification(callout.absentEmployee.userId, 'WARNING', title, message, { shiftId: callout.shiftId, calloutId });
                await this.notifications.sendPush(callout.absentEmployee.userId, { type: 'WARNING', title, message, metadata: { shiftId: callout.shiftId, calloutId } });
                await this.push.send(callout.absentEmployee.userId, { type: 'WARNING', title, message, metadata: { shiftId: callout.shiftId, calloutId }, actionUrl: '/dashboard/scheduling' });
            }
            const updated = await this.prisma.shiftCallout.update({
                where: { id: calloutId },
                data: {
                    status: 'REJECTED',
                    resolvedAt: new Date(),
                    resolvedByUserId: this.resolveActorUserId(user) || null,
                },
            });
            return { ...updated, status: 'REJECTED', reason: (body === null || body === void 0 ? void 0 : body.reason) ? String(body.reason) : null };
        }
        async getMyCallouts(userId) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            const rows = await this.prisma.shiftCallout.findMany({
                where: { absentEmployeeId: employee.id },
                orderBy: { createdAt: 'desc' },
                include: {
                    shift: { include: { location: true, employee: true } },
                    absentEmployee: true,
                    submittedBy: true,
                    resolvedBy: true,
                },
            });
            return rows.map((row) => {
                var _a, _b;
                const savedStatus = String((row === null || row === void 0 ? void 0 : row.status) || '').toUpperCase();
                const shiftStatus = String(((_a = row === null || row === void 0 ? void 0 : row.shift) === null || _a === void 0 ? void 0 : _a.status) || '').toUpperCase();
                const currentEmployeeId = String(((_b = row === null || row === void 0 ? void 0 : row.shift) === null || _b === void 0 ? void 0 : _b.employeeId) || '');
                const absentEmployeeId = String((row === null || row === void 0 ? void 0 : row.absentEmployeeId) || '');
                let status = 'PENDING';
                if (savedStatus === 'COVERED' || ((row === null || row === void 0 ? void 0 : row.resolvedAt) && currentEmployeeId && currentEmployeeId !== absentEmployeeId)) {
                    status = 'COVERED';
                }
                else if (savedStatus === 'REJECTED' || (row === null || row === void 0 ? void 0 : row.resolvedAt)) {
                    status = 'REJECTED';
                }
                else if (savedStatus === 'APPROVED' || (!(row === null || row === void 0 ? void 0 : row.resolvedAt) && (shiftStatus === 'OPEN' || !currentEmployeeId))) {
                    status = 'APPROVED_OPEN';
                }
                return { ...row, status };
            });
        }
        async reassignShift(shiftId, body, user, meta) {
            const shift = await this.prisma.shift.findUnique({
                where: { id: shiftId },
                include: { employee: true, location: true }
            });
            if (!shift)
                throw new common_1.BadRequestException('Shift not found');
            await this.validateBusinessAccess(shift.businessId, user);
            const replacementEmployeeId = String((body === null || body === void 0 ? void 0 : body.replacementEmployeeId) || '').trim();
            if (!replacementEmployeeId)
                throw new common_1.BadRequestException('Replacement officer is required');
            const replacement = await this.prisma.employee.findUnique({ where: { id: replacementEmployeeId }, include: { user: true } });
            if (!replacement || replacement.businessId !== shift.businessId)
                throw new common_1.BadRequestException('Replacement officer not found');
            if (replacement.status !== 'ACTIVE')
                throw new common_1.BadRequestException('Replacement officer is not active');
            const ok = await this.validateAvailability(replacementEmployeeId, new Date(shift.startTime), new Date(shift.endTime));
            if (!ok.ok)
                throw new common_1.BadRequestException(ok.message);
            const actorUserId = this.resolveActorUserId(user);
            const callout = await this.prisma.shiftCallout.findUnique({ where: { shiftId } }).catch(() => null);
            const absentEmployeeId = (callout === null || callout === void 0 ? void 0 : callout.absentEmployeeId) || null;
            const reassignedAt = new Date();
            const updatedShift = await this.prisma.shift.update({
                where: { id: shiftId },
                data: { employeeId: replacementEmployeeId, status: 'PUBLISHED' }
            });
            const responseMinutes = (callout === null || callout === void 0 ? void 0 : callout.noticeAt)
                ? Math.max(0, Math.round((reassignedAt.getTime() - new Date(callout.noticeAt).getTime()) / (1000 * 60)))
                : null;
            const coverage = await this.prisma.shiftCoverage.create({
                data: {
                    businessId: shift.businessId,
                    shiftId,
                    calloutId: (callout === null || callout === void 0 ? void 0 : callout.id) || null,
                    absentEmployeeId,
                    replacementEmployeeId,
                    method: 'DIRECT',
                    reassignedAt,
                    reassignedByUserId: actorUserId || null,
                    acceptedAt: reassignedAt,
                    responseMinutes: responseMinutes !== null && responseMinutes !== void 0 ? responseMinutes : null
                }
            });
            if (callout === null || callout === void 0 ? void 0 : callout.id) {
                await this.prisma.shiftCallout.update({
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
                    ipAddress: meta === null || meta === void 0 ? void 0 : meta.ipAddress,
                    userAgent: meta === null || meta === void 0 ? void 0 : meta.userAgent
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
        async broadcastOpenShift(shiftId, body, user, meta) {
            var _a;
            const shift = await this.prisma.shift.findUnique({
                where: { id: shiftId },
                include: { location: true }
            });
            if (!shift)
                throw new common_1.BadRequestException('Shift not found');
            await this.validateBusinessAccess(shift.businessId, user);
            if (shift.status !== 'OPEN') {
                throw new common_1.BadRequestException('Shift must be open to broadcast');
            }
            const actorUserId = this.resolveActorUserId(user);
            const onlyEmployeeIds = Array.isArray(body === null || body === void 0 ? void 0 : body.employeeIds) ? body.employeeIds.map((x) => String(x)) : null;
            const employees = await this.prisma.employee.findMany({
                where: {
                    businessId: shift.businessId,
                    status: 'ACTIVE',
                    ...(onlyEmployeeIds ? { id: { in: onlyEmployeeIds } } : {})
                },
                include: { user: true }
            });
            const title = 'Open shift available';
            const locLabel = ((_a = shift.location) === null || _a === void 0 ? void 0 : _a.name) ? ` @ ${shift.location.name}` : '';
            const message = `Open shift ${new Date(shift.startTime).toLocaleString()}${locLabel}. Tap to apply.`;
            let notified = 0;
            for (const e of employees) {
                if (!e.userId)
                    continue;
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
                    ipAddress: meta === null || meta === void 0 ? void 0 : meta.ipAddress,
                    userAgent: meta === null || meta === void 0 ? void 0 : meta.userAgent
                });
            }
            return { shiftId, notified };
        }
        async getShiftHistory(shiftId, user) {
            var _a;
            const shift = await this.prisma.shift.findUnique({
                where: { id: shiftId },
                include: {
                    employee: true,
                    location: { include: { client: true } },
                    applications: { include: { employee: true } },
                    callout: { include: { absentEmployee: true, submittedBy: true, resolvedBy: true } },
                    coverages: {
                        orderBy: { reassignedAt: 'asc' },
                        include: { replacementEmployee: true, reassignedBy: true, callout: true }
                    }
                }
            });
            if (!shift)
                throw new common_1.BadRequestException('Shift not found');
            await this.validateBusinessAccess(shift.businessId, user);
            if (String((user === null || user === void 0 ? void 0 : user.role) || '').toUpperCase() === 'EMPLOYEE') {
                const actorEmp = await this.getEmployeeForActor(user, shift.businessId);
                const selfShift = actorEmp && (actorEmp.id === shift.employeeId || actorEmp.id === ((_a = shift.callout) === null || _a === void 0 ? void 0 : _a.absentEmployeeId));
                const selfCoverage = actorEmp && Array.isArray(shift.coverages) && shift.coverages.some((c) => c.replacementEmployeeId === actorEmp.id);
                if (!selfShift && !selfCoverage) {
                    throw new common_1.BadRequestException('Access denied: cannot view history for this shift');
                }
            }
            const logs = await this.audit.getLogs({ businessId: shift.businessId, resource: 'SHIFT', resourceId: shiftId, limit: 200 });
            return { shift, logs };
        }
        async createShift(data, user) {
            var _a, _b, _c, _d, _e, _f, _g;
            // Extract business ID from data
            let businessId;
            if ((_b = (_a = data.business) === null || _a === void 0 ? void 0 : _a.connect) === null || _b === void 0 ? void 0 : _b.id) {
                businessId = data.business.connect.id;
            }
            else if (data.businessId) {
                businessId = data.businessId;
            }
            if (!businessId) {
                // Try to resolve from user if not provided? 
                // Or fail? Usually shift creation requires business context.
                // If user is employee/manager, we can infer.
                try {
                    businessId = await this.getBusinessId(user.userId || user.sub || user.id);
                    // Inject into data if missing
                    if (!data.business && !data.businessId) {
                        data.business = { connect: { id: businessId } };
                    }
                }
                catch (e) {
                    throw new common_1.BadRequestException('Business context required');
                }
            }
            if (businessId) {
                await this.validateBusinessAccess(businessId, user);
            }
            const startTime = new Date(data.startTime);
            const endTime = data.endTime ? new Date(data.endTime) : null;
            if (!endTime) {
                throw new common_1.BadRequestException('End time is required');
            }
            if (startTime >= endTime) {
                throw new common_1.BadRequestException('End time must be after start time');
            }
            const employeeConnectId = (_d = (_c = data === null || data === void 0 ? void 0 : data.employee) === null || _c === void 0 ? void 0 : _c.connect) === null || _d === void 0 ? void 0 : _d.id;
            const locationConnectId = (_f = (_e = data === null || data === void 0 ? void 0 : data.location) === null || _e === void 0 ? void 0 : _e.connect) === null || _f === void 0 ? void 0 : _f.id;
            const groupId = data.groupId ? String(data.groupId) : crypto_1.default.randomUUID();
            const notes = typeof data.notes === 'string' ? data.notes : ((_g = data.notes) !== null && _g !== void 0 ? _g : null);
            const breakMinutesRaw = data.breakMinutes;
            const breakMinutes = typeof breakMinutesRaw === 'number'
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
                    throw new common_1.BadRequestException('Cannot schedule a deactivated employee');
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
            const createData = {
                business: { connect: { id: businessId } },
                startTime,
                endTime,
                breakMinutes,
                status: 'DRAFT',
                groupId,
                notes,
            };
            if (employeeConnectId)
                createData.employee = { connect: { id: employeeConnectId } };
            if (locationConnectId)
                createData.location = { connect: { id: locationConnectId } };
            const created = await this.prisma.shift.create({ data: createData });
            const empId = created.employeeId;
            if (empId && String(created.status || '').toUpperCase() !== 'DRAFT') {
                const employee = await this.prisma.employee.findUnique({ where: { id: empId }, include: { user: true } });
                if (employee === null || employee === void 0 ? void 0 : employee.userId) {
                    const title = 'New shift scheduled';
                    const message = `You have a shift on ${new Date(created.startTime).toLocaleDateString()}.`;
                    await this.notifications.createNotification(employee.userId, 'INFO', title, message, { shiftId: created.id });
                    await this.notifications.sendPush(employee.userId, { type: 'INFO', title, message, metadata: { shiftId: created.id } });
                    await this.push.send(employee.userId, { type: 'INFO', title, message, metadata: { shiftId: created.id }, actionUrl: '/dashboard/scheduling' });
                    const user = employee.user;
                    if (user === null || user === void 0 ? void 0 : user.email) {
                        await this.notifications.sendEmail(user.email, title, message);
                    }
                }
            }
            return created;
        }
        async getTaxContextForBusiness(userId, locationId) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            return (0, tax_util_1.resolveTaxContext)(this.prisma, employee.businessId, locationId);
        }
        async getShifts(businessId, start, end, user, employeeId) {
            await this.validateBusinessAccess(businessId, user);
            const rows = await this.prisma.shift.findMany({
                where: {
                    businessId,
                    ...(employeeId ? { employeeId } : {}),
                    startTime: { lte: end },
                    endTime: { gte: start },
                    status: { in: ['DRAFT', 'PUBLISHED', 'OPEN', 'CANCELLED'] },
                },
                include: {
                    employee: true,
                    location: { include: { client: true } },
                    applications: { include: { employee: true } },
                    callout: { include: { absentEmployee: true } },
                    coverages: { include: { replacementEmployee: true, reassignedBy: true } },
                },
            });
            const byGroup = new Map();
            const score = (s) => {
                const st = String((s === null || s === void 0 ? void 0 : s.status) || '').toUpperCase();
                if (st === 'DRAFT')
                    return 4;
                if (st === 'CANCELLED')
                    return 3;
                if (st === 'PUBLISHED')
                    return 2;
                if (st === 'OPEN')
                    return 1;
                return 0;
            };
            for (const s of rows) {
                const gid = s.groupId || s.id;
                const cur = byGroup.get(gid);
                if (!cur || score(s) > score(cur))
                    byGroup.set(gid, s);
            }
            return Array.from(byGroup.values());
        }
        async applyForShift(shiftId, userId) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
            if (!shift)
                throw new common_1.BadRequestException('Shift not found');
            // Validate that employee belongs to the same business as the shift
            if (shift.businessId !== employee.businessId) {
                throw new common_1.BadRequestException('Access denied: Cannot apply for shift in another business');
            }
            if (shift.status !== 'OPEN')
                throw new common_1.BadRequestException('Shift is not open for application');
            // Check if already applied
            const existing = await this.prisma.shiftApplication.findUnique({
                where: {
                    shiftId_employeeId: {
                        shiftId,
                        employeeId: employee.id
                    }
                }
            });
            if (existing)
                throw new common_1.BadRequestException('Already applied for this shift');
            const application = await this.prisma.shiftApplication.create({
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
        async declineShiftApplication(applicationId, user) {
            const app = await this.prisma.shiftApplication.findUnique({
                where: { id: applicationId },
                include: { shift: true, employee: { include: { user: true } } }
            });
            if (!app)
                throw new common_1.BadRequestException('Application not found');
            await this.validateBusinessAccess(app.shift.businessId, user);
            // Update application status
            await this.prisma.shiftApplication.update({
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
        async approveShiftApplication(applicationId, user) {
            const app = await this.prisma.shiftApplication.findUnique({
                where: { id: applicationId },
                include: { shift: true, employee: { include: { user: true } } }
            });
            if (!app)
                throw new common_1.BadRequestException('Application not found');
            await this.validateBusinessAccess(app.shift.businessId, user);
            const start = new Date(app.shift.startTime);
            const end = app.shift.endTime ? new Date(app.shift.endTime) : undefined;
            const ok = await this.validateAvailability(app.employeeId, start, end);
            if (!ok.ok) {
                throw new common_1.BadRequestException(ok.message);
            }
            // Update application status
            await this.prisma.shiftApplication.update({
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
            const callout = await this.prisma.shiftCallout.findUnique({ where: { shiftId: app.shiftId } }).catch(() => null);
            if (callout && !callout.resolvedAt) {
                const reassignedAt = new Date();
                const acceptedAt = app.createdAt ? new Date(app.createdAt) : reassignedAt;
                const responseMinutes = callout.noticeAt
                    ? Math.max(0, Math.round((acceptedAt.getTime() - new Date(callout.noticeAt).getTime()) / (1000 * 60)))
                    : null;
                await this.prisma.shiftCoverage.create({
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
                        responseMinutes: responseMinutes !== null && responseMinutes !== void 0 ? responseMinutes : null
                    }
                });
                await this.prisma.shiftCallout.update({
                    where: { id: callout.id },
                    data: { status: 'COVERED', resolvedAt: reassignedAt, resolvedByUserId: this.resolveActorUserId(user) || null }
                });
            }
            // Reject other applications for this shift
            await this.prisma.shiftApplication.updateMany({
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
        async getMyShifts(userId, start, end) {
            var _a;
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            const shifts = await this.prisma.shift.findMany({
                where: {
                    employeeId: employee.id,
                    startTime: { gte: start },
                    endTime: { lte: end },
                    status: 'PUBLISHED',
                },
                include: { location: true, employee: true, callout: true },
                orderBy: { startTime: 'asc' }
            });
            let totalHours = 0;
            let totalBreakMinutes = 0;
            for (const s of shifts) {
                const hours = s.endTime ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60) : 0;
                totalHours += Math.max(0, hours);
                const plannedBreakMinutesRaw = Number(s.breakMinutes || 0);
                const plannedBreakMinutes = Number.isFinite(plannedBreakMinutesRaw) ? Math.max(0, plannedBreakMinutesRaw) : 0;
                const requiredUnpaidBreakMinutes = hours >= 8 ? 30 : 0;
                totalBreakMinutes += Math.max(plannedBreakMinutes, requiredUnpaidBreakMinutes);
            }
            const netHours = Math.max(0, totalHours - (totalBreakMinutes / 60));
            const rate = employee.hourlyRate || 0;
            let payableHours = netHours;
            let estimatedEarnings = Number((netHours * rate).toFixed(2));
            if (employee.payType === 'HOURLY' && ((_a = employee.overtimeEligible) !== null && _a !== void 0 ? _a : true)) {
                const weeklyHours = {};
                for (const s of shifts) {
                    if (!s.endTime)
                        continue;
                    let durationMs = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
                    const shiftHours = Math.max(0, durationMs / (1000 * 60 * 60));
                    const plannedBreakMinutesRaw = Number(s.breakMinutes || 0);
                    const plannedBreakMinutes = Number.isFinite(plannedBreakMinutesRaw) ? Math.max(0, plannedBreakMinutesRaw) : 0;
                    const requiredUnpaidBreakMinutes = shiftHours >= 8 ? 30 : 0;
                    const breakMinutes = Math.max(plannedBreakMinutes, requiredUnpaidBreakMinutes);
                    durationMs -= breakMinutes * 60 * 1000;
                    const netShiftHours = Math.max(0, durationMs / (1000 * 60 * 60));
                    const date = new Date(s.startTime);
                    const day = date.getDay();
                    const diff = date.getDate() - day;
                    const weekStart = new Date(date.setDate(diff));
                    weekStart.setHours(0, 0, 0, 0);
                    const weekKey = weekStart.toISOString().split('T')[0];
                    weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + netShiftHours;
                }
                let reg = 0;
                let ot = 0;
                Object.values(weeklyHours).forEach(wt => {
                    if (wt > 40) {
                        reg += 40;
                        ot += wt - 40;
                    }
                    else {
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
        async getMyPeerShifts(userId, start, end) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            const myShifts = await this.prisma.shift.findMany({
                where: {
                    employeeId: employee.id,
                    startTime: { gte: start },
                    endTime: { lte: end },
                    status: 'PUBLISHED',
                },
                select: { locationId: true },
            });
            const locationIds = Array.from(new Set(myShifts.map(s => s.locationId).filter(Boolean)));
            if (locationIds.length === 0)
                return [];
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
                include: { employee: true, location: true, applications: { include: { employee: true } } },
                orderBy: { startTime: 'asc' }
            });
        }
        async updateShift(id, data, user) {
            var _a, _b, _c, _d, _e, _f, _g;
            const before = await this.prisma.shift.findUnique({ where: { id } });
            if (!before)
                throw new common_1.BadRequestException('Shift not found');
            await this.validateBusinessAccess(before.businessId, user);
            const now = new Date();
            if (now.getTime() >= new Date(before.startTime).getTime()) {
                throw new common_1.BadRequestException('This shift is locked because it has already started');
            }
            const beforeStatus = String((before === null || before === void 0 ? void 0 : before.status) || '').toUpperCase();
            const nextStatus = typeof (data === null || data === void 0 ? void 0 : data.status) === 'string' ? String(data.status).toUpperCase() : null;
            if (nextStatus && (nextStatus === 'PUBLISHED' || nextStatus === 'OPEN')) {
                throw new common_1.BadRequestException('Use Publish to make schedules visible to employees');
            }
            const groupId = before.groupId || before.id;
            const nextStart = data.startTime ? new Date(data.startTime) : new Date(before.startTime);
            const nextEnd = data.endTime ? new Date(data.endTime) : new Date(before.endTime);
            const nextNotes = typeof data.notes !== 'undefined' ? data.notes : before.notes;
            const breakMinutesRaw = data.breakMinutes;
            const nextBreakMinutes = typeof breakMinutesRaw === 'number'
                ? Math.max(0, Math.trunc(breakMinutesRaw))
                : typeof breakMinutesRaw === 'string'
                    ? Math.max(0, Math.trunc(parseInt(breakMinutesRaw, 10) || 0))
                    : ((_a = before.breakMinutes) !== null && _a !== void 0 ? _a : 0);
            let nextEmployeeId = before.employeeId || null;
            if ((_c = (_b = data.employee) === null || _b === void 0 ? void 0 : _b.connect) === null || _c === void 0 ? void 0 : _c.id)
                nextEmployeeId = data.employee.connect.id;
            if ((_d = data.employee) === null || _d === void 0 ? void 0 : _d.disconnect)
                nextEmployeeId = null;
            let nextLocationId = before.locationId || null;
            if ((_f = (_e = data.location) === null || _e === void 0 ? void 0 : _e.connect) === null || _f === void 0 ? void 0 : _f.id)
                nextLocationId = data.location.connect.id;
            if ((_g = data.location) === null || _g === void 0 ? void 0 : _g.disconnect)
                nextLocationId = null;
            const placementChanged = before.employeeId !== nextEmployeeId ||
                before.locationId !== nextLocationId ||
                new Date(before.startTime).getTime() !== nextStart.getTime() ||
                (before.endTime ? new Date(before.endTime).getTime() : null) !== (nextEnd ? nextEnd.getTime() : null);
            if (placementChanged) {
                const now = new Date();
                if (now.getTime() >= new Date(before.startTime).getTime()) {
                    throw new common_1.BadRequestException('This shift is locked because it has already started');
                }
                if (before.employeeId) {
                    const trackedTimesheet = await this.prisma.timesheet.findFirst({
                        where: {
                            employeeId: before.employeeId,
                            ...(before.locationId ? { locationId: before.locationId } : {}),
                            startTime: { lte: before.endTime || before.startTime },
                            OR: [
                                { endTime: null },
                                { endTime: { gte: before.startTime } },
                            ],
                        },
                        include: {
                            breaks: {
                                where: { endTime: null },
                                select: { id: true, type: true, startTime: true },
                            },
                        },
                        orderBy: { startTime: 'desc' },
                    });
                    if (trackedTimesheet) {
                        const shiftStartMs = new Date(before.startTime).getTime();
                        const shiftEndMs = before.endTime ? new Date(before.endTime).getTime() : shiftStartMs;
                        const timesheetStartMs = new Date(trackedTimesheet.startTime).getTime();
                        const timesheetEndMs = trackedTimesheet.endTime ? new Date(trackedTimesheet.endTime).getTime() : now.getTime();
                        if (timesheetStartMs <= shiftEndMs && timesheetEndMs >= shiftStartMs) {
                            const hasActiveBreak = Array.isArray(trackedTimesheet.breaks) && trackedTimesheet.breaks.length > 0;
                            const stateLabel = hasActiveBreak ? 'on break' : trackedTimesheet.endTime ? 'clocked out' : 'clocked in';
                            throw new common_1.BadRequestException(`This shift is locked because the employee has already ${stateLabel} for this scheduled location`);
                        }
                    }
                }
            }
            const shouldEnforceAvailability = beforeStatus !== 'DRAFT' &&
                beforeStatus !== 'PUBLISHED' &&
                beforeStatus !== 'OPEN' &&
                nextStatus !== 'DRAFT';
            if (nextEmployeeId) {
                const employee = await this.prisma.employee.findUnique({ where: { id: nextEmployeeId } });
                if (!employee || employee.status !== 'ACTIVE') {
                    throw new common_1.BadRequestException('Cannot schedule a deactivated employee');
                }
                if (shouldEnforceAvailability) {
                    const ok = await this.validateAvailability(nextEmployeeId, nextStart, nextEnd);
                    if (!ok.ok)
                        throw new common_1.BadRequestException(ok.message);
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
                    where: { businessId: before.businessId, groupId, status: 'DRAFT' },
                });
                const actorUserId = this.resolveActorUserId(user);
                if (actorUserId) {
                    await this.audit.logAction({
                        businessId: before.businessId,
                        userId: actorUserId,
                        action: 'SHIFT_DRAFT_CREATED',
                        resource: 'SHIFT',
                        resourceId: (existingDraft === null || existingDraft === void 0 ? void 0 : existingDraft.id) || before.id,
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
                        },
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
                    },
                });
            }
            if (beforeStatus === 'ARCHIVED') {
                throw new common_1.BadRequestException('Cannot edit an archived shift');
            }
            return this.prisma.shift.update({
                where: { id },
                data: {
                    ...(typeof data.startTime !== 'undefined' ? { startTime: nextStart } : {}),
                    ...(typeof data.endTime !== 'undefined' ? { endTime: nextEnd } : {}),
                    ...(typeof data.breakMinutes !== 'undefined' ? { breakMinutes: nextBreakMinutes } : {}),
                    ...(typeof data.notes !== 'undefined' ? { notes: nextNotes } : {}),
                    ...(typeof nextStatus === 'string' ? { status: nextStatus } : {}),
                    employeeId: nextEmployeeId,
                    locationId: nextLocationId,
                },
            });
        }
        async deleteShift(id, user) {
            const shift = await this.prisma.shift.findUnique({ where: { id } });
            if (!shift)
                throw new common_1.BadRequestException('Shift not found');
            await this.validateBusinessAccess(shift.businessId, user);
            const now = new Date();
            if (now.getTime() >= new Date(shift.startTime).getTime()) {
                throw new common_1.BadRequestException('This shift is locked because it has already started');
            }
            if (shift.employeeId) {
                const trackedTimesheet = await this.prisma.timesheet.findFirst({
                    where: {
                        employeeId: shift.employeeId,
                        ...(shift.locationId ? { locationId: shift.locationId } : {}),
                        startTime: { lte: shift.endTime || shift.startTime },
                        OR: [{ endTime: null }, { endTime: { gte: shift.startTime } }],
                    },
                    include: {
                        breaks: {
                            where: { endTime: null },
                            select: { id: true, type: true, startTime: true },
                        },
                    },
                    orderBy: { startTime: 'desc' },
                });
                if (trackedTimesheet) {
                    const shiftStartMs = new Date(shift.startTime).getTime();
                    const shiftEndMs = shift.endTime ? new Date(shift.endTime).getTime() : shiftStartMs;
                    const timesheetStartMs = new Date(trackedTimesheet.startTime).getTime();
                    const timesheetEndMs = trackedTimesheet.endTime ? new Date(trackedTimesheet.endTime).getTime() : now.getTime();
                    if (timesheetStartMs <= shiftEndMs && timesheetEndMs >= shiftStartMs) {
                        const hasActiveBreak = Array.isArray(trackedTimesheet.breaks) && trackedTimesheet.breaks.length > 0;
                        const stateLabel = hasActiveBreak ? 'on break' : trackedTimesheet.endTime ? 'clocked out' : 'clocked in';
                        throw new common_1.BadRequestException(`This shift is locked because the employee has already ${stateLabel} for this scheduled location`);
                    }
                }
            }
            const status = String(shift.status || '').toUpperCase();
            const groupId = shift.groupId || shift.id;
            if (status === 'PUBLISHED' || status === 'OPEN') {
                const active = await this.prisma.shift.findFirst({
                    where: { businessId: shift.businessId, groupId, status: { in: ['PUBLISHED', 'OPEN'] } },
                    orderBy: { createdAt: 'desc' }
                });
                const drafts = await this.prisma.shift.findMany({
                    where: { businessId: shift.businessId, groupId, status: { in: ['DRAFT', 'CANCELLED'] } },
                    select: { id: true }
                });
                if (drafts.length) {
                    await this.prisma.shift.deleteMany({ where: { id: { in: drafts.map(d => d.id) } } });
                }
                if (active) {
                    await this.prisma.shift.update({ where: { id: active.id }, data: { status: 'ARCHIVED' } });
                    if (active.employeeId) {
                        const employee = await this.prisma.employee.findUnique({
                            where: { id: active.employeeId },
                            include: { user: true }
                        });
                        if (employee === null || employee === void 0 ? void 0 : employee.userId) {
                            const title = 'Shift cancelled';
                            const msg = `Your shift on ${new Date(active.startTime).toLocaleString()} was cancelled.`;
                            const metadata = { kind: 'SHIFT_CANCELLED', shiftId: active.id, groupId, startTime: active.startTime, endTime: active.endTime };
                            await this.notifications.createNotification(employee.userId, 'WARNING', title, msg, metadata);
                            await this.notifications.sendPush(employee.userId, { type: 'WARNING', title, message: msg, metadata, actionUrl: '/dashboard/scheduling' });
                            await this.push.send(employee.userId, { type: 'WARNING', title, message: msg, metadata, actionUrl: '/dashboard/scheduling' });
                        }
                    }
                    return active;
                }
                return shift;
            }
            const published = await this.prisma.shift.findFirst({
                where: { businessId: shift.businessId, groupId, status: { in: ['PUBLISHED', 'OPEN'] } },
                orderBy: { createdAt: 'desc' }
            });
            await this.prisma.shift.delete({ where: { id } });
            return published ? published : shift;
        }
        async publishShifts(businessId, start, end, user) {
            await this.validateBusinessAccess(businessId, user);
            const drafts = await this.prisma.shift.findMany({
                where: {
                    businessId,
                    startTime: { gte: start },
                    endTime: { lte: end },
                    status: { in: ['DRAFT', 'CANCELLED'] }
                },
                include: { employee: true }
            });
            const violations = [];
            for (const s of drafts) {
                if (String(s.status || '').toUpperCase() !== 'DRAFT')
                    continue;
                if (s.employeeId) {
                    const ok = await this.validateAvailability(s.employeeId, new Date(s.startTime), s.endTime ? new Date(s.endTime) : undefined);
                    if (!ok.ok) {
                        const name = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : s.employeeId;
                        violations.push(`${name}: ${ok.message}`);
                    }
                }
            }
            if (violations.length > 0) {
                throw new common_1.BadRequestException(`Cannot publish. ${violations.join(' | ')}`);
            }
            const draftsByGroup = new Map();
            for (const s of drafts) {
                const gid = s.groupId || s.id;
                const existing = draftsByGroup.get(gid);
                if (!existing)
                    draftsByGroup.set(gid, s);
                else {
                    const exStatus = String(existing.status || '').toUpperCase();
                    const sStatus = String(s.status || '').toUpperCase();
                    if (exStatus !== 'DRAFT' && sStatus === 'DRAFT')
                        draftsByGroup.set(gid, s);
                }
            }
            for (const s of draftsByGroup.values()) {
                const gid = s.groupId || s.id;
                const st = String(s.status || '').toUpperCase();
                const active = await this.prisma.shift.findFirst({
                    where: { businessId, groupId: gid, status: { in: ['PUBLISHED', 'OPEN'] } },
                    orderBy: { createdAt: 'desc' }
                });
                if (st === 'CANCELLED') {
                    if (active) {
                        await this.prisma.shift.update({ where: { id: active.id }, data: { status: 'ARCHIVED' } });
                    }
                    await this.prisma.shift.delete({ where: { id: s.id } });
                    continue;
                }
                const nextStatus = s.employeeId ? 'PUBLISHED' : 'OPEN';
                await this.prisma.shift.update({ where: { id: s.id }, data: { status: nextStatus } });
                if (active) {
                    await this.prisma.shift.update({ where: { id: active.id }, data: { status: 'ARCHIVED' } });
                }
            }
            const employeeUsers = await this.prisma.user.findMany({
                where: { employeeProfiles: { some: { businessId, status: 'ACTIVE', userId: { not: null } } } },
                select: { id: true, email: true }
            });
            const business = await this.prisma.business.findUnique({ where: { id: businessId } });
            const superAdmins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
            const adminUsers = [];
            if (business === null || business === void 0 ? void 0 : business.ownerId) {
                const owner = await this.prisma.user.findUnique({ where: { id: business.ownerId } });
                if (owner)
                    adminUsers.push({ id: owner.id, email: owner.email || null });
            }
            for (const sa of superAdmins) {
                adminUsers.push({ id: sa.id, email: sa.email || null });
            }
            const managers = await this.prisma.employee.findMany({
                where: { businessId, role: 'MANAGER' },
                include: { user: true }
            });
            const managerUsers = managers.map(m => m.user).filter(Boolean);
            const allUsersMap = new Map();
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
        async autoSchedule(businessId, start, end, user, opts) {
            var _a;
            await this.validateBusinessAccess(businessId, user);
            const clientId = (opts === null || opts === void 0 ? void 0 : opts.clientId) && opts.clientId !== 'all' ? String(opts.clientId) : null;
            const draftShifts = await this.prisma.shift.findMany({
                where: {
                    businessId,
                    status: 'DRAFT',
                    employeeId: null,
                    startTime: { gte: start },
                    endTime: { lte: end },
                    locationId: { not: null },
                },
                include: { location: { include: { client: true } } },
                orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
            });
            const targetShifts = clientId
                ? draftShifts.filter(s => { var _a; return ((_a = s === null || s === void 0 ? void 0 : s.location) === null || _a === void 0 ? void 0 : _a.clientId) === clientId; })
                : draftShifts;
            if (targetShifts.length === 0) {
                return { assigned: 0, unfilled: 0, total: 0 };
            }
            const employees = await this.prisma.employee.findMany({
                where: { businessId, status: 'ACTIVE' },
                select: { id: true, firstName: true, lastName: true, defaultLocationId: true },
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            });
            if (employees.length === 0) {
                return { assigned: 0, unfilled: targetShifts.length, total: targetShifts.length };
            }
            const employeeIds = employees.map(e => e.id);
            const existing = await this.prisma.shift.findMany({
                where: {
                    businessId,
                    employeeId: { in: employeeIds },
                    status: { in: ['DRAFT', 'PUBLISHED', 'OPEN', 'COMPLETED'] },
                    startTime: { lte: end },
                    endTime: { gte: start },
                },
                select: { employeeId: true, startTime: true, endTime: true, breakMinutes: true, groupId: true },
            });
            const minutesByEmployee = new Map();
            for (const id of employeeIds)
                minutesByEmployee.set(id, 0);
            for (const s of existing) {
                const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
                const mins = Math.max(0, Math.trunc(ms / 60000) - Math.max(0, Math.trunc(s.breakMinutes || 0)));
                minutesByEmployee.set(s.employeeId, (minutesByEmployee.get(s.employeeId) || 0) + mins);
            }
            const leaveRequests = await this.prisma.leaveRequest.findMany({
                where: {
                    employeeId: { in: employeeIds },
                    status: 'APPROVED',
                    startDate: { lte: end },
                    endDate: { gte: start },
                },
                select: { employeeId: true, startDate: true, endDate: true, resumedAt: true, isAllDay: true, startTime: true, endTime: true },
            });
            const leaveByEmployee = new Map();
            for (const r of leaveRequests) {
                const arr = leaveByEmployee.get(r.employeeId) || [];
                arr.push(r);
                leaveByEmployee.set(r.employeeId, arr);
            }
            const isOnLeave = (employeeId, s, e) => {
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
                            if (s < t1 && e > t0)
                                return true;
                            continue;
                        }
                    }
                    if (s <= leaveEnd && e >= leaveStart)
                        return true;
                }
                return false;
            };
            let assigned = 0;
            for (const shift of targetShifts) {
                const shiftStart = new Date(shift.startTime);
                const shiftEnd = new Date(shift.endTime);
                const shiftLocationId = shift.locationId;
                const shiftClientId = ((_a = shift === null || shift === void 0 ? void 0 : shift.location) === null || _a === void 0 ? void 0 : _a.clientId) ? String(shift.location.clientId) : null;
                const sorted = [...employees].sort((a, b) => {
                    const aMins = minutesByEmployee.get(a.id) || 0;
                    const bMins = minutesByEmployee.get(b.id) || 0;
                    if (aMins !== bMins)
                        return aMins - bMins;
                    const aLoc = a.defaultLocationId && shiftLocationId && a.defaultLocationId === shiftLocationId ? 0 : 1;
                    const bLoc = b.defaultLocationId && shiftLocationId && b.defaultLocationId === shiftLocationId ? 0 : 1;
                    if (aLoc !== bLoc)
                        return aLoc - bLoc;
                    const aName = `${a.lastName} ${a.firstName}`;
                    const bName = `${b.lastName} ${b.firstName}`;
                    return aName.localeCompare(bName);
                });
                let picked = null;
                for (const emp of sorted) {
                    if (isOnLeave(emp.id, shiftStart, shiftEnd))
                        continue;
                    const ok = await this.validateAvailability(emp.id, shiftStart, shiftEnd);
                    if (!ok.ok)
                        continue;
                    try {
                        await this.assertNoShiftOverlap({
                            employeeId: emp.id,
                            start: shiftStart,
                            end: shiftEnd,
                            excludeGroupId: shift.groupId || null,
                            excludeShiftId: shift.id,
                        });
                    }
                    catch {
                        continue;
                    }
                    if (clientId && shiftClientId && clientId !== shiftClientId)
                        continue;
                    picked = emp.id;
                    break;
                }
                if (!picked)
                    continue;
                await this.prisma.shift.update({
                    where: { id: shift.id },
                    data: { employeeId: picked },
                });
                const ms = shiftEnd.getTime() - shiftStart.getTime();
                const mins = Math.max(0, Math.trunc(ms / 60000) - Math.max(0, Math.trunc(shift.breakMinutes || 0)));
                minutesByEmployee.set(picked, (minutesByEmployee.get(picked) || 0) + mins);
                assigned++;
            }
            const total = targetShifts.length;
            const unfilled = total - assigned;
            return { assigned, unfilled, total };
        }
        async getBusinessId(userId) {
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness)
                return ownedBusiness.id;
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee)
                return employee.businessId;
            throw new common_1.BadRequestException('User is not associated with a business');
        }
        async validateAvailability(employeeId, start, end) {
            const records = await this.prisma.availability.findMany({
                where: { employeeId },
                orderBy: { createdAt: 'desc' }
            });
            if (!records || records.length === 0)
                return { ok: true };
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][start.getDay()];
            const applies = (rec, date) => {
                const rep = String(rec.repeat || '').toUpperCase();
                if (rep === 'WEEKLY') {
                    const days = typeof rec.repeatDays === 'string' ? rec.repeatDays.split(',') : [];
                    if (!days.includes(dayKey))
                        return false;
                    if (String(rec.endOption || '').toUpperCase() === 'ENDS_ON' && rec.endOn) {
                        if (date > new Date(rec.endOn))
                            return false;
                    }
                    return true;
                }
                const sd = rec.startDate ? new Date(rec.startDate) : null;
                const ed = rec.endDate ? new Date(rec.endDate) : null;
                if (!sd)
                    return false;
                const d0 = new Date(sd);
                d0.setHours(0, 0, 0, 0);
                const d1 = new Date(sd);
                d1.setHours(23, 59, 59, 999);
                const sameDay = date.toDateString() === sd.toDateString();
                if (ed) {
                    return date >= d0 && date <= ed;
                }
                return sameDay;
            };
            const withinTime = (rec, s, e) => {
                if (!!rec.allDay)
                    return true;
                const sd = new Date(rec.startDate);
                const ed = rec.endDate ? new Date(rec.endDate) : null;
                const startMinutes = sd.getHours() * 60 + sd.getMinutes();
                const endMinutes = ed ? (ed.getHours() * 60 + ed.getMinutes()) : (23 * 60 + 59);
                const sMin = s.getHours() * 60 + s.getMinutes();
                const eMin = e ? (e.getHours() * 60 + e.getMinutes()) : sMin;
                return sMin >= startMinutes && eMin <= endMinutes;
            };
            const overlapsTime = (rec, s, e) => {
                if (!!rec.allDay)
                    return true;
                const sd = new Date(rec.startDate);
                const ed = rec.endDate ? new Date(rec.endDate) : null;
                const startMinutes = sd.getHours() * 60 + sd.getMinutes();
                const endMinutes = ed ? (ed.getHours() * 60 + ed.getMinutes()) : (23 * 60 + 59);
                const sMin = s.getHours() * 60 + s.getMinutes();
                const eMin = e ? (e.getHours() * 60 + e.getMinutes()) : sMin;
                return sMin < endMinutes && eMin > startMinutes;
            };
            const availableWindows = [];
            let blocked = false;
            for (const r of records) {
                if (!applies(r, start))
                    continue;
                if (r.isAvailable) {
                    if (!!r.allDay) {
                        availableWindows.push({ startMin: 0, endMin: 24 * 60 - 1 });
                    }
                    else {
                        const sd = new Date(r.startDate);
                        const ed = r.endDate ? new Date(r.endDate) : null;
                        const startMin = sd.getHours() * 60 + sd.getMinutes();
                        const endMin = ed ? (ed.getHours() * 60 + ed.getMinutes()) : (24 * 60 - 1);
                        availableWindows.push({ startMin, endMin });
                    }
                }
                else {
                    const overlaps = !!r.allDay || overlapsTime(r, start, end);
                    if (overlaps)
                        blocked = true;
                }
            }
            const sMin = start.getHours() * 60 + start.getMinutes();
            const eMin = end ? (end.getHours() * 60 + end.getMinutes()) : sMin;
            const fits = availableWindows.length === 0
                ? !blocked
                : availableWindows.some(w => sMin >= w.startMin && eMin <= w.endMin) && !blocked;
            if (fits)
                return { ok: true };
            const next = await this.nextAvailable(employeeId, start);
            const msgBase = 'Employee is not available for that period';
            const message = next ? `${msgBase}. Next available: ${next.label}` : msgBase;
            return { ok: false, message };
        }
        async nextAvailable(employeeId, from) {
            const records = await this.prisma.availability.findMany({
                where: { employeeId },
                orderBy: { createdAt: 'desc' }
            });
            if (!records || records.length === 0)
                return null;
            for (let i = 0; i < 30; i++) {
                const d = new Date(from);
                d.setDate(from.getDate() + i);
                const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];
                const windows = [];
                for (const r of records) {
                    const rep = String(r.repeat || '').toUpperCase();
                    const appliesWeekly = rep === 'WEEKLY' && (typeof r.repeatDays === 'string' ? r.repeatDays.split(',').includes(dayKey) : false);
                    const appliesOnce = r.startDate && new Date(r.startDate).toDateString() === d.toDateString();
                    if (!(appliesWeekly || appliesOnce))
                        continue;
                    if (!r.isAvailable)
                        continue;
                    if (!!r.allDay) {
                        windows.push({ startMin: 0, endMin: 24 * 60 - 1 });
                    }
                    else {
                        const sd = new Date(r.startDate);
                        const ed = r.endDate ? new Date(r.endDate) : null;
                        const startMin = sd.getHours() * 60 + sd.getMinutes();
                        const endMin = ed ? (ed.getHours() * 60 + ed.getMinutes()) : (24 * 60 - 1);
                        windows.push({ startMin, endMin });
                    }
                }
                if (windows.length > 0) {
                    const w = windows.sort((a, b) => a.startMin - b.startMin)[0];
                    const startH = Math.floor(w.startMin / 60);
                    const startM = w.startMin % 60;
                    const endH = Math.floor(w.endMin / 60);
                    const endM = w.endMin % 60;
                    const fmt = (h, m) => {
                        const hh = ((h % 12) || 12);
                        const mm = m.toString().padStart(2, '0');
                        const ap = h >= 12 ? 'PM' : 'AM';
                        return `${hh}:${mm} ${ap}`;
                    };
                    const label = `${d.toDateString()} ${fmt(startH, startM)} - ${fmt(endH, endM)}`;
                    return { date: d, label };
                }
            }
            return null;
        }
        async handleShiftReminders() {
            var _a, _b, _c, _d, _e, _f, _g;
            const logger = new common_1.Logger('ShiftReminders');
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
                    },
                    include: { employee: { include: { user: true } } }
                });
                for (const s of shifts1h) {
                    const shift = s;
                    if (!((_a = shift.employee) === null || _a === void 0 ? void 0 : _a.user))
                        continue;
                    const title = 'Upcoming Shift Reminder';
                    const msg = `Your shift starts in about 1 hour at ${new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
                    await this.sendReminder(shift.employee.user.id, shift.employee.user.email, title, msg, shift.id, '/dashboard/scheduling');
                    await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderSent1h: true } });
                    logger.log(`Sent 1h reminder for shift ${shift.id}`);
                }
                // 30 Min
                const shifts30m = await this.prisma.shift.findMany({
                    where: {
                        status: 'PUBLISHED',
                        employeeId: { not: null },
                        startTime: { gte: start30m, lte: end30m },
                        reminderSent30m: false
                    },
                    include: { employee: { include: { user: true } } }
                });
                for (const s of shifts30m) {
                    const shift = s;
                    if (!((_b = shift.employee) === null || _b === void 0 ? void 0 : _b.user))
                        continue;
                    const title = 'Shift Starts Soon';
                    const msg = `Your shift starts in 30 minutes. Please be prepared and on site.`;
                    await this.sendReminder(shift.employee.user.id, shift.employee.user.email, title, msg, shift.id, '/dashboard/scheduling');
                    await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderSent30m: true } });
                    logger.log(`Sent 30m reminder for shift ${shift.id}`);
                }
                // 15 Min
                const shifts15m = await this.prisma.shift.findMany({
                    where: {
                        status: 'PUBLISHED',
                        employeeId: { not: null },
                        startTime: { gte: start15m, lte: end15m },
                        reminderSent10m: false
                    },
                    include: { employee: { include: { user: true } } }
                });
                for (const s of shifts15m) {
                    const shift = s;
                    if (!((_c = shift.employee) === null || _c === void 0 ? void 0 : _c.user))
                        continue;
                    const title = 'Clock In Reminder';
                    const msg = `Your shift starts in 15 minutes. Please get ready to clock in on time.`;
                    await this.sendReminder(shift.employee.user.id, shift.employee.user.email, title, msg, shift.id, '/dashboard/time');
                    await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderSent10m: true } });
                    logger.log(`Sent 15m reminder for shift ${shift.id}`);
                }
                // Every 5 minutes after shift start until the employee clocks in
                const missedClockInShifts = await this.prisma.shift.findMany({
                    where: {
                        status: 'PUBLISHED',
                        employeeId: { not: null },
                        startTime: { lte: now },
                        endTime: { gt: now }
                    },
                    include: { employee: { include: { user: true } }, location: true }
                });
                for (const s of missedClockInShifts) {
                    const shift = s;
                    if (!shift.employeeId || !((_d = shift.employee) === null || _d === void 0 ? void 0 : _d.user))
                        continue;
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
                    if (activeOrCompletedTimesheet)
                        continue;
                    const minutesLate = Math.max(0, Math.floor((now.getTime() - shiftStart.getTime()) / 60000));
                    if (minutesLate === 0 || minutesLate % 5 !== 0)
                        continue;
                    const recentReminder = await this.prisma.auditLog.findFirst({
                        where: {
                            action: 'MISSED_CLOCK_IN_REMINDER',
                            resource: 'SHIFT',
                            resourceId: shift.id,
                            createdAt: { gte: new Date(now.getTime() - 4 * 60 * 1000) }
                        },
                        orderBy: { createdAt: 'desc' }
                    });
                    if (recentReminder)
                        continue;
                    const locationLabel = ((_e = shift.location) === null || _e === void 0 ? void 0 : _e.name) ? ` at ${shift.location.name}` : '';
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
                        }
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
                    },
                    include: { employee: { include: { user: true } } }
                });
                for (const s of end5mShifts) {
                    const shift = s;
                    if (!((_f = shift.employee) === null || _f === void 0 ? void 0 : _f.user))
                        continue;
                    const title = 'Shift Ending Soon';
                    const msg = `Your shift ends in 5 minutes. Please prepare to clock out.`;
                    await this.sendReminder(shift.employee.user.id, shift.employee.user.email, title, msg, shift.id, '/dashboard/time');
                    await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderEnd5mSent: true } });
                    logger.log(`Sent 5m-before-end reminder for shift ${shift.id}`);
                }
                // 10 minutes after end: if still clocked in, remind to clock out
                const endLate10mShifts = await this.prisma.shift.findMany({
                    where: {
                        status: 'PUBLISHED',
                        employeeId: { not: null },
                        endTime: { gte: endPlus10Start, lte: endPlus10End },
                        reminderEndLate10mSent: false
                    },
                    include: { employee: true }
                });
                for (const s of endLate10mShifts) {
                    const shift = s;
                    if (!shift.employeeId)
                        continue;
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
                        if (employee === null || employee === void 0 ? void 0 : employee.user) {
                            const title = 'Clock Out Reminder';
                            const msg = `Your scheduled shift ended 10 minutes ago. Please clock out.`;
                            await this.sendReminder(employee.user.id, employee.user.email || null, title, msg, shift.id, '/dashboard/time');
                            await this.prisma.shift.update({ where: { id: shift.id }, data: { reminderEndLate10mSent: true } });
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
                    }
                });
                for (const s of end1hShifts) {
                    const shift = s;
                    if (!shift.employeeId)
                        continue;
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
                        await this.prisma.shift.update({ where: { id: shift.id }, data: { autoClockout1hDone: true } });
                        logger.log(`Auto-clocked out employee ${shift.employeeId} for shift ${shift.id}`);
                    }
                }
                const openSoonStart = new Date(now.getTime() + 30 * 60000);
                const openSoonEnd = new Date(now.getTime() + 90 * 60000);
                const openShifts = await this.prisma.shift.findMany({
                    where: {
                        status: 'OPEN',
                        startTime: { gte: openSoonStart, lte: openSoonEnd }
                    },
                    include: { location: true }
                });
                for (const s of openShifts) {
                    const shift = s;
                    const recent = await this.prisma.auditLog.findFirst({
                        where: {
                            action: 'OPEN_SHIFT_REMINDER',
                            resource: 'SHIFT',
                            resourceId: shift.id,
                            createdAt: { gte: new Date(now.getTime() - 2 * 60 * 60000) }
                        },
                        orderBy: { createdAt: 'desc' }
                    });
                    if (recent)
                        continue;
                    const supervisors = await this.getAdminUsersForBusiness(shift.businessId);
                    const title = 'Unfilled shift reminder';
                    const locLabel = ((_g = shift.location) === null || _g === void 0 ? void 0 : _g.name) ? ` @ ${shift.location.name}` : '';
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
            }
            catch (e) {
                logger.error('Error sending shift reminders', e);
            }
        }
        async getMyAvailability(userId) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                return [];
            const records = await this.prisma.availability.findMany({
                where: { employeeId: employee.id, repeat: 'WEEKLY' }
            });
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayMapShort = { 'Sun': 'Sunday', 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday' };
            const uiData = days.map(d => ({ day: d, available: false, start: '', end: '' }));
            for (const r of records) {
                if (!r.isAvailable)
                    continue;
                // repeatDays might be comma separated, but for this simple UI we assume one record per day
                const dayKeys = (r.repeatDays || '').split(',');
                for (const key of dayKeys) {
                    const fullDay = dayMapShort[key];
                    if (!fullDay)
                        continue;
                    const item = uiData.find(d => d.day === fullDay);
                    if (item) {
                        item.available = true;
                        if (r.allDay) {
                            item.start = '';
                            item.end = '';
                        }
                        else {
                            item.start = new Date(r.startDate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                            item.end = r.endDate ? new Date(r.endDate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '';
                        }
                    }
                }
            }
            // Shift Sunday to end to match UI (Mon-Sun)
            const sunday = uiData.shift();
            if (sunday)
                uiData.push(sunday);
            return uiData;
        }
        async updateMyAvailability(userId, availabilityData) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('Employee profile not found');
            // Delete existing weekly availability
            await this.prisma.availability.deleteMany({
                where: { employeeId: employee.id, repeat: 'WEEKLY' }
            });
            const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 };
            const shortDayMap = { 'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun' };
            for (const item of availabilityData) {
                if (!item.available)
                    continue;
                const targetDay = dayMap[item.day];
                const shortDay = shortDayMap[item.day];
                // Calculate next occurrence
                const now = new Date();
                const currentDay = now.getDay();
                let daysUntil = targetDay - currentDay;
                if (daysUntil < 0)
                    daysUntil += 7;
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
                }
                else {
                    allDay = true;
                    startDateTime.setHours(0, 0, 0, 0);
                    endDateTime.setHours(23, 59, 59, 999);
                }
                await this.prisma.availability.create({
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
        async sendReminder(userId, email, title, message, shiftId, actionUrl) {
            await this.notifications.createNotification(userId, 'INFO', title, message, { shiftId });
            await this.notifications.sendPush(userId, { type: 'INFO', title, message, metadata: { shiftId } });
            await this.push.send(userId, { type: 'INFO', title, message, metadata: { shiftId }, actionUrl });
            if (email) {
                await this.notifications.sendEmail(email, title, message);
            }
        }
    };
    __setFunctionName(_classThis, "SchedulingService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _handleShiftReminders_decorators = [(0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE)];
        __esDecorate(_classThis, null, _handleShiftReminders_decorators, { kind: "method", name: "handleShiftReminders", static: false, private: false, access: { has: obj => "handleShiftReminders" in obj, get: obj => obj.handleShiftReminders }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SchedulingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SchedulingService = _classThis;
})();
exports.SchedulingService = SchedulingService;
