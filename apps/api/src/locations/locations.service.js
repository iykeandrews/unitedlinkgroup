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
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let LocationsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var LocationsService = _classThis = class {
        constructor(prisma, geocodingService) {
            this.prisma = prisma;
            this.geocodingService = geocodingService;
        }
        async getBusinessId(user, businessIdHeader) {
            if (user.role === types_1.UserRole.SUPER_ADMIN) {
                if (businessIdHeader) {
                    const business = await this.prisma.business.findUnique({ where: { id: businessIdHeader } });
                    if (!business)
                        throw new common_1.BadRequestException('Business not found');
                    return businessIdHeader;
                }
                console.error('Super Admin missing business context');
                throw new common_1.BadRequestException('Business context required for Super Admin');
            }
            const userId = user.userId || user.sub || user.id;
            console.log(`Resolving businessId for user ${userId} (role: ${user.role})`);
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness) {
                if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
                    throw new common_1.BadRequestException('Access denied: You cannot access another business data');
                }
                console.log(`Found owned business: ${ownedBusiness.id}`);
                return ownedBusiness.id;
            }
            const employee = await this.prisma.employee.findFirst({ where: { userId: userId } });
            if (!employee) {
                console.error(`User ${userId} is not associated with any business`);
                throw new common_1.BadRequestException('User is not associated with a business');
            }
            if (businessIdHeader && businessIdHeader !== employee.businessId) {
                throw new common_1.BadRequestException('Access denied: You cannot access another business data');
            }
            console.log(`Found employee record: ${employee.id}, business: ${employee.businessId}`);
            return employee.businessId;
        }
        async create(user, data, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            if (data.status === 'ACTIVE') {
                throw new common_1.BadRequestException('Cannot create ACTIVE site without service pins. Please create as INACTIVE and add pins.');
            }
            let { geoLat, geoLng } = data;
            if (data.address && (geoLat === undefined || geoLat === null || geoLng === undefined || geoLng === null)) {
                const coords = await this.geocodingService.geocode(data.address);
                if (coords) {
                    if (geoLat === undefined || geoLat === null)
                        geoLat = coords.lat;
                    if (geoLng === undefined || geoLng === null)
                        geoLng = coords.lng;
                }
            }
            return this.prisma.location.create({
                data: {
                    name: data.name,
                    code: data.code,
                    workOrder: data.workOrder,
                    startDate: data.startDate ? new Date(data.startDate) : null,
                    endDate: data.endDate ? new Date(data.endDate) : null,
                    address: data.address,
                    businessId,
                    clientId: data.clientId,
                    status: data.status || 'INACTIVE',
                    geoLat,
                    geoLng,
                    radius: data.radius,
                    taxOverrideInfo: data.taxOverrideInfo ? JSON.stringify(data.taxOverrideInfo) : null,
                },
            });
        }
        async findAll(user, businessIdHeader, clientId, status) {
            try {
                const businessId = await this.getBusinessId(user, businessIdHeader);
                const where = { businessId };
                if (clientId)
                    where.clientId = clientId;
                if (status)
                    where.status = status;
                return await this.prisma.location.findMany({
                    where,
                    orderBy: { name: 'asc' },
                    include: {
                        servicePins: true,
                        client: true
                    }
                });
            }
            catch (error) {
                console.error('Error in LocationsService.findAll:', error);
                throw error;
            }
        }
        async findOne(user, id, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const loc = await this.prisma.location.findFirst({
                where: { id, businessId },
                include: { servicePins: true, client: true }
            });
            if (!loc)
                throw new common_1.NotFoundException('Location not found');
            return loc;
        }
        async update(user, id, data, businessIdHeader) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const loc = await this.prisma.location.findFirst({ where: { id, businessId } });
            if (!loc)
                throw new common_1.NotFoundException('Location not found');
            if (data.status === 'ACTIVE') {
                const pinCount = await this.prisma.servicePin.count({ where: { locationId: id, status: 'ACTIVE' } });
                if (pinCount === 0) {
                    throw new common_1.BadRequestException('Cannot activate site without at least one active service pin');
                }
            }
            if (data.status === 'INACTIVE' && loc.status === 'ACTIVE') {
                await this.prisma.servicePin.updateMany({
                    where: { locationId: id },
                    data: { status: 'INACTIVE' }
                });
            }
            return this.prisma.location.update({
                where: { id },
                data: {
                    name: (_a = data.name) !== null && _a !== void 0 ? _a : loc.name,
                    workOrder: (_b = data.workOrder) !== null && _b !== void 0 ? _b : loc.workOrder,
                    startDate: data.startDate ? new Date(data.startDate) : loc.startDate,
                    endDate: data.endDate ? new Date(data.endDate) : loc.endDate,
                    code: (_c = data.code) !== null && _c !== void 0 ? _c : loc.code,
                    address: (_d = data.address) !== null && _d !== void 0 ? _d : loc.address,
                    clientId: (_e = data.clientId) !== null && _e !== void 0 ? _e : loc.clientId,
                    status: (_f = data.status) !== null && _f !== void 0 ? _f : loc.status,
                    geoLat: (_g = data.geoLat) !== null && _g !== void 0 ? _g : loc.geoLat,
                    geoLng: (_h = data.geoLng) !== null && _h !== void 0 ? _h : loc.geoLng,
                    radius: (_j = data.radius) !== null && _j !== void 0 ? _j : loc.radius,
                    taxOverrideInfo: data.taxOverrideInfo ? JSON.stringify(data.taxOverrideInfo) : loc.taxOverrideInfo,
                },
            });
        }
        async remove(user, id, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            // Ensure it belongs to business
            const loc = await this.prisma.location.findFirst({ where: { id, businessId } });
            if (!loc)
                throw new common_1.NotFoundException('Location not found');
            // Check active assignments? "Deleting a pin must warn if active assignments exist". 
            // Deleting a site implies deleting pins.
            // I'll just delete it for now.
            return this.prisma.location.delete({ where: { id } });
        }
    };
    __setFunctionName(_classThis, "LocationsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LocationsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LocationsService = _classThis;
})();
exports.LocationsService = LocationsService;
