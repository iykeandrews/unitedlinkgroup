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
exports.CompanyCertificationsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let CompanyCertificationsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var CompanyCertificationsService = _classThis = class {
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
            const ownedBusiness = await this.prisma.business.findFirst({ where: { id: businessId, ownerId: userId }, select: { id: true } });
            if (!ownedBusiness)
                throw new common_1.ForbiddenException();
        }
        async list(user, headerBusinessId, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            return this.prisma.companyCertification.findMany({
                where: { businessId },
                orderBy: { expiryDate: 'asc' },
            });
        }
        async create(user, headerBusinessId, dto, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const userId = this.getUserId(user);
            let status = dto.status || 'ACTIVE';
            if (dto.expiryDate && new Date(dto.expiryDate) < new Date())
                status = 'EXPIRED';
            return this.prisma.companyCertification.create({
                data: {
                    businessId,
                    name: dto.name,
                    type: dto.type || 'CERTIFICATION',
                    issuingOrganization: dto.issuingOrganization || null,
                    credentialId: dto.credentialId || null,
                    issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
                    expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
                    fileUrl: dto.fileUrl || null,
                    status,
                    createdByUserId: userId,
                },
            });
        }
        async update(user, headerBusinessId, id, dto, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const existing = await this.prisma.companyCertification.findFirst({ where: { id, businessId } });
            if (!existing)
                throw new common_1.NotFoundException('Company certification not found');
            const data = {};
            if (dto.name !== undefined)
                data.name = dto.name;
            if (dto.type !== undefined)
                data.type = dto.type;
            if (dto.issuingOrganization !== undefined)
                data.issuingOrganization = dto.issuingOrganization || null;
            if (dto.credentialId !== undefined)
                data.credentialId = dto.credentialId || null;
            if (dto.issueDate !== undefined)
                data.issueDate = dto.issueDate ? new Date(dto.issueDate) : null;
            if (dto.expiryDate !== undefined)
                data.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
            if (dto.fileUrl !== undefined)
                data.fileUrl = dto.fileUrl || null;
            if (dto.status !== undefined) {
                data.status = dto.status;
            }
            else if (dto.expiryDate) {
                data.status = new Date(dto.expiryDate) < new Date() ? 'EXPIRED' : 'ACTIVE';
            }
            return this.prisma.companyCertification.update({ where: { id }, data });
        }
        async delete(user, headerBusinessId, id, queryBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const existing = await this.prisma.companyCertification.findFirst({ where: { id, businessId } });
            if (!existing)
                throw new common_1.NotFoundException('Company certification not found');
            return this.prisma.companyCertification.delete({ where: { id } });
        }
    };
    __setFunctionName(_classThis, "CompanyCertificationsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CompanyCertificationsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CompanyCertificationsService = _classThis;
})();
exports.CompanyCertificationsService = CompanyCertificationsService;
