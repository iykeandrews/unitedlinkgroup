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
exports.VendorsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
const VENDOR_ROLE = 'VENDOR';
let VendorsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('vendors')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getPublicBySlug_decorators;
    let _list_decorators;
    let _create_decorators;
    let _update_decorators;
    let _activate_decorators;
    let _deactivate_decorators;
    let _getMyProfile_decorators;
    let _getMyPortal_decorators;
    var VendorsController = _classThis = class {
        constructor(vendorsService) {
            this.vendorsService = (__runInitializers(this, _instanceExtraInitializers), vendorsService);
        }
        getPublicBySlug(slug) {
            return this.vendorsService.getPublicBySlug(slug);
        }
        list(req, businessId) {
            return this.vendorsService.list(req.user, businessId);
        }
        create(req, body, businessId) {
            return this.vendorsService.create(req.user, body, businessId);
        }
        update(req, id, body, businessId) {
            return this.vendorsService.update(req.user, id, body, businessId);
        }
        activate(req, id, businessId) {
            return this.vendorsService.setStatus(req.user, id, 'ACTIVE', businessId);
        }
        deactivate(req, id, businessId) {
            return this.vendorsService.setStatus(req.user, id, 'INACTIVE', businessId);
        }
        getMyProfile(req) {
            return this.vendorsService.getMyProfile(req.user);
        }
        getMyPortal(req) {
            return this.vendorsService.getMyPortalData(req.user);
        }
    };
    __setFunctionName(_classThis, "VendorsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getPublicBySlug_decorators = [(0, common_1.Get)('public/:slug')];
        _list_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN), (0, common_1.Get)()];
        _create_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN), (0, common_1.Post)()];
        _update_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN), (0, common_1.Patch)(':id')];
        _activate_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN), (0, common_1.Post)(':id/activate')];
        _deactivate_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN), (0, common_1.Post)(':id/deactivate')];
        _getMyProfile_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(VENDOR_ROLE), (0, common_1.Get)('me/profile')];
        _getMyPortal_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(VENDOR_ROLE), (0, common_1.Get)('me/portal')];
        __esDecorate(_classThis, null, _getPublicBySlug_decorators, { kind: "method", name: "getPublicBySlug", static: false, private: false, access: { has: obj => "getPublicBySlug" in obj, get: obj => obj.getPublicBySlug }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: obj => "update" in obj, get: obj => obj.update }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _activate_decorators, { kind: "method", name: "activate", static: false, private: false, access: { has: obj => "activate" in obj, get: obj => obj.activate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deactivate_decorators, { kind: "method", name: "deactivate", static: false, private: false, access: { has: obj => "deactivate" in obj, get: obj => obj.deactivate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyProfile_decorators, { kind: "method", name: "getMyProfile", static: false, private: false, access: { has: obj => "getMyProfile" in obj, get: obj => obj.getMyProfile }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyPortal_decorators, { kind: "method", name: "getMyPortal", static: false, private: false, access: { has: obj => "getMyPortal" in obj, get: obj => obj.getMyPortal }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VendorsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VendorsController = _classThis;
})();
exports.VendorsController = VendorsController;
