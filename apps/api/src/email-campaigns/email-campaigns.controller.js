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
exports.EmailCampaignsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const roles_guard_1 = require("../auth/roles.guard");
const types_1 = require("@unitedlinkgroup/types");
let EmailCampaignsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('email-campaigns'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _create_decorators;
    let _findAll_decorators;
    let _findOne_decorators;
    let _send_decorators;
    let _remove_decorators;
    var EmailCampaignsController = _classThis = class {
        constructor(emailCampaignsService) {
            this.emailCampaignsService = (__runInitializers(this, _instanceExtraInitializers), emailCampaignsService);
        }
        create(req, createEmailCampaignDto, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.emailCampaignsService.create(createEmailCampaignDto, req.user.userId, businessId);
        }
        findAll(req, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.emailCampaignsService.findAll(businessId);
        }
        findOne(req, id, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.emailCampaignsService.findOne(id, businessId);
        }
        send(req, id, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.emailCampaignsService.send(id, req.user.userId, businessId);
        }
        remove(req, id, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.emailCampaignsService.remove(id, req.user.userId, businessId);
        }
    };
    __setFunctionName(_classThis, "EmailCampaignsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _findAll_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _findOne_decorators = [(0, common_1.Get)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _send_decorators = [(0, common_1.Post)(':id/send'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _remove_decorators = [(0, common_1.Delete)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: obj => "findAll" in obj, get: obj => obj.findAll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _send_decorators, { kind: "method", name: "send", static: false, private: false, access: { has: obj => "send" in obj, get: obj => obj.send }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: obj => "remove" in obj, get: obj => obj.remove }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmailCampaignsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmailCampaignsController = _classThis;
})();
exports.EmailCampaignsController = EmailCampaignsController;
