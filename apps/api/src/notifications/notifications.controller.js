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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const rxjs_1 = require("rxjs");
let NotificationsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('notifications')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _findAll_decorators;
    let _getConversation_decorators;
    let _addConversationMessage_decorators;
    let _markAsRead_decorators;
    let _markAllAsRead_decorators;
    let _remove_decorators;
    let _stream_decorators;
    var NotificationsController = _classThis = class {
        constructor(notificationsService, streamService, jwtService) {
            this.notificationsService = (__runInitializers(this, _instanceExtraInitializers), notificationsService);
            this.streamService = streamService;
            this.jwtService = jwtService;
        }
        findAll(req) {
            return this.notificationsService.getUserNotifications(req.user.userId);
        }
        // Fetch a threaded conversation tied to an employee's activity log
        getConversation(employeeId, req) {
            return this.notificationsService.getConversation(employeeId, req.user);
        }
        // Add a message to the employee-admin conversation and notify recipient
        addConversationMessage(body, req) {
            var _a;
            if (!(body === null || body === void 0 ? void 0 : body.employeeId) || !((_a = body === null || body === void 0 ? void 0 : body.text) === null || _a === void 0 ? void 0 : _a.trim())) {
                return Promise.reject({ statusCode: 400, message: 'employeeId and text are required' });
            }
            return this.notificationsService.addConversationMessage(body.employeeId, req.user.userId, body.text.trim(), req.user);
        }
        markAsRead(id, req) {
            // Ideally verify user owns notification
            return this.notificationsService.markAsRead(id, req.user.userId);
        }
        markAllAsRead(req) {
            return this.notificationsService.markAllAsRead(req.user.userId);
        }
        remove(id, req) {
            return this.notificationsService.remove(id, req.user.userId);
        }
        // Server-Sent Events stream for push notifications
        stream(token) {
            if (!token) {
                // If no token, return an empty observable to avoid exposing anything
                return new rxjs_1.Observable((subscriber) => subscriber.complete());
            }
            let payload;
            try {
                payload = this.jwtService.verify(token);
            }
            catch {
                return new rxjs_1.Observable((subscriber) => subscriber.complete());
            }
            const userId = payload === null || payload === void 0 ? void 0 : payload.userId;
            const subject = this.streamService.getUserStream(userId);
            return subject.asObservable();
        }
    };
    __setFunctionName(_classThis, "NotificationsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)(), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)];
        _getConversation_decorators = [(0, common_1.Get)('conversation/:employeeId'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)];
        _addConversationMessage_decorators = [(0, common_1.Post)('conversation'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)];
        _markAsRead_decorators = [(0, common_1.Patch)(':id/read'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)];
        _markAllAsRead_decorators = [(0, common_1.Patch)('read-all'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)];
        _remove_decorators = [(0, common_1.Delete)(':id'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)];
        _stream_decorators = [(0, common_1.Sse)('stream')];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: obj => "findAll" in obj, get: obj => obj.findAll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getConversation_decorators, { kind: "method", name: "getConversation", static: false, private: false, access: { has: obj => "getConversation" in obj, get: obj => obj.getConversation }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addConversationMessage_decorators, { kind: "method", name: "addConversationMessage", static: false, private: false, access: { has: obj => "addConversationMessage" in obj, get: obj => obj.addConversationMessage }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markAsRead_decorators, { kind: "method", name: "markAsRead", static: false, private: false, access: { has: obj => "markAsRead" in obj, get: obj => obj.markAsRead }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markAllAsRead_decorators, { kind: "method", name: "markAllAsRead", static: false, private: false, access: { has: obj => "markAllAsRead" in obj, get: obj => obj.markAllAsRead }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: obj => "remove" in obj, get: obj => obj.remove }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _stream_decorators, { kind: "method", name: "stream", static: false, private: false, access: { has: obj => "stream" in obj, get: obj => obj.stream }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        NotificationsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return NotificationsController = _classThis;
})();
exports.NotificationsController = NotificationsController;
