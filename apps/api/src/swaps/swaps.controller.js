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
exports.SwapsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let SwapsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('swaps'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _listMy_decorators;
    let _create_decorators;
    let _cancel_decorators;
    let _approve_decorators;
    let _reject_decorators;
    var SwapsController = _classThis = class {
        constructor(swapsService) {
            this.swapsService = (__runInitializers(this, _instanceExtraInitializers), swapsService);
        }
        list(req, headerBusinessId, queryBusinessId, status) {
            return this.swapsService.list(req.user, headerBusinessId, queryBusinessId, status);
        }
        listMy(req, headerBusinessId) {
            return this.swapsService.listMy(req.user, headerBusinessId);
        }
        create(req, headerBusinessId, dto) {
            return this.swapsService.create(req.user, headerBusinessId, dto);
        }
        cancel(req, headerBusinessId, id) {
            return this.swapsService.cancel(req.user, headerBusinessId, id);
        }
        approve(req, headerBusinessId, id) {
            return this.swapsService.approve(req.user, headerBusinessId, id);
        }
        reject(req, headerBusinessId, id, body) {
            return this.swapsService.reject(req.user, headerBusinessId, id, body === null || body === void 0 ? void 0 : body.rejectionReason);
        }
    };
    __setFunctionName(_classThis, "SwapsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _list_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _listMy_decorators = [(0, common_1.Get)('my'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _cancel_decorators = [(0, common_1.Put)(':id/cancel'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _approve_decorators = [(0, common_1.Put)(':id/approve'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _reject_decorators = [(0, common_1.Put)(':id/reject'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        __esDecorate(_classThis, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listMy_decorators, { kind: "method", name: "listMy", static: false, private: false, access: { has: obj => "listMy" in obj, get: obj => obj.listMy }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancel_decorators, { kind: "method", name: "cancel", static: false, private: false, access: { has: obj => "cancel" in obj, get: obj => obj.cancel }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approve_decorators, { kind: "method", name: "approve", static: false, private: false, access: { has: obj => "approve" in obj, get: obj => obj.approve }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reject_decorators, { kind: "method", name: "reject", static: false, private: false, access: { has: obj => "reject" in obj, get: obj => obj.reject }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SwapsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SwapsController = _classThis;
})();
exports.SwapsController = SwapsController;
