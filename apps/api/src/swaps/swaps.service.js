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
exports.SwapsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let SwapsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SwapsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        getUserId(user) {
            return (user === null || user === void 0 ? void 0 : user.userId) || (user === null || user === void 0 ? void 0 : user.sub) || (user === null || user === void 0 ? void 0 : user.id) || null;
        }
        isAdminRole(role) {
            return role === types_1.UserRole.SUPER_ADMIN || role === types_1.UserRole.BUSINESS_ADMIN;
        }
        async getBusinessIdForUser(userId) {
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness)
                return ownedBusiness.id;
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee)
                return employee.businessId;
            throw new common_1.BadRequestException('User is not associated with a business');
        }
        async resolveBusinessId(user, headerBusinessId, queryBusinessId) {
            const fromHeaderOrQuery = queryBusinessId || headerBusinessId || null;
            if (fromHeaderOrQuery)
                return fromHeaderOrQuery;
            const userId = this.getUserId(user);
            if (!userId)
                throw new common_1.BadRequestException('Business context required');
            if ((user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.SUPER_ADMIN)
                throw new common_1.BadRequestException('Business context required');
            return this.getBusinessIdForUser(userId);
        }
        async requireEmployeeForUser(user, businessId) {
            const userId = this.getUserId(user);
            if (!userId)
                throw new common_1.BadRequestException('Employee profile required');
            const employee = await this.prisma.employee.findFirst({ where: { userId, businessId } });
            if (!employee)
                throw new common_1.BadRequestException('Employee profile required');
            return employee;
        }
        async assertBusinessAccess(user, businessId) {
            if ((user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.SUPER_ADMIN)
                return;
            const userId = this.getUserId(user);
            if (!userId)
                throw new common_1.ForbiddenException();
            const employee = await this.prisma.employee.findFirst({ where: { userId, businessId }, select: { id: true } });
            const owns = await this.prisma.business.findFirst({ where: { id: businessId, ownerId: userId }, select: { id: true } });
            if (!employee && !owns)
                throw new common_1.ForbiddenException();
        }
        async list(user, headerBusinessId, queryBusinessId, status) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
            await this.assertBusinessAccess(user, businessId);
            const where = { businessId };
            if (status)
                where.status = status;
            return this.prisma.shiftSwapRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    requesterEmployee: true,
                    offeredShift: { include: { employee: true, location: true } },
                    requestedShift: { include: { employee: true, location: true } },
                },
            });
        }
        async listMy(user, headerBusinessId) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
            const me = await this.requireEmployeeForUser(user, businessId);
            return this.prisma.shiftSwapRequest.findMany({
                where: {
                    businessId,
                    OR: [{ requesterEmployeeId: me.id }, { offeredEmployeeId: me.id }, { requestedEmployeeId: me.id }],
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    requesterEmployee: true,
                    offeredShift: { include: { employee: true, location: true } },
                    requestedShift: { include: { employee: true, location: true } },
                },
            });
        }
        async create(user, headerBusinessId, dto) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
            await this.assertBusinessAccess(user, businessId);
            const offered = await this.prisma.shift.findFirst({
                where: { id: dto.offeredShiftId, businessId },
                include: { employee: true, location: true },
            });
            if (!offered)
                throw new common_1.NotFoundException('Offered shift not found');
            if (!offered.employeeId)
                throw new common_1.BadRequestException('Offered shift must be assigned');
            const requested = await this.prisma.shift.findFirst({
                where: { id: dto.requestedShiftId, businessId },
                include: { employee: true, location: true },
            });
            if (!requested)
                throw new common_1.NotFoundException('Requested shift not found');
            if (!requested.employeeId)
                throw new common_1.BadRequestException('Requested shift must be assigned');
            if (offered.id === requested.id)
                throw new common_1.BadRequestException('Cannot swap the same shift');
            if (offered.employeeId === requested.employeeId)
                throw new common_1.BadRequestException('Shifts must belong to different employees');
            let requesterEmployeeId = dto.requesterEmployeeId || offered.employeeId;
            if (!requesterEmployeeId)
                throw new common_1.BadRequestException('Requester employee required');
            if ((user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.EMPLOYEE) {
                const me = await this.requireEmployeeForUser(user, businessId);
                if (me.id !== requesterEmployeeId)
                    throw new common_1.ForbiddenException();
                if (offered.employeeId !== me.id)
                    throw new common_1.BadRequestException('You can only offer your own shift');
            }
            const existing = await this.prisma.shiftSwapRequest.findFirst({
                where: { businessId, status: 'PENDING', offeredShiftId: offered.id, requestedShiftId: requested.id },
                select: { id: true },
            });
            if (existing)
                throw new common_1.BadRequestException('A pending swap request already exists for these shifts');
            return this.prisma.shiftSwapRequest.create({
                data: {
                    businessId,
                    requesterEmployeeId,
                    offeredShiftId: offered.id,
                    requestedShiftId: requested.id,
                    offeredEmployeeId: offered.employeeId,
                    requestedEmployeeId: requested.employeeId,
                    message: dto.message || null,
                    status: 'PENDING',
                },
                include: {
                    requesterEmployee: true,
                    offeredShift: { include: { employee: true, location: true } },
                    requestedShift: { include: { employee: true, location: true } },
                },
            });
        }
        async cancel(user, headerBusinessId, id) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
            const swap = await this.prisma.shiftSwapRequest.findFirst({ where: { id, businessId } });
            if (!swap)
                throw new common_1.NotFoundException('Swap request not found');
            if (swap.status !== 'PENDING')
                throw new common_1.BadRequestException('Only pending requests can be cancelled');
            if ((user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.EMPLOYEE) {
                const me = await this.requireEmployeeForUser(user, businessId);
                if (swap.requesterEmployeeId !== me.id)
                    throw new common_1.ForbiddenException();
            }
            return this.prisma.shiftSwapRequest.update({
                where: { id },
                data: { status: 'CANCELLED' },
            });
        }
        async approve(user, headerBusinessId, id) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
            await this.assertBusinessAccess(user, businessId);
            if (!(this.isAdminRole(user === null || user === void 0 ? void 0 : user.role) || (user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.MANAGER))
                throw new common_1.ForbiddenException();
            const swap = await this.prisma.shiftSwapRequest.findFirst({
                where: { id, businessId },
                include: { offeredShift: true, requestedShift: true },
            });
            if (!swap)
                throw new common_1.NotFoundException('Swap request not found');
            if (swap.status !== 'PENDING')
                throw new common_1.BadRequestException('Only pending requests can be approved');
            const offered = await this.prisma.shift.findFirst({ where: { id: swap.offeredShiftId, businessId } });
            const requested = await this.prisma.shift.findFirst({ where: { id: swap.requestedShiftId, businessId } });
            if (!offered || !requested)
                throw new common_1.BadRequestException('Shifts no longer exist');
            if (!offered.employeeId || !requested.employeeId)
                throw new common_1.BadRequestException('Shifts must be assigned');
            if (offered.employeeId !== swap.offeredEmployeeId || requested.employeeId !== swap.requestedEmployeeId) {
                throw new common_1.BadRequestException('Shift assignments changed since request was created');
            }
            const reviewerUserId = this.getUserId(user);
            return this.prisma.$transaction(async (tx) => {
                await tx.shift.update({ where: { id: offered.id }, data: { employeeId: swap.requestedEmployeeId } });
                await tx.shift.update({ where: { id: requested.id }, data: { employeeId: swap.offeredEmployeeId } });
                return tx.shiftSwapRequest.update({
                    where: { id: swap.id },
                    data: { status: 'APPROVED', reviewedByUserId: reviewerUserId },
                    include: {
                        requesterEmployee: true,
                        offeredShift: { include: { employee: true, location: true } },
                        requestedShift: { include: { employee: true, location: true } },
                    },
                });
            });
        }
        async reject(user, headerBusinessId, id, rejectionReason) {
            const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
            await this.assertBusinessAccess(user, businessId);
            if (!(this.isAdminRole(user === null || user === void 0 ? void 0 : user.role) || (user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.MANAGER))
                throw new common_1.ForbiddenException();
            const swap = await this.prisma.shiftSwapRequest.findFirst({ where: { id, businessId } });
            if (!swap)
                throw new common_1.NotFoundException('Swap request not found');
            if (swap.status !== 'PENDING')
                throw new common_1.BadRequestException('Only pending requests can be rejected');
            const reviewerUserId = this.getUserId(user);
            return this.prisma.shiftSwapRequest.update({
                where: { id },
                data: { status: 'REJECTED', reviewedByUserId: reviewerUserId, rejectionReason: rejectionReason || null },
            });
        }
    };
    __setFunctionName(_classThis, "SwapsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SwapsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SwapsService = _classThis;
})();
exports.SwapsService = SwapsService;
