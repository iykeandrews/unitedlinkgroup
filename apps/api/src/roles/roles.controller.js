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
exports.RolesController = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const roles_guard_1 = require("../auth/roles.guard");
let RolesController = (() => {
    let _classDecorators = [(0, common_1.Controller)('roles'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _create_decorators;
    let _findAll_decorators;
    let _findOne_decorators;
    let _getMembers_decorators;
    let _addMember_decorators;
    let _removeMember_decorators;
    let _update_decorators;
    let _remove_decorators;
    var RolesController = _classThis = class {
        constructor(rolesService) {
            this.rolesService = (__runInitializers(this, _instanceExtraInitializers), rolesService);
        }
        create(req, createRoleDto) {
            return this.rolesService.create(createRoleDto, req.user.businessId, req.user.userId);
        }
        findAll(req) {
            return this.rolesService.findAll(req.user.businessId);
        }
        findOne(id, req) {
            return this.rolesService.findOne(id, req.user.businessId);
        }
        getMembers(req, id) {
            return this.rolesService.getRoleMembers(id, req.user.businessId);
        }
        addMember(req, id, employeeId) {
            return this.rolesService.addMember(id, employeeId, req.user.userId, req.user.businessId);
        }
        removeMember(req, id, employeeId) {
            return this.rolesService.removeMember(id, employeeId, req.user.userId, req.user.businessId);
        }
        update(req, id, updateRoleDto) {
            return this.rolesService.update(id, updateRoleDto, req.user.userId, req.user.businessId);
        }
        remove(req, id) {
            return this.rolesService.remove(id, req.user.userId, req.user.businessId);
        }
    };
    __setFunctionName(_classThis, "RolesController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _findAll_decorators = [(0, common_1.Get)()];
        _findOne_decorators = [(0, common_1.Get)(':id')];
        _getMembers_decorators = [(0, common_1.Get)(':id/members'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _addMember_decorators = [(0, common_1.Post)(':id/members'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _removeMember_decorators = [(0, common_1.Delete)(':id/members/:employeeId'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _update_decorators = [(0, common_1.Patch)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _remove_decorators = [(0, common_1.Delete)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: obj => "findAll" in obj, get: obj => obj.findAll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMembers_decorators, { kind: "method", name: "getMembers", static: false, private: false, access: { has: obj => "getMembers" in obj, get: obj => obj.getMembers }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addMember_decorators, { kind: "method", name: "addMember", static: false, private: false, access: { has: obj => "addMember" in obj, get: obj => obj.addMember }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeMember_decorators, { kind: "method", name: "removeMember", static: false, private: false, access: { has: obj => "removeMember" in obj, get: obj => obj.removeMember }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: obj => "update" in obj, get: obj => obj.update }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: obj => "remove" in obj, get: obj => obj.remove }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RolesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RolesController = _classThis;
})();
exports.RolesController = RolesController;
