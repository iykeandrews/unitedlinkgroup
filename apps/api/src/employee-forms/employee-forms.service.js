"use strict";
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeFormsService = void 0;
const common_1 = require("@nestjs/common");
let EmployeeFormsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var EmployeeFormsService = _classThis = class {
        constructor(prisma, notifications, push) {
            this.prisma = prisma;
            this.notifications = notifications;
            this.push = push;
        }
        resolveActorUserId(user) {
            return (user === null || user === void 0 ? void 0 : user.userId) || (user === null || user === void 0 ? void 0 : user.sub) || (user === null || user === void 0 ? void 0 : user.id);
        }
        async getBusinessIdFromUser(userId) {
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness)
                return ownedBusiness.id;
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee)
                return employee.businessId;
            throw new common_1.BadRequestException('User is not associated with a business');
        }
        async validateBusinessAccess(targetBusinessId, user) {
            const business = await this.prisma.business.findUnique({ where: { id: targetBusinessId } });
            if (!business)
                throw new common_1.BadRequestException('Business not found');
            if (user.role === 'SUPER_ADMIN')
                return;
            const actorUserId = this.resolveActorUserId(user);
            if (!actorUserId)
                throw new common_1.BadRequestException('Invalid user');
            if (business.ownerId === actorUserId)
                return;
            const employee = await this.prisma.employee.findFirst({ where: { userId: actorUserId, businessId: targetBusinessId } });
            if (employee)
                return;
            throw new common_1.BadRequestException('Access denied');
        }
        async resolveBusinessId(user, businessId) {
            if (businessId)
                return businessId;
            const actorUserId = this.resolveActorUserId(user);
            if (!actorUserId)
                throw new common_1.BadRequestException('Business context required');
            return this.getBusinessIdFromUser(actorUserId);
        }
        async listTemplates(user, businessIdHeader, query) {
            const businessId = await this.resolveBusinessId(user, businessIdHeader || (query === null || query === void 0 ? void 0 : query.businessId));
            await this.validateBusinessAccess(businessId, user);
            const where = { businessId };
            if (query === null || query === void 0 ? void 0 : query.type)
                where.type = String(query.type).toUpperCase();
            if (query === null || query === void 0 ? void 0 : query.status)
                where.status = String(query.status).toUpperCase();
            if (query === null || query === void 0 ? void 0 : query.q) {
                const q = String(query.q);
                where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
            }
            return this.prisma.employeeFormTemplate.findMany({
                where,
                orderBy: [{ updatedAt: 'desc' }],
            });
        }
        async createTemplate(user, dto, businessIdHeader) {
            var _a, _b, _c, _d, _e;
            const businessId = await this.resolveBusinessId(user, dto.businessId || businessIdHeader);
            await this.validateBusinessAccess(businessId, user);
            const actorUserId = this.resolveActorUserId(user);
            const created = await this.prisma.employeeFormTemplate.create({
                data: {
                    businessId,
                    type: dto.type ? String(dto.type).toUpperCase() : 'EMPLOYMENT_FORM',
                    title: dto.title,
                    description: (_a = dto.description) !== null && _a !== void 0 ? _a : null,
                    status: dto.status ? String(dto.status).toUpperCase() : 'ACTIVE',
                    version: (_b = dto.version) !== null && _b !== void 0 ? _b : null,
                    body: (_c = dto.body) !== null && _c !== void 0 ? _c : null,
                    fields: (_d = dto.fields) !== null && _d !== void 0 ? _d : null,
                    fileUrl: (_e = dto.fileUrl) !== null && _e !== void 0 ? _e : null,
                    acknowledgementRequired: !!dto.acknowledgementRequired,
                    requiresSignature: true,
                    createdByUserId: actorUserId || null,
                },
            });
            return created;
        }
        async updateTemplate(user, id, dto) {
            var _a, _b, _c, _d, _e;
            const existing = await this.prisma.employeeFormTemplate.findUnique({ where: { id } });
            if (!existing)
                throw new common_1.NotFoundException('Template not found');
            await this.validateBusinessAccess(existing.businessId, user);
            return this.prisma.employeeFormTemplate.update({
                where: { id },
                data: {
                    ...(typeof dto.type !== 'undefined' ? { type: String(dto.type).toUpperCase() } : {}),
                    ...(typeof dto.title !== 'undefined' ? { title: dto.title } : {}),
                    ...(typeof dto.description !== 'undefined' ? { description: (_a = dto.description) !== null && _a !== void 0 ? _a : null } : {}),
                    ...(typeof dto.status !== 'undefined' ? { status: String(dto.status).toUpperCase() } : {}),
                    ...(typeof dto.version !== 'undefined' ? { version: (_b = dto.version) !== null && _b !== void 0 ? _b : null } : {}),
                    ...(typeof dto.body !== 'undefined' ? { body: (_c = dto.body) !== null && _c !== void 0 ? _c : null } : {}),
                    ...(typeof dto.fields !== 'undefined' ? { fields: (_d = dto.fields) !== null && _d !== void 0 ? _d : null } : {}),
                    ...(typeof dto.fileUrl !== 'undefined' ? { fileUrl: (_e = dto.fileUrl) !== null && _e !== void 0 ? _e : null } : {}),
                    ...(typeof dto.acknowledgementRequired !== 'undefined' ? { acknowledgementRequired: !!dto.acknowledgementRequired } : {}),
                    requiresSignature: true,
                },
            });
        }
        async archiveTemplate(user, id) {
            const existing = await this.prisma.employeeFormTemplate.findUnique({ where: { id } });
            if (!existing)
                throw new common_1.NotFoundException('Template not found');
            await this.validateBusinessAccess(existing.businessId, user);
            return this.prisma.employeeFormTemplate.update({ where: { id }, data: { status: 'ARCHIVED' } });
        }
        async assignTemplate(user, templateId, dto, businessIdHeader) {
            const template = await this.prisma.employeeFormTemplate.findUnique({ where: { id: templateId } });
            if (!template)
                throw new common_1.NotFoundException('Template not found');
            const businessId = await this.resolveBusinessId(user, businessIdHeader || template.businessId);
            await this.validateBusinessAccess(businessId, user);
            if (template.businessId !== businessId)
                throw new common_1.BadRequestException('Template does not belong to this business');
            const assignAll = String(dto.assignAll || '').toLowerCase() === 'true';
            let employeeIds = [];
            if (assignAll) {
                const all = await this.prisma.employee.findMany({ where: { businessId, status: 'ACTIVE' }, select: { id: true } });
                employeeIds = all.map(e => e.id);
            }
            else if (Array.isArray(dto.employeeIds)) {
                employeeIds = dto.employeeIds.map(String);
            }
            employeeIds = Array.from(new Set(employeeIds)).filter(Boolean);
            if (employeeIds.length === 0)
                throw new common_1.BadRequestException('No employees selected');
            const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
            const results = await Promise.allSettled(employeeIds.map(employeeId => this.prisma.employeeFormAssignment.upsert({
                where: { templateId_employeeId: { templateId, employeeId } },
                update: {
                    status: 'PENDING',
                    dueAt,
                    submittedAt: null,
                    values: null,
                    signatureName: null,
                    signedAt: null,
                },
                create: {
                    businessId,
                    templateId,
                    employeeId,
                    status: 'PENDING',
                    dueAt,
                },
            })));
            const assigned = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.length - assigned;
            return { assigned, failed };
        }
        async listAssignmentsAdmin(user, businessIdHeader, query) {
            const businessId = await this.resolveBusinessId(user, businessIdHeader || (query === null || query === void 0 ? void 0 : query.businessId));
            await this.validateBusinessAccess(businessId, user);
            const where = { businessId };
            if (query === null || query === void 0 ? void 0 : query.templateId)
                where.templateId = String(query.templateId);
            if (query === null || query === void 0 ? void 0 : query.status)
                where.status = String(query.status).toUpperCase();
            if (query === null || query === void 0 ? void 0 : query.employeeId)
                where.employeeId = String(query.employeeId);
            return this.prisma.employeeFormAssignment.findMany({
                where,
                orderBy: [{ updatedAt: 'desc' }],
                include: { employee: true, template: true },
            });
        }
        async listMyAssignments(user, query) {
            const actorUserId = this.resolveActorUserId(user);
            if (!actorUserId)
                throw new common_1.BadRequestException('Invalid user');
            const employee = await this.prisma.employee.findFirst({ where: { userId: actorUserId } });
            if (!employee)
                throw new common_1.BadRequestException('No employee profile found');
            const where = { employeeId: employee.id };
            if (query === null || query === void 0 ? void 0 : query.status)
                where.status = String(query.status).toUpperCase();
            return this.prisma.employeeFormAssignment.findMany({
                where,
                orderBy: [{ dueAt: 'asc' }, { assignedAt: 'desc' }],
                include: { template: true },
            });
        }
        async getMyAssignment(user, id) {
            const actorUserId = this.resolveActorUserId(user);
            if (!actorUserId)
                throw new common_1.BadRequestException('Invalid user');
            const employee = await this.prisma.employee.findFirst({ where: { userId: actorUserId } });
            if (!employee)
                throw new common_1.BadRequestException('No employee profile found');
            const item = await this.prisma.employeeFormAssignment.findUnique({
                where: { id },
                include: { template: true, business: true, employee: true },
            });
            if (!item)
                throw new common_1.NotFoundException('Assignment not found');
            if (item.employeeId !== employee.id)
                throw new common_1.BadRequestException('Access denied');
            return item;
        }
        async submitMyAssignment(user, id, dto) {
            var _a;
            const actorUserId = this.resolveActorUserId(user);
            if (!actorUserId)
                throw new common_1.BadRequestException('Invalid user');
            const employee = await this.prisma.employee.findFirst({ where: { userId: actorUserId } });
            if (!employee)
                throw new common_1.BadRequestException('No employee profile found');
            const assignment = await this.prisma.employeeFormAssignment.findUnique({
                where: { id },
                include: { template: true, business: true },
            });
            if (!assignment)
                throw new common_1.NotFoundException('Assignment not found');
            if (assignment.employeeId !== employee.id)
                throw new common_1.BadRequestException('Access denied');
            if (assignment.status === 'SUBMITTED')
                throw new common_1.BadRequestException('Form already submitted');
            if (!((_a = dto.signatureName) === null || _a === void 0 ? void 0 : _a.trim()))
                throw new common_1.BadRequestException('Signature name is required');
            const sig = typeof dto.signatureData === 'string' ? dto.signatureData.trim() : '';
            if (!sig)
                throw new common_1.BadRequestException('Signature is required');
            if (!sig.startsWith('data:image/'))
                throw new common_1.BadRequestException('Invalid signature format');
            if (sig.length > 900000)
                throw new common_1.BadRequestException('Signature is too large');
            const values = typeof dto.values === 'string' ? dto.values : null;
            const now = new Date();
            const signatureData = typeof dto.signatureData === 'string' ? dto.signatureData.trim() : null;
            const updated = await this.prisma.employeeFormAssignment.update({
                where: { id },
                data: {
                    status: 'SUBMITTED',
                    submittedAt: now,
                    values,
                    signatureName: dto.signatureName.trim(),
                    signatureData,
                    signedAt: now,
                },
                include: { template: true },
            });
            const template = (updated === null || updated === void 0 ? void 0 : updated.template) || {};
            const businessId = assignment.businessId;
            const business = await this.prisma.business.findUnique({ where: { id: businessId } });
            const recipients = new Set();
            if (business === null || business === void 0 ? void 0 : business.ownerId)
                recipients.add(business.ownerId);
            const admins = await this.prisma.employee.findMany({
                where: { businessId, role: { in: ['BUSINESS_ADMIN', 'MANAGER'] }, userId: { not: null } },
                select: { userId: true },
            });
            for (const a of admins) {
                if (a.userId)
                    recipients.add(a.userId);
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
        async adminGetAssignment(user, id) {
            const item = await this.prisma.employeeFormAssignment.findUnique({
                where: { id },
                include: { template: true, business: true, employee: true },
            });
            if (!item)
                throw new common_1.NotFoundException('Assignment not found');
            await this.validateBusinessAccess(item.businessId, user);
            return item;
        }
    };
    __setFunctionName(_classThis, "EmployeeFormsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmployeeFormsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmployeeFormsService = _classThis;
})();
exports.EmployeeFormsService = EmployeeFormsService;
