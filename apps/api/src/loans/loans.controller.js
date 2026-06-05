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
exports.LoansController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let LoansController = (() => {
    let _classDecorators = [(0, common_1.Controller)('loans'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _create_decorators;
    let _findAll_decorators;
    let _findMyLoans_decorators;
    let _findOne_decorators;
    let _approve_decorators;
    let _reject_decorators;
    var LoansController = _classThis = class {
        constructor(loansService) {
            this.loansService = (__runInitializers(this, _instanceExtraInitializers), loansService);
        }
        create(req, createLoanDto, businessId) {
            if ((req.user.role === types_1.UserRole.BUSINESS_ADMIN || req.user.role === types_1.UserRole.SUPER_ADMIN || req.user.role === types_1.UserRole.MANAGER)) {
                if (createLoanDto.targetEmployeeId) {
                    return this.loansService.requestLoanByEmployeeId(createLoanDto.targetEmployeeId, createLoanDto.amount, createLoanDto.termMonths, createLoanDto.reason, req.user, businessId);
                }
                if (createLoanDto.targetUserId) {
                    return this.loansService.requestLoan(createLoanDto.targetUserId, createLoanDto.amount, createLoanDto.termMonths, createLoanDto.reason, businessId);
                }
            }
            return this.loansService.requestLoan(req.user.userId, createLoanDto.amount, createLoanDto.termMonths, createLoanDto.reason, businessId);
        }
        findAll(req, businessId) {
            return this.loansService.findAll(req.user, businessId);
        }
        findMyLoans(req) {
            return this.loansService.findByEmployee(req.user.userId);
        }
        findOne(id, req, businessId) {
            return this.loansService.findOne(id, req.user, businessId);
        }
        approve(id, req, businessId) {
            return this.loansService.approveLoan(id, req.user, businessId);
        }
        reject(id, body, req, businessId) {
            return this.loansService.rejectLoan(id, req.user, body.reason, businessId);
        }
    };
    __setFunctionName(_classThis, "LoansController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _findAll_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _findMyLoans_decorators = [(0, common_1.Get)('my-loans'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _findOne_decorators = [(0, common_1.Get)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.EMPLOYEE)];
        _approve_decorators = [(0, common_1.Patch)(':id/approve'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _reject_decorators = [(0, common_1.Patch)(':id/reject'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: obj => "findAll" in obj, get: obj => obj.findAll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findMyLoans_decorators, { kind: "method", name: "findMyLoans", static: false, private: false, access: { has: obj => "findMyLoans" in obj, get: obj => obj.findMyLoans }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approve_decorators, { kind: "method", name: "approve", static: false, private: false, access: { has: obj => "approve" in obj, get: obj => obj.approve }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reject_decorators, { kind: "method", name: "reject", static: false, private: false, access: { has: obj => "reject" in obj, get: obj => obj.reject }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LoansController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LoansController = _classThis;
})();
exports.LoansController = LoansController;
