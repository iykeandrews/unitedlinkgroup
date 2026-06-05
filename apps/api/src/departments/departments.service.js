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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let DepartmentsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var DepartmentsService = _classThis = class {
        constructor(prisma, auditService) {
            this.prisma = prisma;
            this.auditService = auditService;
        }
        async getBusinessId(user, businessIdHeader) {
            if (user.role === types_1.UserRole.SUPER_ADMIN) {
                if (businessIdHeader)
                    return businessIdHeader;
                // If no header, maybe return null? But most operations require businessId.
                // For findAll, maybe allow null?
                // For now, enforce context for write ops, maybe lax for read?
                // But the previous implementation required businessId for everything.
                // Let's enforce it.
                throw new common_1.BadRequestException('Business context required for Super Admin');
            }
            const userId = user.userId || user.sub || user.id;
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness) {
                if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
                    throw new common_1.BadRequestException('Access denied: You cannot access another business data');
                }
                return ownedBusiness.id;
            }
            const employee = await this.prisma.employee.findFirst({ where: { userId: userId } });
            if (!employee) {
                throw new common_1.BadRequestException('User is not associated with a business');
            }
            if (businessIdHeader && businessIdHeader !== employee.businessId) {
                throw new common_1.BadRequestException('Access denied: You cannot access another business data');
            }
            return employee.businessId;
        }
        async create(createDepartmentDto, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const userId = user.userId || user.sub || user.id;
            const department = await this.prisma.department.create({
                data: {
                    ...createDepartmentDto,
                    businessId,
                },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'CREATE',
                resource: 'DEPARTMENT',
                resourceId: department.id,
                details: createDepartmentDto,
            });
            return department;
        }
        async findAll(user, businessIdHeader, status) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const where = { businessId };
            if (status)
                where.status = String(status).toUpperCase();
            const departments = await this.prisma.department.findMany({
                where,
                include: {
                    manager: true,
                    employees: {
                        select: {
                            id: true,
                            status: true,
                        }
                    },
                    _count: {
                        select: { employees: true },
                    },
                },
            });
            // Transform to include active vs inactive count
            return departments.map(dept => {
                const activeCount = dept.employees.filter(e => e.status === 'ACTIVE').length;
                return {
                    ...dept,
                    employeeCount: dept._count.employees,
                    activeEmployeeCount: activeCount,
                    inactiveEmployeeCount: dept._count.employees - activeCount,
                };
            });
        }
        async findOne(id, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const department = await this.prisma.department.findFirst({
                where: { id, businessId },
                include: {
                    manager: true,
                    employees: true,
                },
            });
            if (!department)
                throw new common_1.NotFoundException('Department not found');
            return department;
        }
        async getDepartmentMembers(id, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const department = await this.prisma.department.findFirst({
                where: { id, businessId },
                include: {
                    employees: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                            status: true,
                            departmentId: true,
                            w2Profile: { select: { id: true } },
                            contractorProfile: { select: { id: true } },
                        }
                    }
                }
            });
            if (!department) {
                throw new common_1.NotFoundException('Department not found');
            }
            return department.employees;
        }
        async addMember(id, employeeId, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const userId = user.userId || user.sub || user.id;
            // Verify department belongs to business
            const department = await this.prisma.department.findFirst({ where: { id, businessId } });
            if (!department)
                throw new common_1.NotFoundException('Department not found');
            // Verify employee belongs to business
            const employee = await this.prisma.employee.findFirst({
                where: { id: employeeId, businessId }
            });
            if (!employee) {
                throw new common_1.NotFoundException('Employee not found');
            }
            const updatedEmployee = await this.prisma.employee.update({
                where: { id: employeeId },
                data: { departmentId: id },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'DEPARTMENT',
                resourceId: id,
                details: { action: 'ADD_MEMBER', employeeId },
            });
            return updatedEmployee;
        }
        async removeMember(id, employeeId, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const userId = user.userId || user.sub || user.id;
            // Verify department belongs to business
            const department = await this.prisma.department.findFirst({ where: { id, businessId } });
            if (!department)
                throw new common_1.NotFoundException('Department not found');
            // Verify employee belongs to business and department
            const employee = await this.prisma.employee.findFirst({
                where: { id: employeeId, businessId, departmentId: id }
            });
            if (!employee) {
                throw new common_1.BadRequestException('Employee not found in this department');
            }
            const updatedEmployee = await this.prisma.employee.update({
                where: { id: employeeId },
                data: { departmentId: null },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'DEPARTMENT',
                resourceId: id,
                details: { action: 'REMOVE_MEMBER', employeeId },
            });
            return updatedEmployee;
        }
        async assignManager(id, employeeId, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const userId = user.userId || user.sub || user.id;
            // Verify department
            const departmentCheck = await this.prisma.department.findFirst({ where: { id, businessId } });
            if (!departmentCheck)
                throw new common_1.NotFoundException('Department not found');
            // Verify employee belongs to business
            const employee = await this.prisma.employee.findFirst({
                where: { id: employeeId, businessId }
            });
            if (!employee) {
                throw new common_1.NotFoundException('Employee not found');
            }
            const department = await this.prisma.department.update({
                where: { id },
                data: { managerId: employeeId },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'DEPARTMENT',
                resourceId: id,
                details: { action: 'ASSIGN_MANAGER', managerId: employeeId },
            });
            return department;
        }
        async removeManager(id, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const userId = user.userId || user.sub || user.id;
            const departmentCheck = await this.prisma.department.findFirst({ where: { id, businessId } });
            if (!departmentCheck)
                throw new common_1.NotFoundException('Department not found');
            const department = await this.prisma.department.update({
                where: { id },
                data: { managerId: null },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'DEPARTMENT',
                resourceId: id,
                details: { action: 'REMOVE_MANAGER' },
            });
            return department;
        }
        async update(id, updateDepartmentDto, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const userId = user.userId || user.sub || user.id;
            const departmentCheck = await this.prisma.department.findFirst({ where: { id, businessId } });
            if (!departmentCheck)
                throw new common_1.NotFoundException('Department not found');
            const department = await this.prisma.department.update({
                where: { id },
                data: updateDepartmentDto,
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'DEPARTMENT',
                resourceId: id,
                details: updateDepartmentDto,
            });
            return department;
        }
        async remove(id, user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const userId = user.userId || user.sub || user.id;
            const departmentCheck = await this.prisma.department.findFirst({ where: { id, businessId } });
            if (!departmentCheck)
                throw new common_1.NotFoundException('Department not found');
            const department = await this.prisma.department.delete({
                where: { id },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'DELETE',
                resource: 'DEPARTMENT',
                resourceId: id,
            });
            return department;
        }
    };
    __setFunctionName(_classThis, "DepartmentsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DepartmentsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DepartmentsService = _classThis;
})();
exports.DepartmentsService = DepartmentsService;
