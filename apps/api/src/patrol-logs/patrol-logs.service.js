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
exports.PatrolLogsService = void 0;
const common_1 = require("@nestjs/common");
let PatrolLogsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PatrolLogsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        async validateBusinessAccess(targetBusinessId, user) {
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
        async create(userId, createPatrolLogDto, user) {
            if (user) {
                // Validate access to the service pin's business
                const servicePin = await this.prisma.servicePin.findUnique({
                    where: { id: createPatrolLogDto.servicePinId },
                    include: { location: true }
                });
                if (!servicePin)
                    throw new common_1.BadRequestException('Service Pin not found');
                await this.validateBusinessAccess(servicePin.location.businessId, user);
            }
            return this.prisma.patrolLog.create({
                data: {
                    ...createPatrolLogDto,
                    userId,
                },
                include: {
                    user: true,
                    servicePin: true,
                },
            });
        }
        async findAllByPin(servicePinId, user) {
            if (user) {
                const servicePin = await this.prisma.servicePin.findUnique({
                    where: { id: servicePinId },
                    include: { location: true }
                });
                if (servicePin)
                    await this.validateBusinessAccess(servicePin.location.businessId, user);
            }
            return this.prisma.patrolLog.findMany({
                where: { servicePinId },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        }
        async findAllByLocation(locationId, user) {
            if (user) {
                const location = await this.prisma.location.findUnique({ where: { id: locationId } });
                if (location)
                    await this.validateBusinessAccess(location.businessId, user);
            }
            return this.prisma.patrolLog.findMany({
                where: {
                    servicePin: {
                        locationId: locationId
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    servicePin: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        }
        async findAll(user) {
            const where = {};
            if (user && user.role !== 'SUPER_ADMIN') {
                // Find business for the user
                const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId || user.sub || user.id } });
                const businessId = employee === null || employee === void 0 ? void 0 : employee.businessId;
                // Also check ownership
                const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
                const ownedBusinessId = ownedBusiness === null || ownedBusiness === void 0 ? void 0 : ownedBusiness.id;
                const targetBusinessId = businessId || ownedBusinessId;
                if (targetBusinessId) {
                    where.servicePin = {
                        location: {
                            businessId: targetBusinessId
                        }
                    };
                }
                else {
                    // No business found, return empty or throw? Return empty for safety.
                    return [];
                }
            }
            return this.prisma.patrolLog.findMany({
                where,
                take: 100,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    servicePin: {
                        include: {
                            location: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        }
    };
    __setFunctionName(_classThis, "PatrolLogsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PatrolLogsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PatrolLogsService = _classThis;
})();
exports.PatrolLogsService = PatrolLogsService;
