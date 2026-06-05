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
exports.AnnouncementsService = void 0;
const common_1 = require("@nestjs/common");
let AnnouncementsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AnnouncementsService = _classThis = class {
        constructor(prisma, auditService) {
            this.prisma = prisma;
            this.auditService = auditService;
        }
        async getBusinessId(user, businessIdHeader) {
            if (user.role === 'SUPER_ADMIN') {
                if (!businessIdHeader)
                    throw new common_1.BadRequestException('Business context required for Super Admin');
                return businessIdHeader;
            }
            const userId = user.userId || user.sub || user.id;
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness) {
                if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
                    throw new common_1.BadRequestException('Access denied: Cannot access another business data');
                }
                return ownedBusiness.id;
            }
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            if (businessIdHeader && businessIdHeader !== employee.businessId) {
                throw new common_1.BadRequestException('Access denied: Cannot access another business data');
            }
            return employee.businessId;
        }
        async create(dto, userId, businessId) {
            if ((dto.targetType === 'DEPARTMENT' || dto.targetType === 'ROLE') && !dto.targetValue) {
                throw new common_1.BadRequestException('Target value is required for this target type');
            }
            if (dto.targetType === 'DEPARTMENT' && dto.targetValue) {
                const dept = await this.prisma.department.findFirst({
                    where: { id: dto.targetValue, businessId },
                });
                if (!dept) {
                    throw new common_1.BadRequestException('Invalid department');
                }
            }
            if (dto.targetType === 'ROLE' && dto.targetValue) {
                const role = await this.prisma.role.findFirst({
                    where: { id: dto.targetValue, businessId },
                });
                const validSystemRoles = ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'MANAGER', 'EMPLOYEE'];
                if (!role && !validSystemRoles.includes(dto.targetValue)) {
                    throw new common_1.BadRequestException('Invalid role');
                }
            }
            let status = dto.status;
            if (dto.scheduledAt && new Date(dto.scheduledAt) > new Date()) {
                status = 'SCHEDULED';
            }
            const announcement = await this.prisma.announcement.create({
                data: {
                    ...dto,
                    status,
                    authorId: userId,
                    businessId,
                },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'CREATE',
                resource: 'ANNOUNCEMENT',
                resourceId: announcement.id,
                details: dto,
            });
            return announcement;
        }
        async update(id, dto, userId, businessId) {
            // Verify ownership/tenancy
            const existing = await this.prisma.announcement.findFirst({
                where: { id, businessId }
            });
            if (!existing) {
                throw new common_1.BadRequestException('Announcement not found or access denied');
            }
            // Validate target value if type is changed or new value provided
            if ((dto.targetType === 'DEPARTMENT' || dto.targetType === 'ROLE') && !dto.targetValue) {
                // Need to check if existing record has value if only type is updated (omitted for simplicity, assuming full update usually)
                if (dto.targetValue === undefined) {
                    // If partial update doesn't include value, we might need to check DB, but DTO usually sends both if related.
                    // Let's assume validation is handled by frontend or full payload. 
                }
            }
            const announcement = await this.prisma.announcement.update({
                where: { id },
                data: {
                    ...dto,
                },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'UPDATE',
                resource: 'ANNOUNCEMENT',
                resourceId: id,
                details: dto,
            });
            return announcement;
        }
        async findAll(userId, businessId) {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            const isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'BUSINESS_ADMIN' || (user === null || user === void 0 ? void 0 : user.role) === 'SUPER_ADMIN';
            let whereClause = { businessId };
            if (!isAdmin) {
                const employee = await this.prisma.employee.findFirst({
                    where: { userId, businessId },
                    select: { departmentId: true, role: true, customRoleId: true }
                });
                if (!employee) {
                    return []; // Non-admin users without employee profile see nothing
                }
                // Find system role ID if applicable
                const systemRole = await this.prisma.role.findFirst({
                    where: { businessId, name: employee.role }
                });
                const roleIds = [];
                if (employee.customRoleId)
                    roleIds.push(employee.customRoleId);
                if (systemRole)
                    roleIds.push(systemRole.id);
                // Target conditions
                const targetConditions = [
                    { targetType: 'ALL' },
                    { targetType: 'DEPARTMENT', targetValue: employee.departmentId },
                ];
                // Add both system role string and role IDs
                if (employee.role) {
                    targetConditions.push({ targetType: 'ROLE', targetValue: employee.role });
                }
                roleIds.forEach(id => {
                    targetConditions.push({ targetType: 'ROLE', targetValue: id });
                });
                whereClause = {
                    businessId,
                    OR: [
                        { authorId: userId },
                        {
                            AND: [
                                {
                                    OR: [
                                        { status: 'PUBLISHED' },
                                        {
                                            AND: [
                                                { status: 'SCHEDULED' },
                                                { scheduledAt: { lte: new Date() } }
                                            ]
                                        }
                                    ]
                                },
                                { OR: targetConditions }
                            ]
                        }
                    ]
                };
            }
            const announcements = await this.prisma.announcement.findMany({
                where: whereClause,
                include: {
                    author: {
                        select: { firstName: true, lastName: true }
                    },
                    reads: {
                        where: { userId }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return announcements.map(a => ({
                ...a,
                isRead: a.reads.length > 0
            }));
        }
        async markAsRead(announcementId, userId) {
            try {
                return await this.prisma.announcementRead.create({
                    data: {
                        announcementId,
                        userId,
                    },
                });
            }
            catch (e) {
                // Ignore if already exists (unique constraint)
                return { status: 'already read' };
            }
        }
        async remove(id, userId, businessId) {
            // Verify ownership/tenancy
            const existing = await this.prisma.announcement.findFirst({
                where: { id, businessId }
            });
            if (!existing) {
                throw new common_1.BadRequestException('Announcement not found or access denied');
            }
            const announcement = await this.prisma.announcement.delete({
                where: { id },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'DELETE',
                resource: 'ANNOUNCEMENT',
                resourceId: id,
                details: { id },
            });
            return announcement;
        }
    };
    __setFunctionName(_classThis, "AnnouncementsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AnnouncementsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AnnouncementsService = _classThis;
})();
exports.AnnouncementsService = AnnouncementsService;
