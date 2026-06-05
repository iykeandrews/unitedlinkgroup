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
exports.ChatsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
let ChatsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('chats'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard), (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _listThreads_decorators;
    let _createDirect_decorators;
    let _createSupport_decorators;
    let _createGroup_decorators;
    let _getThread_decorators;
    let _updateThread_decorators;
    let _addMember_decorators;
    let _removeMember_decorators;
    let _listMessages_decorators;
    let _sendMessage_decorators;
    let _markRead_decorators;
    let _editMessage_decorators;
    let _deleteMessage_decorators;
    let _addReaction_decorators;
    let _removeReaction_decorators;
    let _listGroupsCompat_decorators;
    var ChatsController = _classThis = class {
        constructor(chatsService) {
            this.chatsService = (__runInitializers(this, _instanceExtraInitializers), chatsService);
        }
        listThreads(req, headerBusinessId) {
            return this.chatsService.listThreads(req.user, headerBusinessId);
        }
        createDirect(req, headerBusinessId, dto) {
            return this.chatsService.createDirectThread(req.user, headerBusinessId, dto.employeeId);
        }
        createSupport(req, headerBusinessId) {
            return this.chatsService.createSupportThread(req.user, headerBusinessId);
        }
        createGroup(req, headerBusinessId, dto) {
            return this.chatsService.createGroupThread(req.user, headerBusinessId, dto);
        }
        getThread(req, headerBusinessId, threadId) {
            return this.chatsService.getThread(req.user, headerBusinessId, threadId);
        }
        updateThread(req, headerBusinessId, threadId, dto) {
            return this.chatsService.updateThread(req.user, headerBusinessId, threadId, dto);
        }
        addMember(req, headerBusinessId, threadId, dto) {
            return this.chatsService.addMember(req.user, headerBusinessId, threadId, dto.employeeId);
        }
        removeMember(req, headerBusinessId, threadId, employeeId) {
            return this.chatsService.removeMember(req.user, headerBusinessId, threadId, employeeId);
        }
        listMessages(req, headerBusinessId, threadId, before, take) {
            const parsedTake = take ? parseInt(take, 10) : undefined;
            return this.chatsService.listMessages(req.user, headerBusinessId, threadId, before, parsedTake);
        }
        sendMessage(req, headerBusinessId, threadId, dto) {
            return this.chatsService.sendMessage(req.user, headerBusinessId, threadId, dto);
        }
        markRead(req, headerBusinessId, threadId) {
            return this.chatsService.markRead(req.user, headerBusinessId, threadId);
        }
        editMessage(req, headerBusinessId, messageId, dto) {
            return this.chatsService.editMessage(req.user, headerBusinessId, messageId, dto);
        }
        deleteMessage(req, headerBusinessId, messageId) {
            return this.chatsService.deleteMessage(req.user, headerBusinessId, messageId);
        }
        addReaction(req, headerBusinessId, messageId, dto) {
            return this.chatsService.addReaction(req.user, headerBusinessId, messageId, dto.emoji);
        }
        removeReaction(req, headerBusinessId, messageId, emoji) {
            return this.chatsService.removeReaction(req.user, headerBusinessId, messageId, emoji);
        }
        listGroupsCompat(req, headerBusinessId) {
            return this.chatsService.listThreads(req.user, headerBusinessId, { type: 'GROUP' });
        }
    };
    __setFunctionName(_classThis, "ChatsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _listThreads_decorators = [(0, common_1.Get)('threads')];
        _createDirect_decorators = [(0, common_1.Post)('threads/direct')];
        _createSupport_decorators = [(0, common_1.Post)('threads/support')];
        _createGroup_decorators = [(0, common_1.Post)('threads/group')];
        _getThread_decorators = [(0, common_1.Get)('threads/:threadId')];
        _updateThread_decorators = [(0, common_1.Patch)('threads/:threadId')];
        _addMember_decorators = [(0, common_1.Post)('threads/:threadId/members')];
        _removeMember_decorators = [(0, common_1.Delete)('threads/:threadId/members/:employeeId')];
        _listMessages_decorators = [(0, common_1.Get)('threads/:threadId/messages')];
        _sendMessage_decorators = [(0, common_1.Post)('threads/:threadId/messages')];
        _markRead_decorators = [(0, common_1.Post)('threads/:threadId/read')];
        _editMessage_decorators = [(0, common_1.Patch)('messages/:messageId')];
        _deleteMessage_decorators = [(0, common_1.Delete)('messages/:messageId')];
        _addReaction_decorators = [(0, common_1.Post)('messages/:messageId/reactions')];
        _removeReaction_decorators = [(0, common_1.Delete)('messages/:messageId/reactions')];
        _listGroupsCompat_decorators = [(0, common_1.Get)('groups')];
        __esDecorate(_classThis, null, _listThreads_decorators, { kind: "method", name: "listThreads", static: false, private: false, access: { has: obj => "listThreads" in obj, get: obj => obj.listThreads }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createDirect_decorators, { kind: "method", name: "createDirect", static: false, private: false, access: { has: obj => "createDirect" in obj, get: obj => obj.createDirect }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createSupport_decorators, { kind: "method", name: "createSupport", static: false, private: false, access: { has: obj => "createSupport" in obj, get: obj => obj.createSupport }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createGroup_decorators, { kind: "method", name: "createGroup", static: false, private: false, access: { has: obj => "createGroup" in obj, get: obj => obj.createGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getThread_decorators, { kind: "method", name: "getThread", static: false, private: false, access: { has: obj => "getThread" in obj, get: obj => obj.getThread }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateThread_decorators, { kind: "method", name: "updateThread", static: false, private: false, access: { has: obj => "updateThread" in obj, get: obj => obj.updateThread }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addMember_decorators, { kind: "method", name: "addMember", static: false, private: false, access: { has: obj => "addMember" in obj, get: obj => obj.addMember }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeMember_decorators, { kind: "method", name: "removeMember", static: false, private: false, access: { has: obj => "removeMember" in obj, get: obj => obj.removeMember }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listMessages_decorators, { kind: "method", name: "listMessages", static: false, private: false, access: { has: obj => "listMessages" in obj, get: obj => obj.listMessages }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendMessage_decorators, { kind: "method", name: "sendMessage", static: false, private: false, access: { has: obj => "sendMessage" in obj, get: obj => obj.sendMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markRead_decorators, { kind: "method", name: "markRead", static: false, private: false, access: { has: obj => "markRead" in obj, get: obj => obj.markRead }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _editMessage_decorators, { kind: "method", name: "editMessage", static: false, private: false, access: { has: obj => "editMessage" in obj, get: obj => obj.editMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteMessage_decorators, { kind: "method", name: "deleteMessage", static: false, private: false, access: { has: obj => "deleteMessage" in obj, get: obj => obj.deleteMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addReaction_decorators, { kind: "method", name: "addReaction", static: false, private: false, access: { has: obj => "addReaction" in obj, get: obj => obj.addReaction }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeReaction_decorators, { kind: "method", name: "removeReaction", static: false, private: false, access: { has: obj => "removeReaction" in obj, get: obj => obj.removeReaction }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listGroupsCompat_decorators, { kind: "method", name: "listGroupsCompat", static: false, private: false, access: { has: obj => "listGroupsCompat" in obj, get: obj => obj.listGroupsCompat }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ChatsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ChatsController = _classThis;
})();
exports.ChatsController = ChatsController;
