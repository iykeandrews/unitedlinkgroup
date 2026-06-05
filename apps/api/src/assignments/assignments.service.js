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
exports.AssignmentsService = void 0;
const common_1 = require("@nestjs/common");
let AssignmentsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AssignmentsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
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
            if (!employee)
                throw new common_1.BadRequestException('Access denied');
        }
        async findAll(user, businessIdHeader, query) {
            const actorUserId = this.resolveActorUserId(user);
            const businessId = businessIdHeader || (actorUserId ? await this.getBusinessIdFromUser(actorUserId) : null);
            if (!businessId)
                throw new common_1.BadRequestException('Business context required');
            await this.validateBusinessAccess(businessId, user);
            const where = { businessId };
            if (query === null || query === void 0 ? void 0 : query.status)
                where.status = String(query.status).toUpperCase();
            if (query === null || query === void 0 ? void 0 : query.priority)
                where.priority = String(query.priority).toUpperCase();
            if (query === null || query === void 0 ? void 0 : query.locationId)
                where.locationId = String(query.locationId);
            if (query === null || query === void 0 ? void 0 : query.assigneeId)
                where.assigneeId = String(query.assigneeId);
            if (query === null || query === void 0 ? void 0 : query.q) {
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
                    location: { include: { client: true } },
                    createdBy: true,
                },
            });
        }
        async findOne(user, id) {
            const item = await this.prisma.operationAssignment.findUnique({
                where: { id },
                include: {
                    assignee: true,
                    location: { include: { client: true } },
                    createdBy: true,
                },
            });
            if (!item)
                throw new common_1.NotFoundException('Assignment not found');
            await this.validateBusinessAccess(item.businessId, user);
            return item;
        }
        async create(user, dto, businessIdHeader) {
            var _a, _b, _c;
            const actorUserId = this.resolveActorUserId(user);
            const businessId = dto.businessId || businessIdHeader || (actorUserId ? await this.getBusinessIdFromUser(actorUserId) : null);
            if (!businessId)
                throw new common_1.BadRequestException('Business context required');
            await this.validateBusinessAccess(businessId, user);
            const status = dto.status ? String(dto.status).toUpperCase() : 'OPEN';
            const priority = dto.priority ? String(dto.priority).toUpperCase() : 'MEDIUM';
            const created = await this.prisma.operationAssignment.create({
                data: {
                    businessId,
                    title: dto.title,
                    description: (_a = dto.description) !== null && _a !== void 0 ? _a : null,
                    status,
                    priority,
                    locationId: (_b = dto.locationId) !== null && _b !== void 0 ? _b : null,
                    assigneeId: (_c = dto.assigneeId) !== null && _c !== void 0 ? _c : null,
                    startAt: dto.startAt ? new Date(dto.startAt) : null,
                    dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
                    createdByUserId: actorUserId || null,
                    completedAt: status === 'COMPLETED' ? new Date() : null,
                },
            });
            return this.findOne(user, created.id);
        }
        async update(user, id, dto) {
            var _a, _b, _c;
            const existing = await this.prisma.operationAssignment.findUnique({ where: { id } });
            if (!existing)
                throw new common_1.NotFoundException('Assignment not found');
            await this.validateBusinessAccess(existing.businessId, user);
            const nextStatus = dto.status ? String(dto.status).toUpperCase() : undefined;
            const nextPriority = dto.priority ? String(dto.priority).toUpperCase() : undefined;
            const updated = await this.prisma.operationAssignment.update({
                where: { id },
                data: {
                    ...(typeof dto.title !== 'undefined' ? { title: dto.title } : {}),
                    ...(typeof dto.description !== 'undefined' ? { description: (_a = dto.description) !== null && _a !== void 0 ? _a : null } : {}),
                    ...(typeof nextStatus !== 'undefined' ? { status: nextStatus } : {}),
                    ...(typeof nextPriority !== 'undefined' ? { priority: nextPriority } : {}),
                    ...(typeof dto.locationId !== 'undefined' ? { locationId: (_b = dto.locationId) !== null && _b !== void 0 ? _b : null } : {}),
                    ...(typeof dto.assigneeId !== 'undefined' ? { assigneeId: (_c = dto.assigneeId) !== null && _c !== void 0 ? _c : null } : {}),
                    ...(typeof dto.startAt !== 'undefined' ? { startAt: dto.startAt ? new Date(dto.startAt) : null } : {}),
                    ...(typeof dto.dueAt !== 'undefined' ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
                    ...(nextStatus === 'COMPLETED' ? { completedAt: new Date() } : nextStatus ? { completedAt: null } : {}),
                },
            });
            return this.findOne(user, updated.id);
        }
        async remove(user, id) {
            const existing = await this.prisma.operationAssignment.findUnique({ where: { id } });
            if (!existing)
                throw new common_1.NotFoundException('Assignment not found');
            await this.validateBusinessAccess(existing.businessId, user);
            await this.prisma.operationAssignment.delete({ where: { id } });
            return { ok: true };
        }
    };
    __setFunctionName(_classThis, "AssignmentsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AssignmentsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AssignmentsService = _classThis;
})();
exports.AssignmentsService = AssignmentsService;
