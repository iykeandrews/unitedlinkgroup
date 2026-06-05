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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
let NotificationsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var NotificationsService = _classThis = class {
        constructor(prisma, stream) {
            this.prisma = prisma;
            this.stream = stream;
        }
        async createNotification(userId, type, title, message, metadata) {
            return this.prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                },
            });
        }
        async getUserNotifications(userId) {
            return this.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        }
        async markAsRead(id, userId) {
            const notification = await this.prisma.notification.findUnique({ where: { id } });
            if (!notification)
                throw new common_1.NotFoundException('Notification not found');
            if (notification.userId !== userId)
                throw new common_1.ForbiddenException('You cannot access this notification');
            return this.prisma.notification.update({
                where: { id },
                data: { read: true },
            });
        }
        async markAllAsRead(userId) {
            return this.prisma.notification.updateMany({
                where: { userId, read: false },
                data: { read: true },
            });
        }
        async remove(id, userId) {
            const notification = await this.prisma.notification.findUnique({ where: { id } });
            if (!notification)
                throw new common_1.NotFoundException('Notification not found');
            if (notification.userId !== userId)
                throw new common_1.ForbiddenException('You cannot access this notification');
            return this.prisma.notification.delete({
                where: { id },
            });
        }
        // Stub for sending email (using console.log for now)
        async sendEmail(to, subject, body) {
            console.log(`[EMAIL STUB] To: ${to}, Subject: ${subject}, Body: ${body}`);
            // In real app, use SendGrid / AWS SES / Nodemailer
        }
        // Push via SSE to connected clients
        async sendPush(userId, payload) {
            this.stream.emitToUser(userId, payload);
        }
        // Create a message in an employee-admin conversation, persist audit, and notify recipient
        async addConversationMessage(employeeId, senderUserId, text, senderUser) {
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                include: { user: true, business: true }
            });
            if (!employee)
                throw new common_1.NotFoundException('Employee not found');
            // Access Control Check
            if (senderUser) {
                if (senderUser.role !== 'SUPER_ADMIN') {
                    if (senderUser.userId === employee.userId) {
                        // Allowed
                    }
                    else {
                        const isBusinessAdmin = senderUser.role === 'BUSINESS_ADMIN' || senderUser.role === 'MANAGER';
                        const isSameBusiness = senderUser.businessId === employee.businessId;
                        if (!isBusinessAdmin || !isSameBusiness) {
                            const isOwner = employee.business.ownerId === senderUser.userId;
                            if (!isOwner) {
                                throw new common_1.ForbiddenException('Access denied to this conversation');
                            }
                        }
                    }
                }
            }
            const sender = await this.prisma.user.findUnique({ where: { id: senderUserId } });
            if (!sender)
                throw new common_1.NotFoundException('Sender not found');
            const senderRole = sender.role;
            // Decide recipient:
            // - If sender is admin/superadmin/manager, recipient is the employee user (if linked)
            // - If sender is employee, recipient is business owner (admin)
            let recipientUserId = null;
            if (senderRole === 'EMPLOYEE') {
                recipientUserId = employee.business.ownerId;
            }
            else {
                recipientUserId = employee.userId || null;
            }
            // Persist audit trail for conversation thread tied to the employee
            await this.prisma.auditLog.create({
                data: {
                    businessId: employee.businessId,
                    userId: senderUserId,
                    action: 'MESSAGE',
                    resource: 'EMPLOYEE',
                    resourceId: employeeId,
                    details: JSON.stringify({
                        text,
                        senderRole,
                        senderUserId,
                        employeeId
                    })
                }
            });
            // Notify recipient (if exists) with a concise preview and metadata for deep linking
            if (recipientUserId) {
                const title = senderRole === 'EMPLOYEE'
                    ? `New message from ${employee.firstName} ${employee.lastName}`
                    : `New message regarding ${employee.firstName} ${employee.lastName}`;
                const preview = text.length > 140 ? text.slice(0, 140) + '…' : text;
                await this.createNotification(recipientUserId, 'MESSAGE', title, preview, {
                    kind: 'MESSAGE',
                    employeeId,
                    employeeName: `${employee.firstName} ${employee.lastName}`
                });
                this.sendPush(recipientUserId, {
                    type: 'MESSAGE',
                    title,
                    message: preview,
                    metadata: { employeeId }
                });
            }
            return { ok: true };
        }
        // Fetch the threaded conversation for an employee (admin and employee can view)
        async getConversation(employeeId, requestUser) {
            // Validate access
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
                include: { business: true }
            });
            if (!employee) {
                // Return empty or throw? Throwing reveals existence, but it's okay for now.
                // Actually, if we want to be strict, we should check existence.
                throw new common_1.NotFoundException('Conversation not found');
            }
            if (requestUser.role !== 'SUPER_ADMIN') {
                const isEmployee = requestUser.userId === employee.userId;
                const isBusinessAdmin = (requestUser.role === 'BUSINESS_ADMIN' || requestUser.role === 'MANAGER') && requestUser.businessId === employee.businessId;
                const isOwner = employee.business.ownerId === requestUser.userId;
                if (!isEmployee && !isBusinessAdmin && !isOwner) {
                    throw new common_1.ForbiddenException('Access denied');
                }
            }
            const logs = await this.prisma.auditLog.findMany({
                where: {
                    resource: 'EMPLOYEE',
                    resourceId: employeeId,
                    action: 'MESSAGE'
                },
                orderBy: { createdAt: 'asc' }
            });
            // Optionally hydrate sender names
            const userIds = Array.from(new Set(logs.map(l => l.userId).filter(Boolean)));
            const users = userIds.length
                ? await this.prisma.user.findMany({ where: { id: { in: userIds } } })
                : [];
            const userMap = new Map(users.map(u => [u.id, u]));
            return logs.map(l => {
                var _a;
                let details = {};
                try {
                    details = l.details ? JSON.parse(l.details) : {};
                }
                catch { }
                const sender = l.userId ? userMap.get(l.userId) : undefined;
                return {
                    id: l.id,
                    text: (details === null || details === void 0 ? void 0 : details.text) || '',
                    senderUserId: l.userId,
                    senderRole: (details === null || details === void 0 ? void 0 : details.senderRole) || ((_a = sender === null || sender === void 0 ? void 0 : sender.role) !== null && _a !== void 0 ? _a : 'UNKNOWN'),
                    senderName: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email : 'System',
                    createdAt: l.createdAt
                };
            });
        }
    };
    __setFunctionName(_classThis, "NotificationsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        NotificationsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return NotificationsService = _classThis;
})();
exports.NotificationsService = NotificationsService;
