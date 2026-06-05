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
exports.ChatsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let ChatsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ChatsService = _classThis = class {
        constructor(prisma, notifications, push) {
            this.prisma = prisma;
            this.notifications = notifications;
            this.push = push;
        }
        getUserId(user) {
            return (user === null || user === void 0 ? void 0 : user.userId) || (user === null || user === void 0 ? void 0 : user.sub) || (user === null || user === void 0 ? void 0 : user.id);
        }
        isAdmin(user) {
            return (user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.SUPER_ADMIN || (user === null || user === void 0 ? void 0 : user.role) === types_1.UserRole.BUSINESS_ADMIN;
        }
        async getBusinessId(user, businessIdHeader) {
            if (user.role === types_1.UserRole.SUPER_ADMIN) {
                if (businessIdHeader)
                    return businessIdHeader;
                throw new common_1.BadRequestException('Business context required for Super Admin');
            }
            const userId = this.getUserId(user);
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (ownedBusiness) {
                if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
                    throw new common_1.BadRequestException('Access denied: You cannot access another business data');
                }
                return ownedBusiness.id;
            }
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            if (businessIdHeader && businessIdHeader !== employee.businessId) {
                throw new common_1.BadRequestException('Access denied: You cannot access another business data');
            }
            return employee.businessId;
        }
        async getEmployeeForUser(user, businessId) {
            const userId = this.getUserId(user);
            if (!userId)
                return null;
            return this.prisma.employee.findFirst({ where: { userId, ...(businessId ? { businessId } : {}) } });
        }
        async requireEmployee(user, businessId) {
            const existing = await this.getEmployeeForUser(user, businessId);
            if (existing)
                return existing;
            if (!this.isAdmin(user))
                throw new common_1.BadRequestException('Employee profile required for chat actions');
            const userId = this.getUserId(user);
            if (!userId)
                throw new common_1.BadRequestException('Employee profile required for chat actions');
            const u = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, firstName: true, lastName: true, role: true },
            });
            if (!(u === null || u === void 0 ? void 0 : u.email))
                throw new common_1.BadRequestException('Employee profile required for chat actions');
            return this.prisma.employee.create({
                data: {
                    firstName: u.firstName || 'Admin',
                    lastName: u.lastName || 'User',
                    email: u.email,
                    businessId,
                    userId: u.id,
                    role: u.role === types_1.UserRole.SUPER_ADMIN ? types_1.UserRole.BUSINESS_ADMIN : u.role,
                    type: 'FULL_TIME',
                    payType: 'SALARY',
                    status: 'ACTIVE',
                },
            });
        }
        async ensureEmployeeForUserId(businessId, userId) {
            const existing = await this.prisma.employee.findFirst({ where: { businessId, userId } });
            if (existing)
                return existing;
            const u = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, firstName: true, lastName: true, role: true },
            });
            if (!(u === null || u === void 0 ? void 0 : u.email))
                throw new common_1.BadRequestException('Employee profile required for chat actions');
            const role = u.role === types_1.UserRole.SUPER_ADMIN ? types_1.UserRole.BUSINESS_ADMIN : u.role;
            return this.prisma.employee.create({
                data: {
                    firstName: u.firstName || 'Admin',
                    lastName: u.lastName || 'User',
                    email: u.email,
                    businessId,
                    userId: u.id,
                    role,
                    type: 'FULL_TIME',
                    payType: 'SALARY',
                    status: 'ACTIVE',
                },
            });
        }
        async getThreadOrThrow(businessId, threadId) {
            const thread = await this.prisma.chatThread.findFirst({
                where: { id: threadId, businessId },
                include: {
                    participants: {
                        include: {
                            employee: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    badgeNumber: true,
                                    status: true,
                                    profileImageUrl: true,
                                    role: true,
                                    customRole: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            });
            if (!thread)
                throw new common_1.NotFoundException('Chat not found');
            return thread;
        }
        async requireThreadAccess(user, businessId, threadId) {
            const thread = await this.getThreadOrThrow(businessId, threadId);
            const employee = await this.requireEmployee(user, businessId);
            const participant = thread.participants.find((p) => p.employeeId === employee.id);
            if (!participant)
                throw new common_1.ForbiddenException('You are not a participant in this chat');
            return { thread, employee, participant };
        }
        directKey(a, b) {
            return [a, b].sort().join(':');
        }
        roleToDesignation(rawRole, customRoleName) {
            const custom = String(customRoleName || '').trim();
            if (custom)
                return custom;
            const role = String(rawRole || '').trim().toUpperCase();
            if (role === 'SUPER_ADMIN')
                return 'Administrator';
            if (role === 'BUSINESS_ADMIN')
                return 'Business Admin';
            if (role === 'MANAGER')
                return 'Manager';
            if (role === 'EMPLOYEE')
                return 'Employee';
            if (!role)
                return '';
            return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        }
        async notifyNewChatMessage(args) {
            var _a, _b;
            const thread = await this.prisma.chatThread.findFirst({
                where: { id: args.threadId, businessId: args.businessId },
                select: {
                    id: true,
                    type: true,
                    title: true,
                    participants: { select: { employeeId: true, employee: { select: { userId: true } } } },
                },
            });
            if (!thread)
                return;
            const previewBase = ((_a = args.text) === null || _a === void 0 ? void 0 : _a.trim()) || '';
            const preview = previewBase
                ? previewBase.length > 140
                    ? `${previewBase.slice(0, 140)}…`
                    : previewBase
                : args.hasAttachments
                    ? 'Sent an attachment'
                    : 'New message';
            const title = thread.type === 'DIRECT' ? `New message from ${args.senderName}` : thread.title || 'New group message';
            const message = thread.type === 'DIRECT' ? preview : `${args.senderName}: ${preview}`;
            const metadata = { kind: 'CHAT', threadId: thread.id, messageId: args.messageId };
            const actionUrl = `/dashboard/communications/chats?threadId=${encodeURIComponent(thread.id)}&messageId=${encodeURIComponent(args.messageId)}`;
            for (const p of thread.participants) {
                if (p.employeeId === args.senderEmployeeId)
                    continue;
                const userId = (_b = p.employee) === null || _b === void 0 ? void 0 : _b.userId;
                if (!userId)
                    continue;
                await this.notifications.createNotification(userId, 'CHAT', title, message, metadata);
                await this.notifications.sendPush(userId, { type: 'CHAT', title, message, metadata });
                await this.push.send(userId, { type: 'CHAT', title, message, metadata, actionUrl });
            }
        }
        async listThreads(user, businessIdHeader, opts) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const employee = await this.getEmployeeForUser(user, businessId);
            if (!employee)
                return [];
            const where = {
                businessId,
                participants: { some: { employeeId: employee.id } },
            };
            if (opts === null || opts === void 0 ? void 0 : opts.type)
                where.type = opts.type;
            const threads = await this.prisma.chatThread.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                include: {
                    participants: {
                        include: {
                            employee: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    badgeNumber: true,
                                    status: true,
                                    profileImageUrl: true,
                                    role: true,
                                    customRole: { select: { name: true } },
                                },
                            },
                        },
                    },
                    messages: {
                        where: { deletedAt: null },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: {
                            senderEmployee: { select: { id: true, firstName: true, lastName: true } },
                            attachments: true,
                        },
                    },
                },
            });
            const unreadCounts = employee
                ? await Promise.all(threads.map(async (t) => {
                    const mine = t.participants.find((p) => p.employeeId === employee.id);
                    const lastReadAt = (mine === null || mine === void 0 ? void 0 : mine.lastReadAt) || null;
                    const count = await this.prisma.chatMessage.count({
                        where: {
                            threadId: t.id,
                            deletedAt: null,
                            senderEmployeeId: { not: employee.id },
                            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
                        },
                    });
                    return [t.id, count];
                }))
                : [];
            const unreadMap = new Map(unreadCounts);
            return threads.map((t) => {
                var _a, _b, _c, _d;
                const last = t.messages[0] || null;
                const members = t.participants.map((p) => ({
                    employeeId: p.employeeId,
                    role: p.role,
                    lastReadAt: p.lastReadAt,
                    employee: p.employee,
                }));
                let displayTitle = t.title || 'Chat';
                let displayImageUrl = t.imageUrl || null;
                let displayDesignation = '';
                if (t.type === 'DIRECT' && employee) {
                    const other = members.find((m) => m.employeeId !== employee.id);
                    if (other === null || other === void 0 ? void 0 : other.employee) {
                        displayTitle = `${other.employee.firstName} ${other.employee.lastName}`.trim();
                        displayImageUrl = other.employee.profileImageUrl || displayImageUrl;
                        displayDesignation = this.roleToDesignation(other.employee.role, (_a = other.employee.customRole) === null || _a === void 0 ? void 0 : _a.name);
                    }
                }
                return {
                    id: t.id,
                    type: t.type,
                    title: t.title,
                    imageUrl: t.imageUrl,
                    displayTitle,
                    displayImageUrl,
                    displayDesignation,
                    updatedAt: t.updatedAt,
                    unreadCount: unreadMap.get(t.id) || 0,
                    participants: members,
                    lastMessage: last
                        ? {
                            id: last.id,
                            text: last.text,
                            createdAt: last.createdAt,
                            senderEmployeeId: last.senderEmployeeId,
                            senderName: `${((_b = last.senderEmployee) === null || _b === void 0 ? void 0 : _b.firstName) || ''} ${((_c = last.senderEmployee) === null || _c === void 0 ? void 0 : _c.lastName) || ''}`.trim(),
                            attachments: ((_d = last.attachments) === null || _d === void 0 ? void 0 : _d.map((a) => ({ id: a.id, type: a.type, url: a.url, originalName: a.originalName, mimeType: a.mimeType }))) || [],
                        }
                        : null,
                };
            });
        }
        async createDirectThread(user, businessIdHeader, otherEmployeeId) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const me = await this.requireEmployee(user, businessId);
            if (me.id === otherEmployeeId)
                throw new common_1.BadRequestException('Cannot create direct chat with yourself');
            const other = await this.prisma.employee.findFirst({ where: { id: otherEmployeeId, businessId, status: 'ACTIVE' } });
            if (!other)
                throw new common_1.NotFoundException('Employee not found');
            const key = this.directKey(me.id, other.id);
            const existing = await this.prisma.chatThread.findFirst({ where: { businessId, directKey: key } });
            if (existing)
                return existing;
            return this.prisma.chatThread.create({
                data: {
                    businessId,
                    type: 'DIRECT',
                    directKey: key,
                    participants: {
                        create: [
                            { employeeId: me.id, role: 'MEMBER' },
                            { employeeId: other.id, role: 'MEMBER' },
                        ],
                    },
                },
            });
        }
        async createSupportThread(user, businessIdHeader) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const me = await this.requireEmployee(user, businessId);
            const business = await this.prisma.business.findUnique({
                where: { id: businessId },
                select: { ownerId: true },
            });
            let adminEmployee = null;
            if (business === null || business === void 0 ? void 0 : business.ownerId) {
                adminEmployee = await this.ensureEmployeeForUserId(businessId, business.ownerId);
            }
            if (!adminEmployee) {
                adminEmployee = await this.prisma.employee.findFirst({
                    where: { businessId, userId: { not: null }, role: { in: [types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER] } },
                    orderBy: { createdAt: 'asc' },
                });
            }
            if (!(adminEmployee === null || adminEmployee === void 0 ? void 0 : adminEmployee.id))
                throw new common_1.BadRequestException('No admin account is available for support chat');
            if (adminEmployee.id === me.id)
                throw new common_1.BadRequestException('No admin account is available for support chat');
            return this.createDirectThread(user, businessIdHeader, adminEmployee.id);
        }
        async createGroupThread(user, businessIdHeader, dto) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            if (!this.isAdmin(user))
                throw new common_1.ForbiddenException('Only admins can create groups');
            const memberIds = new Set(dto.memberEmployeeIds || []);
            const me = await this.requireEmployee(user, businessId);
            memberIds.add(me.id);
            const employees = await this.prisma.employee.findMany({ where: { businessId, id: { in: Array.from(memberIds) }, status: 'ACTIVE' } });
            if (employees.length === 0)
                throw new common_1.BadRequestException('At least one active member required');
            const thread = await this.prisma.chatThread.create({
                data: {
                    businessId,
                    type: 'GROUP',
                    title: dto.title.trim(),
                    imageUrl: dto.imageUrl || null,
                    createdById: this.getUserId(user) || null,
                    participants: {
                        create: employees.map((e) => ({
                            employeeId: e.id,
                            role: e.id === me.id ? 'ADMIN' : 'MEMBER',
                        })),
                    },
                },
            });
            return thread;
        }
        async getThread(user, businessIdHeader, threadId) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const { thread, participant } = await this.requireThreadAccess(user, businessId, threadId);
            return {
                id: thread.id,
                type: thread.type,
                title: thread.title,
                imageUrl: thread.imageUrl,
                directKey: thread.directKey,
                updatedAt: thread.updatedAt,
                myRole: (participant === null || participant === void 0 ? void 0 : participant.role) || null,
                myLastReadAt: (participant === null || participant === void 0 ? void 0 : participant.lastReadAt) || null,
                participants: thread.participants.map((p) => ({
                    employeeId: p.employeeId,
                    role: p.role,
                    lastReadAt: p.lastReadAt,
                    employee: p.employee,
                })),
            };
        }
        async updateThread(user, businessIdHeader, threadId, dto) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const { thread, employee } = await this.requireThreadAccess(user, businessId, threadId);
            if (thread.type !== 'GROUP')
                throw new common_1.BadRequestException('Only groups can be updated');
            const participant = employee ? thread.participants.find((p) => p.employeeId === employee.id) : null;
            if (!this.isAdmin(user) && (participant === null || participant === void 0 ? void 0 : participant.role) !== 'ADMIN')
                throw new common_1.ForbiddenException('Only admins can update group info');
            const data = {};
            if (dto.title !== undefined)
                data.title = dto.title.trim();
            if (dto.imageUrl !== undefined)
                data.imageUrl = dto.imageUrl || null;
            data.updatedAt = new Date();
            return this.prisma.chatThread.update({ where: { id: threadId }, data });
        }
        async addMember(user, businessIdHeader, threadId, employeeId) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const { thread, employee } = await this.requireThreadAccess(user, businessId, threadId);
            if (thread.type !== 'GROUP')
                throw new common_1.BadRequestException('Cannot add members to a direct chat');
            const participant = employee ? thread.participants.find((p) => p.employeeId === employee.id) : null;
            if (!this.isAdmin(user) && (participant === null || participant === void 0 ? void 0 : participant.role) !== 'ADMIN')
                throw new common_1.ForbiddenException('Only admins can add members');
            const emp = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId, status: 'ACTIVE' } });
            if (!emp)
                throw new common_1.NotFoundException('Employee not found');
            await this.prisma.chatParticipant.upsert({
                where: { threadId_employeeId: { threadId, employeeId } },
                update: {},
                create: { threadId, employeeId, role: 'MEMBER' },
            });
            await this.prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
            return { ok: true };
        }
        async removeMember(user, businessIdHeader, threadId, employeeId) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const { thread, employee } = await this.requireThreadAccess(user, businessId, threadId);
            if (thread.type !== 'GROUP')
                throw new common_1.BadRequestException('Cannot remove members from a direct chat');
            const participant = employee ? thread.participants.find((p) => p.employeeId === employee.id) : null;
            if (!this.isAdmin(user) && (participant === null || participant === void 0 ? void 0 : participant.role) !== 'ADMIN')
                throw new common_1.ForbiddenException('Only admins can remove members');
            await this.prisma.chatParticipant.deleteMany({ where: { threadId, employeeId } });
            await this.prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
            return { ok: true };
        }
        async listMessages(user, businessIdHeader, threadId, before, take = 50) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            await this.requireThreadAccess(user, businessId, threadId);
            const where = { threadId };
            if (before)
                where.createdAt = { lt: new Date(before) };
            const messages = await this.prisma.chatMessage.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: Math.min(200, Math.max(1, take)),
                include: {
                    senderEmployee: { select: { id: true, firstName: true, lastName: true } },
                    attachments: true,
                    reactions: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
                    replyTo: {
                        include: { senderEmployee: { select: { id: true, firstName: true, lastName: true } } },
                    },
                },
            });
            return messages
                .slice()
                .reverse()
                .map((m) => {
                var _a, _b, _c, _d;
                return ({
                    id: m.id,
                    threadId: m.threadId,
                    senderEmployeeId: m.senderEmployeeId,
                    senderName: `${((_a = m.senderEmployee) === null || _a === void 0 ? void 0 : _a.firstName) || ''} ${((_b = m.senderEmployee) === null || _b === void 0 ? void 0 : _b.lastName) || ''}`.trim(),
                    text: m.deletedAt ? null : m.text,
                    createdAt: m.createdAt,
                    editedAt: m.editedAt,
                    deletedAt: m.deletedAt,
                    replyTo: m.replyTo
                        ? {
                            id: m.replyTo.id,
                            senderEmployeeId: m.replyTo.senderEmployeeId,
                            senderName: `${((_c = m.replyTo.senderEmployee) === null || _c === void 0 ? void 0 : _c.firstName) || ''} ${((_d = m.replyTo.senderEmployee) === null || _d === void 0 ? void 0 : _d.lastName) || ''}`.trim(),
                            text: m.replyTo.deletedAt ? null : m.replyTo.text,
                        }
                        : null,
                    attachments: (m.attachments || []).map((a) => ({
                        id: a.id,
                        type: a.type,
                        url: a.url,
                        filename: a.filename,
                        originalName: a.originalName,
                        mimeType: a.mimeType,
                        size: a.size,
                    })),
                    reactions: (m.reactions || []).map((r) => {
                        var _a, _b;
                        return ({
                            id: r.id,
                            emoji: r.emoji,
                            employeeId: r.employeeId,
                            employeeName: `${((_a = r.employee) === null || _a === void 0 ? void 0 : _a.firstName) || ''} ${((_b = r.employee) === null || _b === void 0 ? void 0 : _b.lastName) || ''}`.trim(),
                        });
                    }),
                });
            });
        }
        async sendMessage(user, businessIdHeader, threadId, dto) {
            var _a, _b, _c, _d, _e, _f, _g;
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const { thread, employee } = await this.requireThreadAccess(user, businessId, threadId);
            const sender = employee || (this.isAdmin(user) ? await this.requireEmployee(user, businessId) : null);
            if (!sender)
                throw new common_1.BadRequestException('Employee profile required for sending messages');
            const text = ((_a = dto.text) === null || _a === void 0 ? void 0 : _a.trim()) || '';
            const attachments = dto.attachments || [];
            if (!text && attachments.length === 0)
                throw new common_1.BadRequestException('Message text or attachments required');
            if (dto.replyToId) {
                const reply = await this.prisma.chatMessage.findFirst({ where: { id: dto.replyToId, threadId } });
                if (!reply)
                    throw new common_1.BadRequestException('Reply target not found');
            }
            const msg = await this.prisma.chatMessage.create({
                data: {
                    threadId,
                    senderEmployeeId: sender.id,
                    text: text || null,
                    replyToId: dto.replyToId || null,
                    attachments: {
                        create: attachments.map((a) => ({
                            type: a.type,
                            url: a.url,
                            filename: a.filename || null,
                            originalName: a.originalName || null,
                            mimeType: a.mimeType || null,
                            size: typeof a.size === 'number' ? a.size : null,
                        })),
                    },
                },
                include: {
                    senderEmployee: { select: { id: true, firstName: true, lastName: true } },
                    attachments: true,
                    reactions: true,
                    replyTo: { include: { senderEmployee: { select: { id: true, firstName: true, lastName: true } } } },
                },
            });
            await this.prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
            await this.notifyNewChatMessage({
                businessId,
                threadId,
                messageId: msg.id,
                senderEmployeeId: msg.senderEmployeeId,
                senderName: `${((_b = msg.senderEmployee) === null || _b === void 0 ? void 0 : _b.firstName) || ''} ${((_c = msg.senderEmployee) === null || _c === void 0 ? void 0 : _c.lastName) || ''}`.trim(),
                text: msg.text,
                hasAttachments: (msg.attachments || []).length > 0,
            });
            return {
                id: msg.id,
                threadId: msg.threadId,
                senderEmployeeId: msg.senderEmployeeId,
                senderName: `${((_d = msg.senderEmployee) === null || _d === void 0 ? void 0 : _d.firstName) || ''} ${((_e = msg.senderEmployee) === null || _e === void 0 ? void 0 : _e.lastName) || ''}`.trim(),
                text: msg.text,
                createdAt: msg.createdAt,
                editedAt: msg.editedAt,
                deletedAt: msg.deletedAt,
                replyTo: msg.replyTo
                    ? {
                        id: msg.replyTo.id,
                        senderEmployeeId: msg.replyTo.senderEmployeeId,
                        senderName: `${((_f = msg.replyTo.senderEmployee) === null || _f === void 0 ? void 0 : _f.firstName) || ''} ${((_g = msg.replyTo.senderEmployee) === null || _g === void 0 ? void 0 : _g.lastName) || ''}`.trim(),
                        text: msg.replyTo.deletedAt ? null : msg.replyTo.text,
                    }
                    : null,
                attachments: (msg.attachments || []).map((a) => ({
                    id: a.id,
                    type: a.type,
                    url: a.url,
                    filename: a.filename,
                    originalName: a.originalName,
                    mimeType: a.mimeType,
                    size: a.size,
                })),
                reactions: [],
                thread: { type: thread.type },
            };
        }
        async markRead(user, businessIdHeader, threadId) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const employee = await this.requireEmployee(user, businessId);
            await this.requireThreadAccess(user, businessId, threadId);
            const lastReadAt = new Date();
            await this.prisma.chatParticipant.upsert({
                where: { threadId_employeeId: { threadId, employeeId: employee.id } },
                update: { lastReadAt },
                create: { threadId, employeeId: employee.id, lastReadAt, role: 'MEMBER' },
            });
            const userId = this.getUserId(user);
            if (userId) {
                const threadIdNeedle = `"threadId":"${threadId}"`;
                await this.prisma.notification.updateMany({
                    where: { userId, type: 'CHAT', read: false, metadata: { contains: threadIdNeedle } },
                    data: { read: true },
                });
            }
            return { threadId, employeeId: employee.id, lastReadAt };
        }
        async editMessage(user, businessIdHeader, messageId, dto) {
            var _a;
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const msg = await this.prisma.chatMessage.findFirst({
                where: { id: messageId, thread: { businessId } },
                include: { thread: true },
            });
            if (!msg)
                throw new common_1.NotFoundException('Message not found');
            const employee = await this.requireEmployee(user, businessId);
            if (!this.isAdmin(user) && msg.senderEmployeeId !== employee.id)
                throw new common_1.ForbiddenException('You can only edit your own messages');
            if (msg.deletedAt)
                throw new common_1.BadRequestException('Cannot edit a deleted message');
            if (Date.now() - new Date(msg.createdAt).getTime() > 30 * 60 * 1000)
                throw new common_1.BadRequestException('Messages cannot be edited after 30 minutes');
            const replyExists = await this.prisma.chatMessage.findFirst({ where: { replyToId: messageId, deletedAt: null }, select: { id: true } });
            if (replyExists)
                throw new common_1.BadRequestException('Messages cannot be edited after a reply');
            const text = (_a = dto.text) === null || _a === void 0 ? void 0 : _a.trim();
            if (!text)
                throw new common_1.BadRequestException('Message text is required');
            return this.prisma.chatMessage.update({
                where: { id: messageId },
                data: { text, editedAt: new Date() },
            });
        }
        async deleteMessage(user, businessIdHeader, messageId) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const msg = await this.prisma.chatMessage.findFirst({ where: { id: messageId, thread: { businessId } } });
            if (!msg)
                throw new common_1.NotFoundException('Message not found');
            const employee = await this.requireEmployee(user, businessId);
            if (!this.isAdmin(user) && msg.senderEmployeeId !== employee.id)
                throw new common_1.ForbiddenException('You can only delete your own messages');
            await this.prisma.chatAttachment.deleteMany({ where: { messageId } });
            await this.prisma.chatReaction.deleteMany({ where: { messageId } });
            return this.prisma.chatMessage.update({
                where: { id: messageId },
                data: { deletedAt: new Date(), text: null },
            });
        }
        async addReaction(user, businessIdHeader, messageId, emoji) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const employee = await this.requireEmployee(user, businessId);
            const msg = await this.prisma.chatMessage.findFirst({ where: { id: messageId, thread: { businessId } } });
            if (!msg)
                throw new common_1.NotFoundException('Message not found');
            await this.requireThreadAccess(user, businessId, msg.threadId);
            const cleaned = String(emoji || '').trim();
            if (!cleaned)
                throw new common_1.BadRequestException('Emoji is required');
            await this.prisma.chatReaction.upsert({
                where: { messageId_employeeId_emoji: { messageId, employeeId: employee.id, emoji: cleaned } },
                update: {},
                create: { messageId, employeeId: employee.id, emoji: cleaned },
            });
            return { ok: true };
        }
        async removeReaction(user, businessIdHeader, messageId, emoji) {
            const businessId = await this.getBusinessId(user, businessIdHeader);
            const employee = await this.requireEmployee(user, businessId);
            const msg = await this.prisma.chatMessage.findFirst({ where: { id: messageId, thread: { businessId } } });
            if (!msg)
                throw new common_1.NotFoundException('Message not found');
            await this.requireThreadAccess(user, businessId, msg.threadId);
            const cleaned = String(emoji || '').trim();
            if (!cleaned)
                throw new common_1.BadRequestException('Emoji is required');
            await this.prisma.chatReaction.deleteMany({ where: { messageId, employeeId: employee.id, emoji: cleaned } });
            return { ok: true };
        }
    };
    __setFunctionName(_classThis, "ChatsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ChatsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ChatsService = _classThis;
})();
exports.ChatsService = ChatsService;
