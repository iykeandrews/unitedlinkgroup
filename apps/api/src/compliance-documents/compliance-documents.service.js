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
exports.ComplianceDocumentsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let ComplianceDocumentsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ComplianceDocumentsService = _classThis = class {
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
            if ((user === null || user === void 0 ? void 0 : user.role) !== types_1.UserRole.BUSINESS_ADMIN)
                throw new common_1.ForbiddenException();
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
            if (q === null || q === void 0 ? void 0 : q.category)
                where.category = q.category;
            if (q === null || q === void 0 ? void 0 : q.ownerEmployeeId)
                where.ownerEmployeeId = q.ownerEmployeeId;
            if (q === null || q === void 0 ? void 0 : q.search) {
                const s = String(q.search).trim();
                if (s) {
                    where.OR = [{ title: { contains: s, mode: 'insensitive' } }, { tags: { contains: s, mode: 'insensitive' } }];
                }
            }
            return this.prisma.complianceDocument.findMany({
                where,
                orderBy: [{ status: 'asc' }, { reviewDate: 'asc' }, { updatedAt: 'desc' }],
                include: {
                    ownerEmployee: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
            });
        }
        async create(user, headerBusinessId, dto, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const userId = this.getUserId(user);
            return this.prisma.complianceDocument.create({
                data: {
                    businessId,
                    title: dto.title,
                    category: dto.category || 'POLICY',
                    status: dto.status || 'ACTIVE',
                    version: dto.version || null,
                    effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
                    reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
                    ownerEmployeeId: dto.ownerEmployeeId || null,
                    acknowledgementRequired: !!dto.acknowledgementRequired,
                    tags: dto.tags || null,
                    fileUrl: dto.fileUrl || null,
                    createdByUserId: userId,
                },
            });
        }
        async update(user, headerBusinessId, id, dto, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const existing = await this.prisma.complianceDocument.findFirst({ where: { id, businessId } });
            if (!existing)
                throw new common_1.NotFoundException('Compliance document not found');
            const data = {};
            if (dto.title !== undefined)
                data.title = dto.title;
            if (dto.category !== undefined)
                data.category = dto.category;
            if (dto.status !== undefined)
                data.status = dto.status;
            if (dto.version !== undefined)
                data.version = dto.version || null;
            if (dto.effectiveDate !== undefined)
                data.effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
            if (dto.reviewDate !== undefined)
                data.reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : null;
            if (dto.ownerEmployeeId !== undefined)
                data.ownerEmployeeId = dto.ownerEmployeeId || null;
            if (dto.acknowledgementRequired !== undefined)
                data.acknowledgementRequired = !!dto.acknowledgementRequired;
            if (dto.tags !== undefined)
                data.tags = dto.tags || null;
            if (dto.fileUrl !== undefined)
                data.fileUrl = dto.fileUrl || null;
            return this.prisma.complianceDocument.update({ where: { id }, data });
        }
        async delete(user, headerBusinessId, id, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const existing = await this.prisma.complianceDocument.findFirst({ where: { id, businessId } });
            if (!existing)
                throw new common_1.NotFoundException('Compliance document not found');
            return this.prisma.complianceDocument.delete({ where: { id } });
        }
    };
    __setFunctionName(_classThis, "ComplianceDocumentsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ComplianceDocumentsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ComplianceDocumentsService = _classThis;
})();
exports.ComplianceDocumentsService = ComplianceDocumentsService;
