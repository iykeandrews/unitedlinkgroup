"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const types_1 = require("@unitedlinkgroup/types");
let ChatsGateway = (() => {
    let _classDecorators = [(0, websockets_1.WebSocketGateway)({
            cors: { origin: true, credentials: true },
            transports: ['websocket', 'polling'],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _server_decorators;
    let _server_initializers = [];
    let _server_extraInitializers = [];
    let _onJoin_decorators;
    let _onLeave_decorators;
    let _onTypingStart_decorators;
    let _onTypingStop_decorators;
    let _onReadMark_decorators;
    let _onMessageSend_decorators;
    let _onMessageEdit_decorators;
    let _onMessageDelete_decorators;
    let _onReactionToggle_decorators;
    var ChatsGateway = _classThis = class {
        constructor(jwtService, configService, prisma, chatsService) {
            this.jwtService = (__runInitializers(this, _instanceExtraInitializers), jwtService);
            this.configService = configService;
            this.prisma = prisma;
            this.chatsService = chatsService;
            this.server = __runInitializers(this, _server_initializers, void 0);
            this.presence = (__runInitializers(this, _server_extraInitializers), new Map());
        }
        getToken(client) {
            var _a, _b, _c;
            const authToken = (_a = client.handshake.auth) === null || _a === void 0 ? void 0 : _a.token;
            if (typeof authToken === 'string' && authToken)
                return authToken;
            const header = (_b = client.handshake.headers) === null || _b === void 0 ? void 0 : _b.authorization;
            if (typeof header === 'string' && header.startsWith('Bearer '))
                return header.slice('Bearer '.length);
            const queryToken = (_c = client.handshake.query) === null || _c === void 0 ? void 0 : _c.token;
            if (typeof queryToken === 'string' && queryToken)
                return queryToken;
            return null;
        }
        isAdmin(role) {
            return role === types_1.UserRole.SUPER_ADMIN || role === types_1.UserRole.BUSINESS_ADMIN;
        }
        async ensureEmployeeForUser(userId, businessId, role) {
            const existing = await this.prisma.employee.findFirst({ where: { userId, businessId }, select: { id: true, businessId: true } });
            if (existing)
                return existing;
            if (!this.isAdmin(role))
                return null;
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, lastName: true, role: true } });
            if (!user)
                return null;
            const created = await this.prisma.employee.create({
                data: {
                    firstName: user.firstName || 'Admin',
                    lastName: user.lastName || 'User',
                    email: user.email,
                    businessId,
                    userId: user.id,
                    role: user.role === types_1.UserRole.SUPER_ADMIN ? types_1.UserRole.BUSINESS_ADMIN : user.role,
                    type: 'FULL_TIME',
                    payType: 'SALARY',
                    status: 'ACTIVE',
                },
                select: { id: true, businessId: true },
            });
            return created;
        }
        businessRoom(businessId) {
            return `business:${businessId}`;
        }
        threadRoom(threadId) {
            return `thread:${threadId}`;
        }
        emitPresenceSnapshot(client, businessId) {
            const snapshot = Array.from(this.presence.entries())
                .filter(([, state]) => state.businessId === businessId)
                .map(([employeeId, state]) => ({
                employeeId,
                online: state.count > 0,
                lastSeenAt: state.lastSeenAt,
            }));
            client.emit('presence:snapshot', snapshot);
        }
        emitPresence(businessId, employeeId, online, lastSeenAt) {
            this.server.to(this.businessRoom(businessId)).emit('presence:update', {
                employeeId,
                online,
                lastSeenAt,
            });
        }
        async handleConnection(client) {
            var _a;
            try {
                const token = this.getToken(client);
                if (!token) {
                    client.disconnect(true);
                    return;
                }
                const decoded = await this.jwtService.verifyAsync(token, { secret: this.configService.get('JWT_SECRET') });
                const userId = decoded === null || decoded === void 0 ? void 0 : decoded.sub;
                const role = decoded === null || decoded === void 0 ? void 0 : decoded.role;
                const businessIdFromToken = decoded === null || decoded === void 0 ? void 0 : decoded.businessId;
                const businessIdFromClient = (_a = client.handshake.auth) === null || _a === void 0 ? void 0 : _a.businessId;
                let employee = null;
                if (userId) {
                    employee = await this.prisma.employee.findFirst({
                        where: { userId, ...(businessIdFromToken ? { businessId: businessIdFromToken } : {}) },
                        select: { id: true, businessId: true },
                    });
                }
                const businessId = businessIdFromToken || businessIdFromClient || (employee === null || employee === void 0 ? void 0 : employee.businessId);
                if (!businessId) {
                    client.disconnect(true);
                    return;
                }
                if (userId && !(employee === null || employee === void 0 ? void 0 : employee.id)) {
                    employee = await this.ensureEmployeeForUser(userId, businessId, role);
                }
                client.data.userId = userId;
                client.data.role = role;
                client.data.businessId = businessId;
                client.data.employeeId = (employee === null || employee === void 0 ? void 0 : employee.id) || null;
                await client.join(this.businessRoom(businessId));
                if (employee === null || employee === void 0 ? void 0 : employee.id) {
                    const state = this.presence.get(employee.id) || { count: 0, lastSeenAt: null, businessId };
                    state.count += 1;
                    state.lastSeenAt = null;
                    state.businessId = businessId;
                    this.presence.set(employee.id, state);
                    this.emitPresence(businessId, employee.id, true, null);
                }
                this.emitPresenceSnapshot(client, businessId);
                client.emit('socket:ready', {
                    businessId,
                    employeeId: (employee === null || employee === void 0 ? void 0 : employee.id) || null,
                    role,
                });
            }
            catch {
                client.disconnect(true);
            }
        }
        async handleDisconnect(client) {
            var _a, _b;
            const businessId = (_a = client.data) === null || _a === void 0 ? void 0 : _a.businessId;
            const employeeId = (_b = client.data) === null || _b === void 0 ? void 0 : _b.employeeId;
            if (!businessId || !employeeId)
                return;
            const state = this.presence.get(employeeId) || { count: 0, lastSeenAt: null, businessId };
            state.count = Math.max(0, state.count - 1);
            if (state.count === 0) {
                state.lastSeenAt = new Date();
                state.businessId = businessId;
                this.presence.set(employeeId, state);
                this.emitPresence(businessId, employeeId, false, state.lastSeenAt);
            }
            else {
                state.businessId = businessId;
                this.presence.set(employeeId, state);
            }
        }
        async assertThreadAccess(client, threadId) {
            var _a, _b;
            const businessId = (_a = client.data) === null || _a === void 0 ? void 0 : _a.businessId;
            if (!businessId)
                throw new common_1.ForbiddenException();
            const thread = await this.prisma.chatThread.findFirst({
                where: { id: threadId, businessId },
                select: { id: true, businessId: true, type: true },
            });
            if (!thread)
                throw new common_1.ForbiddenException();
            const employeeId = (_b = client.data) === null || _b === void 0 ? void 0 : _b.employeeId;
            if (!employeeId)
                throw new common_1.ForbiddenException();
            const member = await this.prisma.chatParticipant.findFirst({ where: { threadId, employeeId }, select: { id: true } });
            if (!member)
                throw new common_1.ForbiddenException();
        }
        async onJoin(client, payload) {
            const threadId = String((payload === null || payload === void 0 ? void 0 : payload.threadId) || '');
            if (!threadId)
                return;
            await this.assertThreadAccess(client, threadId);
            await client.join(this.threadRoom(threadId));
            client.emit('thread:joined', { threadId });
        }
        async onLeave(client, payload) {
            const threadId = String((payload === null || payload === void 0 ? void 0 : payload.threadId) || '');
            if (!threadId)
                return;
            await client.leave(this.threadRoom(threadId));
            client.emit('thread:left', { threadId });
        }
        async onTypingStart(client, payload) {
            var _a;
            const threadId = String((payload === null || payload === void 0 ? void 0 : payload.threadId) || '');
            if (!threadId)
                return;
            await this.assertThreadAccess(client, threadId);
            const employeeId = (_a = client.data) === null || _a === void 0 ? void 0 : _a.employeeId;
            if (!employeeId)
                return;
            client.to(this.threadRoom(threadId)).emit('typing:update', { threadId, employeeId, typing: true });
        }
        async onTypingStop(client, payload) {
            var _a;
            const threadId = String((payload === null || payload === void 0 ? void 0 : payload.threadId) || '');
            if (!threadId)
                return;
            await this.assertThreadAccess(client, threadId);
            const employeeId = (_a = client.data) === null || _a === void 0 ? void 0 : _a.employeeId;
            if (!employeeId)
                return;
            client.to(this.threadRoom(threadId)).emit('typing:update', { threadId, employeeId, typing: false });
        }
        async onReadMark(client, payload) {
            var _a, _b;
            const threadId = String((payload === null || payload === void 0 ? void 0 : payload.threadId) || '');
            if (!threadId)
                return;
            await this.assertThreadAccess(client, threadId);
            const employeeId = (_a = client.data) === null || _a === void 0 ? void 0 : _a.employeeId;
            if (!employeeId)
                return;
            const lastReadAt = new Date();
            await this.prisma.chatParticipant.upsert({
                where: { threadId_employeeId: { threadId, employeeId } },
                update: { lastReadAt },
                create: { threadId, employeeId, lastReadAt, role: 'MEMBER' },
            });
            const userId = (_b = client.data) === null || _b === void 0 ? void 0 : _b.userId;
            if (userId) {
                const threadIdNeedle = `"threadId":"${threadId}"`;
                await this.prisma.notification.updateMany({
                    where: { userId, type: 'CHAT', read: false, metadata: { contains: threadIdNeedle } },
                    data: { read: true },
                });
            }
            this.server.to(this.threadRoom(threadId)).emit('read:update', { threadId, employeeId, lastReadAt });
        }
        async onMessageSend(client, payload) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const threadId = String((payload === null || payload === void 0 ? void 0 : payload.threadId) || '');
            if (!threadId)
                return;
            await this.assertThreadAccess(client, threadId);
            const businessId = (_a = client.data) === null || _a === void 0 ? void 0 : _a.businessId;
            const employeeId = (_b = client.data) === null || _b === void 0 ? void 0 : _b.employeeId;
            if (!businessId || !employeeId)
                throw new common_1.ForbiddenException();
            const text = String((payload === null || payload === void 0 ? void 0 : payload.text) || '').trim();
            const attachments = Array.isArray(payload === null || payload === void 0 ? void 0 : payload.attachments) ? payload.attachments : [];
            if (!text && attachments.length === 0)
                return;
            if (payload === null || payload === void 0 ? void 0 : payload.replyToId) {
                const reply = await this.prisma.chatMessage.findFirst({ where: { id: payload.replyToId, threadId } });
                if (!reply)
                    return;
            }
            const msg = await this.prisma.chatMessage.create({
                data: {
                    threadId,
                    senderEmployeeId: employeeId,
                    text: text || null,
                    replyToId: payload.replyToId || null,
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
            await this.chatsService.notifyNewChatMessage({
                businessId,
                threadId,
                messageId: msg.id,
                senderEmployeeId: msg.senderEmployeeId,
                senderName: `${((_c = msg.senderEmployee) === null || _c === void 0 ? void 0 : _c.firstName) || ''} ${((_d = msg.senderEmployee) === null || _d === void 0 ? void 0 : _d.lastName) || ''}`.trim(),
                text: msg.text,
                hasAttachments: (msg.attachments || []).length > 0,
            });
            const event = {
                id: msg.id,
                threadId: msg.threadId,
                senderEmployeeId: msg.senderEmployeeId,
                senderName: `${((_e = msg.senderEmployee) === null || _e === void 0 ? void 0 : _e.firstName) || ''} ${((_f = msg.senderEmployee) === null || _f === void 0 ? void 0 : _f.lastName) || ''}`.trim(),
                text: msg.text,
                createdAt: msg.createdAt,
                editedAt: msg.editedAt,
                deletedAt: msg.deletedAt,
                replyTo: msg.replyTo
                    ? {
                        id: msg.replyTo.id,
                        senderEmployeeId: msg.replyTo.senderEmployeeId,
                        senderName: `${((_g = msg.replyTo.senderEmployee) === null || _g === void 0 ? void 0 : _g.firstName) || ''} ${((_h = msg.replyTo.senderEmployee) === null || _h === void 0 ? void 0 : _h.lastName) || ''}`.trim(),
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
                clientId: (payload === null || payload === void 0 ? void 0 : payload.clientId) || null,
            };
            this.server.to(this.threadRoom(threadId)).emit('message:new', event);
            client.emit('message:ack', { threadId, clientId: (payload === null || payload === void 0 ? void 0 : payload.clientId) || null, messageId: msg.id, createdAt: msg.createdAt });
        }
        async assertMessagePermission(client, messageId) {
            var _a, _b;
            const businessId = (_a = client.data) === null || _a === void 0 ? void 0 : _a.businessId;
            if (!businessId)
                throw new common_1.ForbiddenException();
            const msg = await this.prisma.chatMessage.findFirst({
                where: { id: messageId, thread: { businessId } },
                include: { thread: true },
            });
            if (!msg)
                throw new common_1.ForbiddenException();
            await this.assertThreadAccess(client, msg.threadId);
            const employeeId = (_b = client.data) === null || _b === void 0 ? void 0 : _b.employeeId;
            if (!employeeId)
                throw new common_1.ForbiddenException();
            if (msg.senderEmployeeId === employeeId)
                return msg;
            const participant = await this.prisma.chatParticipant.findFirst({ where: { threadId: msg.threadId, employeeId }, select: { role: true } });
            if ((participant === null || participant === void 0 ? void 0 : participant.role) === 'ADMIN')
                return msg;
            throw new common_1.ForbiddenException();
        }
        async onMessageEdit(client, payload) {
            const messageId = String((payload === null || payload === void 0 ? void 0 : payload.messageId) || '');
            const text = String((payload === null || payload === void 0 ? void 0 : payload.text) || '').trim();
            if (!messageId || !text)
                return;
            const msg = await this.assertMessagePermission(client, messageId);
            if (msg.deletedAt)
                return;
            if (Date.now() - new Date(msg.createdAt).getTime() > 30 * 60 * 1000) {
                throw new common_1.BadRequestException('Messages cannot be edited after 30 minutes');
            }
            const replyExists = await this.prisma.chatMessage.findFirst({
                where: { replyToId: messageId, deletedAt: null },
                select: { id: true },
            });
            if (replyExists) {
                throw new common_1.BadRequestException('Messages cannot be edited after a reply');
            }
            const updated = await this.prisma.chatMessage.update({
                where: { id: messageId },
                data: { text, editedAt: new Date() },
                include: {
                    senderEmployee: { select: { id: true, firstName: true, lastName: true } },
                },
            });
            this.server.to(this.threadRoom(updated.threadId)).emit('message:updated', {
                messageId: updated.id,
                threadId: updated.threadId,
                text: updated.text,
                editedAt: updated.editedAt,
            });
        }
        async onMessageDelete(client, payload) {
            const messageId = String((payload === null || payload === void 0 ? void 0 : payload.messageId) || '');
            if (!messageId)
                return;
            const msg = await this.assertMessagePermission(client, messageId);
            if (msg.deletedAt)
                return;
            await this.prisma.chatAttachment.deleteMany({ where: { messageId } });
            await this.prisma.chatReaction.deleteMany({ where: { messageId } });
            const deleted = await this.prisma.chatMessage.update({ where: { id: messageId }, data: { deletedAt: new Date(), text: null } });
            this.server.to(this.threadRoom(deleted.threadId)).emit('message:deleted', {
                messageId: deleted.id,
                threadId: deleted.threadId,
                deletedAt: deleted.deletedAt,
            });
        }
        async onReactionToggle(client, payload) {
            var _a;
            const messageId = String((payload === null || payload === void 0 ? void 0 : payload.messageId) || '');
            const emoji = String((payload === null || payload === void 0 ? void 0 : payload.emoji) || '').trim();
            if (!messageId || !emoji)
                return;
            const msg = await this.assertMessagePermission(client, messageId);
            const employeeId = (_a = client.data) === null || _a === void 0 ? void 0 : _a.employeeId;
            if (!employeeId)
                return;
            const existing = await this.prisma.chatReaction.findFirst({ where: { messageId, employeeId, emoji } });
            if (existing) {
                await this.prisma.chatReaction.deleteMany({ where: { messageId, employeeId, emoji } });
            }
            else {
                await this.prisma.chatReaction.create({ data: { messageId, employeeId, emoji } });
            }
            const reactions = await this.prisma.chatReaction.findMany({
                where: { messageId },
                include: { employee: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { createdAt: 'asc' },
            });
            this.server.to(this.threadRoom(msg.threadId)).emit('reactions:updated', {
                messageId,
                threadId: msg.threadId,
                reactions: reactions.map((r) => {
                    var _a, _b;
                    return ({
                        id: r.id,
                        emoji: r.emoji,
                        employeeId: r.employeeId,
                        employeeName: `${((_a = r.employee) === null || _a === void 0 ? void 0 : _a.firstName) || ''} ${((_b = r.employee) === null || _b === void 0 ? void 0 : _b.lastName) || ''}`.trim(),
                    });
                }),
            });
        }
    };
    __setFunctionName(_classThis, "ChatsGateway");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _server_decorators = [(0, websockets_1.WebSocketServer)()];
        _onJoin_decorators = [(0, websockets_1.SubscribeMessage)('thread:join')];
        _onLeave_decorators = [(0, websockets_1.SubscribeMessage)('thread:leave')];
        _onTypingStart_decorators = [(0, websockets_1.SubscribeMessage)('typing:start')];
        _onTypingStop_decorators = [(0, websockets_1.SubscribeMessage)('typing:stop')];
        _onReadMark_decorators = [(0, websockets_1.SubscribeMessage)('read:mark')];
        _onMessageSend_decorators = [(0, websockets_1.SubscribeMessage)('message:send')];
        _onMessageEdit_decorators = [(0, websockets_1.SubscribeMessage)('message:edit')];
        _onMessageDelete_decorators = [(0, websockets_1.SubscribeMessage)('message:delete')];
        _onReactionToggle_decorators = [(0, websockets_1.SubscribeMessage)('reaction:toggle')];
        __esDecorate(_classThis, null, _onJoin_decorators, { kind: "method", name: "onJoin", static: false, private: false, access: { has: obj => "onJoin" in obj, get: obj => obj.onJoin }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onLeave_decorators, { kind: "method", name: "onLeave", static: false, private: false, access: { has: obj => "onLeave" in obj, get: obj => obj.onLeave }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onTypingStart_decorators, { kind: "method", name: "onTypingStart", static: false, private: false, access: { has: obj => "onTypingStart" in obj, get: obj => obj.onTypingStart }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onTypingStop_decorators, { kind: "method", name: "onTypingStop", static: false, private: false, access: { has: obj => "onTypingStop" in obj, get: obj => obj.onTypingStop }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onReadMark_decorators, { kind: "method", name: "onReadMark", static: false, private: false, access: { has: obj => "onReadMark" in obj, get: obj => obj.onReadMark }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onMessageSend_decorators, { kind: "method", name: "onMessageSend", static: false, private: false, access: { has: obj => "onMessageSend" in obj, get: obj => obj.onMessageSend }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onMessageEdit_decorators, { kind: "method", name: "onMessageEdit", static: false, private: false, access: { has: obj => "onMessageEdit" in obj, get: obj => obj.onMessageEdit }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onMessageDelete_decorators, { kind: "method", name: "onMessageDelete", static: false, private: false, access: { has: obj => "onMessageDelete" in obj, get: obj => obj.onMessageDelete }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onReactionToggle_decorators, { kind: "method", name: "onReactionToggle", static: false, private: false, access: { has: obj => "onReactionToggle" in obj, get: obj => obj.onReactionToggle }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, null, _server_decorators, { kind: "field", name: "server", static: false, private: false, access: { has: obj => "server" in obj, get: obj => obj.server, set: (obj, value) => { obj.server = value; } }, metadata: _metadata }, _server_initializers, _server_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ChatsGateway = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ChatsGateway = _classThis;
})();
exports.ChatsGateway = ChatsGateway;
