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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
let ClientsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ClientsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        async validateBusinessAccess(targetBusinessId, user) {
            const business = await this.prisma.business.findUnique({ where: { id: targetBusinessId } });
            if (!business) {
                throw new common_1.BadRequestException('Business not found');
            }
            if (user.role === 'SUPER_ADMIN')
                return;
            const userId = user.userId || user.sub || user.id;
            // Check if user owns the business
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness && ownedBusiness.id === targetBusinessId)
                return;
            // Check if user is an employee of the business
            const employee = await this.prisma.employee.findFirst({
                where: { userId: userId, businessId: targetBusinessId }
            });
            if (employee)
                return;
            throw new common_1.BadRequestException('Access denied: You do not have access to this business data');
        }
        async create(user, createClientDto, businessId) {
            const finalBusinessId = businessId || createClientDto.businessId;
            if (!finalBusinessId) {
                throw new common_1.BadRequestException('Business ID is required');
            }
            await this.validateBusinessAccess(finalBusinessId, user);
            return this.prisma.client.create({
                data: {
                    ...createClientDto,
                    businessId: finalBusinessId,
                },
            });
        }
        async findAll(user, businessId) {
            if (!businessId)
                throw new common_1.BadRequestException('Business ID is required');
            await this.validateBusinessAccess(businessId, user);
            return this.prisma.client.findMany({
                where: { businessId },
                include: {
                    _count: {
                        select: { locations: true }
                    }
                }
            });
        }
        async findOne(id, user) {
            const client = await this.prisma.client.findUnique({
                where: { id },
                include: {
                    locations: {
                        include: {
                            servicePins: true
                        }
                    }
                }
            });
            if (!client)
                throw new common_1.NotFoundException('Client not found');
            await this.validateBusinessAccess(client.businessId, user);
            return client;
        }
        async update(id, updateClientDto, user) {
            const client = await this.prisma.client.findUnique({ where: { id } });
            if (!client)
                throw new common_1.NotFoundException('Client not found');
            await this.validateBusinessAccess(client.businessId, user);
            return this.prisma.client.update({
                where: { id },
                data: updateClientDto,
            });
        }
        async remove(id, user) {
            const client = await this.prisma.client.findUnique({ where: { id } });
            if (!client)
                throw new common_1.NotFoundException('Client not found');
            await this.validateBusinessAccess(client.businessId, user);
            return this.prisma.client.delete({
                where: { id },
            });
        }
    };
    __setFunctionName(_classThis, "ClientsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClientsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClientsService = _classThis;
})();
exports.ClientsService = ClientsService;
