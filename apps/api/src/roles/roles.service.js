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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
let RolesService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var RolesService = _classThis = class {
        constructor(prisma, auditService) {
            this.prisma = prisma;
            this.auditService = auditService;
        }
        async create(createRoleDto, businessId, userId) {
            // Check if role name exists
            const existing = await this.prisma.role.findUnique({
                where: {
                    businessId_name: {
                        businessId,
                        name: createRoleDto.name,
                    },
                },
            });
            if (existing) {
                throw new common_1.BadRequestException('Role with this name already exists');
            }
            const role = await this.prisma.role.create({
                data: {
                    name: createRoleDto.name,
                    description: createRoleDto.description,
                    permissions: JSON.stringify(createRoleDto.permissions),
                    businessId,
                },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'CREATE',
                resource: 'ROLE',
                resourceId: role.id,
                details: createRoleDto,
            });
            return role;
        }
        async findAll(businessId) {
            const roles = await this.prisma.role.findMany({
                where: { businessId },
                include: {
                    _count: {
                        select: { employees: true }
                    }
                },
                orderBy: { name: 'asc' },
            });
            return roles.map(role => ({
                ...role,
                permissions: JSON.parse(role.permissions),
                memberCount: role._count.employees,
            }));
        }
        async getRoleMembers(id, businessId) {
            const role = await this.prisma.role.findUnique({
                where: { id },
                include: {
                    employees: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                            departmentId: true,
                        }
                    }
                }
            });
            if (!role || role.businessId !== businessId) {
                throw new common_1.BadRequestException('Role not found');
            }
            return role.employees;
        }
        async addMember(id, employeeId, userId, businessId) {
            // Verify employee belongs to business
            const employee = await this.prisma.employee.findFirst({
                where: { id: employeeId, businessId }
            });
            if (!employee) {
                throw new common_1.BadRequestException('Employee not found');
            }
            const updatedEmployee = await this.prisma.employee.update({
                where: { id: employeeId },
                data: { customRoleId: id },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'ROLE',
                resourceId: id,
                details: { action: 'ADD_MEMBER', employeeId },
            });
            return updatedEmployee;
        }
        async removeMember(id, employeeId, userId, businessId) {
            // Verify employee belongs to business and role
            const employee = await this.prisma.employee.findFirst({
                where: { id: employeeId, businessId, customRoleId: id }
            });
            if (!employee) {
                throw new common_1.BadRequestException('Employee not found in this role');
            }
            const updatedEmployee = await this.prisma.employee.update({
                where: { id: employeeId },
                data: { customRoleId: null },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'ROLE',
                resourceId: id,
                details: { action: 'REMOVE_MEMBER', employeeId },
            });
            return updatedEmployee;
        }
        async findOne(id, businessId) {
            const role = await this.prisma.role.findUnique({
                where: { id },
            });
            if (!role || (role.businessId !== businessId && !role.isSystem))
                return null;
            // If system role, it might be accessible by all? 
            // Usually system roles have businessId=null. If so, we can allow access.
            // If businessId is set on role, it must match.
            if (role.businessId && role.businessId !== businessId)
                return null;
            return {
                ...role,
                permissions: JSON.parse(role.permissions),
            };
        }
        async update(id, updateRoleDto, userId, businessId) {
            const existing = await this.findOne(id, businessId);
            if (!existing)
                throw new common_1.BadRequestException('Role not found or access denied');
            // System roles usually shouldn't be updated by business admins, maybe blocked?
            if (existing.isSystem)
                throw new common_1.BadRequestException('Cannot update system roles');
            const data = { ...updateRoleDto };
            if (updateRoleDto.permissions) {
                data.permissions = JSON.stringify(updateRoleDto.permissions);
            }
            const role = await this.prisma.role.update({
                where: { id },
                data,
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'ROLE',
                resourceId: id,
                details: updateRoleDto,
            });
            return role;
        }
        async remove(id, userId, businessId) {
            const role = await this.prisma.role.findUnique({ where: { id } });
            if (role && role.isSystem) {
                throw new common_1.BadRequestException('Cannot delete system roles');
            }
            const deletedRole = await this.prisma.role.delete({
                where: { id },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'DELETE',
                resource: 'ROLE',
                resourceId: id,
            });
            return deletedRole;
        }
    };
    __setFunctionName(_classThis, "RolesService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RolesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RolesService = _classThis;
})();
exports.RolesService = RolesService;
