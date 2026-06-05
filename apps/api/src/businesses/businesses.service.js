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
exports.BusinessesService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let BusinessesService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var BusinessesService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        async setStatus(id, status) {
            const business = await this.prisma.business.findUnique({ where: { id } });
            if (!business)
                throw new common_1.BadRequestException('Business not found');
            if (business.status === 'DELETED' && status !== 'DELETED') {
                throw new common_1.BadRequestException('Deleted business cannot be reactivated');
            }
            return this.prisma.business.update({
                where: { id },
                data: { status },
                select: { id: true, name: true, status: true, updatedAt: true },
            });
        }
        async create(createBusinessDto, ownerId) {
            const { name, ein, mobile, country, businessType, industry, employeeCount, address, city, state, zip, modules } = createBusinessDto;
            const map = {
                'United States': { currencyCode: 'USD', gov: { taxIdLabel: 'EIN', taxSystem: 'Sales Tax', defaultStandardRate: 0, note: 'Varies by state', inclusive: false } },
                'United Kingdom': { currencyCode: 'GBP', gov: { taxIdLabel: 'VAT Number', taxSystem: 'VAT', defaultStandardRate: 20, inclusive: false } },
                'Canada': { currencyCode: 'CAD', gov: { taxIdLabel: 'BN', taxSystem: 'GST/HST', defaultStandardRate: 5, note: 'HST varies by province', inclusive: false } },
                'Ghana': { currencyCode: 'GHS', gov: { taxIdLabel: 'TIN', taxSystem: 'VAT', defaultStandardRate: 15, inclusive: false } },
                'Nigeria': { currencyCode: 'NGN', gov: { taxIdLabel: 'TIN', taxSystem: 'VAT', defaultStandardRate: 7.5, inclusive: false } },
                'Kenya': { currencyCode: 'KES', gov: { taxIdLabel: 'PIN', taxSystem: 'VAT', defaultStandardRate: 16, inclusive: false } },
                'South Africa': { currencyCode: 'ZAR', gov: { taxIdLabel: 'VAT Number', taxSystem: 'VAT', defaultStandardRate: 15, inclusive: false } },
            };
            const info = country && map[country] ? map[country] : null;
            return this.prisma.business.create({
                data: {
                    name,
                    ein,
                    mobile,
                    country,
                    businessType,
                    industry,
                    employeeCount,
                    address,
                    city,
                    state,
                    zip,
                    modules,
                    currencyCode: info === null || info === void 0 ? void 0 : info.currencyCode,
                    governmentInfo: (info === null || info === void 0 ? void 0 : info.gov) ? JSON.stringify(info.gov) : undefined,
                    owner: {
                        connect: { id: ownerId },
                    },
                },
            });
        }
        async findAll() {
            return this.prisma.business.findMany({
                include: {
                    owner: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            });
        }
        async findOne(id) {
            return this.prisma.business.findUnique({
                where: { id },
                include: {
                    owner: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            });
        }
        async findMine(userId) {
            const business = await this.prisma.business.findFirst({ where: { ownerId: userId, status: { not: 'DELETED' } } });
            if (business)
                return business;
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee) {
                return this.prisma.business.findFirst({ where: { id: employee.businessId, status: { not: 'DELETED' } } });
            }
            return null;
        }
        async update(id, updateBusinessDto) {
            const existing = await this.prisma.business.findUnique({ where: { id }, select: { id: true, status: true } });
            if (!existing)
                throw new common_1.BadRequestException('Business not found');
            if (existing.status === 'DELETED')
                throw new common_1.BadRequestException('Cannot update a deleted business');
            const { country } = updateBusinessDto;
            const dataToUpdate = { ...updateBusinessDto };
            if (country) {
                const map = {
                    'United States': { currencyCode: 'USD', gov: { taxIdLabel: 'EIN', taxSystem: 'Sales Tax', defaultStandardRate: 0, note: 'Varies by state', inclusive: false } },
                    'United Kingdom': { currencyCode: 'GBP', gov: { taxIdLabel: 'VAT Number', taxSystem: 'VAT', defaultStandardRate: 20, inclusive: false } },
                    'Canada': { currencyCode: 'CAD', gov: { taxIdLabel: 'BN', taxSystem: 'GST/HST', defaultStandardRate: 5, note: 'HST varies by province', inclusive: false } },
                    'Ghana': { currencyCode: 'GHS', gov: { taxIdLabel: 'TIN', taxSystem: 'VAT', defaultStandardRate: 15, inclusive: false } },
                    'Nigeria': { currencyCode: 'NGN', gov: { taxIdLabel: 'TIN', taxSystem: 'VAT', defaultStandardRate: 7.5, inclusive: false } },
                    'Kenya': { currencyCode: 'KES', gov: { taxIdLabel: 'PIN', taxSystem: 'VAT', defaultStandardRate: 16, inclusive: false } },
                    'South Africa': { currencyCode: 'ZAR', gov: { taxIdLabel: 'VAT Number', taxSystem: 'VAT', defaultStandardRate: 15, inclusive: false } },
                };
                const info = map[country];
                if (info) {
                    // Only update if not explicitly provided in the update DTO (though usually they wouldn't be)
                    if (!dataToUpdate.currencyCode) {
                        dataToUpdate.currencyCode = info.currencyCode;
                    }
                    dataToUpdate.governmentInfo = JSON.stringify(info.gov);
                }
            }
            return this.prisma.business.update({
                where: { id },
                data: dataToUpdate,
            });
        }
        async updateForUser(user, pathId, updateBusinessDto, businessIdHeader) {
            let validId;
            if (user.role === types_1.UserRole.SUPER_ADMIN) {
                if (!businessIdHeader) {
                    throw new common_1.BadRequestException('Business context required for Super Admin');
                }
                validId = businessIdHeader;
            }
            else {
                const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId, status: { not: 'DELETED' } } });
                if (ownedBusiness) {
                    validId = ownedBusiness.id;
                }
                else {
                    const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId } });
                    if (!employee)
                        throw new common_1.BadRequestException('User is not associated with a business');
                    const business = await this.prisma.business.findFirst({ where: { id: employee.businessId, status: { not: 'DELETED' } }, select: { id: true } });
                    if (!business)
                        throw new common_1.BadRequestException('Business not found');
                    validId = business.id;
                }
            }
            if (pathId && validId && pathId !== validId) {
                throw new common_1.ForbiddenException('Cannot update another business');
            }
            return this.update(validId, updateBusinessDto);
        }
    };
    __setFunctionName(_classThis, "BusinessesService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BusinessesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BusinessesService = _classThis;
})();
exports.BusinessesService = BusinessesService;
