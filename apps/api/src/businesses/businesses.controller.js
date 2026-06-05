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
exports.BusinessesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let BusinessesController = (() => {
    let _classDecorators = [(0, common_1.Controller)('businesses'), (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _create_decorators;
    let _findAll_decorators;
    let _findMine_decorators;
    let _findOne_decorators;
    let _update_decorators;
    let _deactivate_decorators;
    let _activate_decorators;
    let _remove_decorators;
    var BusinessesController = _classThis = class {
        constructor(businessesService) {
            this.businessesService = (__runInitializers(this, _instanceExtraInitializers), businessesService);
        }
        create(createBusinessDto, req) {
            return this.businessesService.create(createBusinessDto, req.user.userId);
        }
        findAll() {
            return this.businessesService.findAll();
        }
        findMine(req) {
            return this.businessesService.findMine(req.user.userId);
        }
        findOne(id) {
            return this.businessesService.findOne(id);
        }
        update(req, id, updateBusinessDto, businessId) {
            return this.businessesService.updateForUser(req.user, id, updateBusinessDto, businessId);
        }
        deactivate(id) {
            return this.businessesService.setStatus(id, 'INACTIVE');
        }
        activate(id) {
            return this.businessesService.setStatus(id, 'ACTIVE');
        }
        remove(id) {
            return this.businessesService.setStatus(id, 'DELETED');
        }
    };
    __setFunctionName(_classThis, "BusinessesController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN)];
        _findAll_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN)];
        _findMine_decorators = [(0, common_1.Get)('mine'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _findOne_decorators = [(0, common_1.Get)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN)];
        _update_decorators = [(0, common_1.Patch)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN), (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true }))];
        _deactivate_decorators = [(0, common_1.Patch)(':id/deactivate'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN)];
        _activate_decorators = [(0, common_1.Patch)(':id/activate'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN)];
        _remove_decorators = [(0, common_1.Delete)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN)];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: obj => "findAll" in obj, get: obj => obj.findAll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findMine_decorators, { kind: "method", name: "findMine", static: false, private: false, access: { has: obj => "findMine" in obj, get: obj => obj.findMine }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: obj => "update" in obj, get: obj => obj.update }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deactivate_decorators, { kind: "method", name: "deactivate", static: false, private: false, access: { has: obj => "deactivate" in obj, get: obj => obj.deactivate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _activate_decorators, { kind: "method", name: "activate", static: false, private: false, access: { has: obj => "activate" in obj, get: obj => obj.activate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: obj => "remove" in obj, get: obj => obj.remove }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BusinessesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BusinessesController = _classThis;
})();
exports.BusinessesController = BusinessesController;
