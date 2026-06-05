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
exports.ContractsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let ContractsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ContractsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        getUserId(user) {
            return (user === null || user === void 0 ? void 0 : user.userId) || (user === null || user === void 0 ? void 0 : user.sub) || (user === null || user === void 0 ? void 0 : user.id) || null;
        }
        async resolveBusinessId(user, headerBusinessId, queryBusinessId) {
            const fromHeaderOrQuery = queryBusinessId || headerBusinessId || null;
            if ((user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.SUPER_ADMIN) {
                if (!fromHeaderOrQuery)
                    throw new common_1.BadRequestException('Business context required for Super Admin');
                return fromHeaderOrQuery;
            }
            const userId = this.getUserId(user);
            if (!userId)
                throw new common_1.BadRequestException('Business context required');
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness)
                return ownedBusiness.id;
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee)
                return employee.businessId;
            throw new common_1.BadRequestException('User is not associated with a business');
        }
        async assertBusinessAccess(user, businessId) {
            if ((user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.SUPER_ADMIN)
                return;
            const userId = this.getUserId(user);
            if (!userId)
                throw new common_1.ForbiddenException();
            const owns = await this.prisma.business.findFirst({ where: { id: businessId, ownerId: userId }, select: { id: true } });
            if (!owns)
                throw new common_1.ForbiddenException();
        }
        async list(user, headerBusinessId, queryBusinessId, q) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const where = { businessId };
            if (q === null || q === void 0 ? void 0 : q.status)
                where.status = q.status;
            if (q === null || q === void 0 ? void 0 : q.type)
                where.type = q.type;
            if (q === null || q === void 0 ? void 0 : q.employeeId)
                where.employeeId = q.employeeId;
            if (q === null || q === void 0 ? void 0 : q.clientId)
                where.clientId = q.clientId;
            if ((q === null || q === void 0 ? void 0 : q.from) || (q === null || q === void 0 ? void 0 : q.to)) {
                where.effectiveDate = {};
                if (q.from)
                    where.effectiveDate.gte = new Date(q.from);
                if (q.to)
                    where.effectiveDate.lte = new Date(q.to);
            }
            return this.prisma.contractDocument.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                include: {
                    employee: { select: { id: true, firstName: true, lastName: true, email: true } },
                    client: { select: { id: true, name: true } },
                },
            });
        }
        async create(user, headerBusinessId, dto, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const userId = this.getUserId(user);
            let status = dto.status || 'DRAFT';
            if (dto.endDate && new Date(dto.endDate) < new Date())
                status = 'EXPIRED';
            return this.prisma.contractDocument.create({
                data: {
                    businessId,
                    title: dto.title,
                    type: dto.type || 'EMPLOYMENT',
                    status,
                    employeeId: dto.employeeId || null,
                    clientId: dto.clientId || null,
                    counterpartyName: dto.counterpartyName || null,
                    effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
                    endDate: dto.endDate ? new Date(dto.endDate) : null,
                    fileUrl: dto.fileUrl || null,
                    createdByUserId: userId,
                },
            });
        }
        async update(user, headerBusinessId, id, dto, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const existing = await this.prisma.contractDocument.findFirst({ where: { id, businessId } });
            if (!existing)
                throw new common_1.NotFoundException('Contract not found');
            const data = {};
            for (const k of ['title', 'type', 'status', 'employeeId', 'clientId', 'counterpartyName', 'fileUrl']) {
                if (dto[k] !== undefined)
                    data[k] = dto[k] || null;
            }
            if (dto.effectiveDate !== undefined)
                data.effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
            if (dto.endDate !== undefined)
                data.endDate = dto.endDate ? new Date(dto.endDate) : null;
            if (dto.endDate && new Date(dto.endDate) < new Date())
                data.status = 'EXPIRED';
            return this.prisma.contractDocument.update({ where: { id }, data });
        }
        async delete(user, headerBusinessId, id, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const existing = await this.prisma.contractDocument.findFirst({ where: { id, businessId } });
            if (!existing)
                throw new common_1.NotFoundException('Contract not found');
            return this.prisma.contractDocument.delete({ where: { id } });
        }
    };
    __setFunctionName(_classThis, "ContractsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ContractsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ContractsService = _classThis;
})();
exports.ContractsService = ContractsService;
