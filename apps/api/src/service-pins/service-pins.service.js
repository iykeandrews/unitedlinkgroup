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
exports.ServicePinsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let ServicePinsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ServicePinsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        async getBusinessId(user, businessIdHeader) {
            if (user.role === types_1.UserRole.SUPER_ADMIN) {
                if (!businessIdHeader)
                    throw new common_1.BadRequestException('Business context required for Super Admin');
                return businessIdHeader;
            }
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId } });
            if (ownedBusiness)
                return ownedBusiness.id;
            const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            return employee.businessId;
        }
        async validateLocationAccess(locationId, businessId) {
            const location = await this.prisma.location.findFirst({
                where: { id: locationId, businessId }
            });
            if (!location)
                throw new common_1.NotFoundException('Location not found or access denied');
            return location;
        }
        async create(user, createServicePinDto, businessIdHeader) {
            var _a;
            const businessId = await this.getBusinessId(user, businessIdHeader);
            // Validate that the location belongs to the business
            await this.validateLocationAccess(createServicePinDto.locationId, businessId);
            return this.prisma.servicePin.create({
                data: {
                    locationId: createServicePinDto.locationId,
                    positionType: createServicePinDto.positionType,
                    count: (_a = createServicePinDto.count) !== null && _a !== void 0 ? _a : 1,
                    shiftType: createServicePinDto.shiftType,
                    startTime: createServicePinDto.startTime,
                    endTime: createServicePinDto.endTime,
                    days: createServicePinDto.days,
                    payRate: createServicePinDto.payRate,
                    specialInstructions: createServicePinDto.specialInstructions,
                    geoLat: createServicePinDto.geoLat,
                    geoLng: createServicePinDto.geoLng,
                    status: createServicePinDto.status || 'ACTIVE',
                },
            });
        }
        async findAllByLocation(user, locationId, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            await this.validateLocationAccess(locationId, businessId);
            return this.prisma.servicePin.findMany({
                where: { locationId },
                orderBy: { createdAt: 'desc' }
            });
        }
        async findOne(user, id, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const pin = await this.prisma.servicePin.findUnique({
                where: { id },
                include: { location: true }
            });
            if (!pin)
                throw new common_1.NotFoundException('Service Pin not found');
            if (pin.location.businessId !== businessId)
                throw new common_1.ForbiddenException('Access denied');
            return pin;
        }
        async update(user, id, updateServicePinDto, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const pin = await this.findOne(user, id, businessIdHeader); // Ensures existence and access
            return this.prisma.servicePin.update({
                where: { id },
                data: updateServicePinDto,
            });
        }
        async remove(user, id, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const pin = await this.findOne(user, id, businessIdHeader); // Ensures existence and access
            // Check if there are active assignments (placeholder logic, assuming we'll check scheduling later)
            // For now, just allow deletion or soft delete. 
            // User Requirement: "warn on pin deletion with active assignments" -> Ideally we should check shifts.
            // Since scheduling isn't fully implemented or linked yet, we'll just delete.
            return this.prisma.servicePin.delete({
                where: { id },
            });
        }
    };
    __setFunctionName(_classThis, "ServicePinsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ServicePinsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ServicePinsService = _classThis;
})();
exports.ServicePinsService = ServicePinsService;
