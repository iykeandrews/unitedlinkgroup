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
exports.PayrollController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let PayrollController = (() => {
    let _classDecorators = [(0, common_1.Controller)('payroll'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _create_decorators;
    let _calculate_decorators;
    let _finalize_decorators;
    let _delete_decorators;
    let _updatePayStub_decorators;
    let _getPayStubs_decorators;
    let _getMyPayStubs_decorators;
    let _downloadPayStub_decorators;
    let _findAllMyPayrolls_decorators;
    let _findOne_decorators;
    let _findAll_decorators;
    let _getYearEndForms_decorators;
    let _getAnnualReport_decorators;
    var PayrollController = _classThis = class {
        constructor(payrollService) {
            this.payrollService = (__runInitializers(this, _instanceExtraInitializers), payrollService);
        }
        create(createPayrollDto, req) {
            return this.payrollService.createPayroll(createPayrollDto.businessId, new Date(createPayrollDto.periodStart), new Date(createPayrollDto.periodEnd), new Date(createPayrollDto.payDate), createPayrollDto.type, req.user);
        }
        calculate(id, req) {
            return this.payrollService.runPayrollCalculation(id, req.user);
        }
        finalize(id, req) {
            return this.payrollService.finalizePayroll(id, req.user);
        }
        delete(id, req) {
            return this.payrollService.deletePayroll(id, req.user);
        }
        updatePayStub(id, updates, req) {
            return this.payrollService.updatePayStub(id, updates, req.user);
        }
        async getPayStubs(req, headerBusinessId) {
            const { userId, role, businessId: tokenBusinessId } = req.user;
            // Use header business ID if available, otherwise token business ID
            const targetBusinessId = headerBusinessId || tokenBusinessId;
            console.log('GET /paystubs called by:', { userId, role, targetBusinessId });
            // If Admin/Manager and businessId exists, return all paid stubs for business
            if (targetBusinessId && (role === types_1.UserRole.BUSINESS_ADMIN || role === types_1.UserRole.SUPER_ADMIN || role === types_1.UserRole.MANAGER)) {
                console.log('Fetching business paystubs for:', targetBusinessId);
                return this.payrollService.getBusinessPayStubs(targetBusinessId, req.user);
            }
            console.log('Fetching user paystubs for:', userId);
            return this.payrollService.getPayStubsForUser(userId);
        }
        getMyPayStubs(req) {
            return this.payrollService.getPayStubsForUser(req.user.userId);
        }
        async downloadPayStub(id, req, res) {
            const out = await this.payrollService.downloadPayStubPdf(id, req.user);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
            res.setHeader('Content-Length', String(out.data.length));
            return res.status(200).send(out.data);
        }
        findAllMyPayrolls(req, businessId) {
            if (businessId) {
                return this.payrollService.getPayrolls(businessId, req.user);
            }
            return this.payrollService.getPayrollsForUser(req.user.userId, req.user);
        }
        findOne(id, req) {
            return this.payrollService.getPayrollById(id, req.user);
        }
        findAll(businessId, req) {
            return this.payrollService.getPayrolls(businessId, req.user);
        }
        getYearEndForms(businessId, year, req) {
            return this.payrollService.getYearEndForms(businessId, parseInt(year), req.user);
        }
        getAnnualReport(businessId, year, req) {
            return this.payrollService.getAnnualTaxReport(businessId, parseInt(year), req.user);
        }
    };
    __setFunctionName(_classThis, "PayrollController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.Post)('create'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _calculate_decorators = [(0, common_1.Post)(':id/calculate'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _finalize_decorators = [(0, common_1.Post)(':id/finalize'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _delete_decorators = [(0, common_1.Delete)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _updatePayStub_decorators = [(0, common_1.Patch)('paystub/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getPayStubs_decorators = [(0, common_1.Get)('paystubs'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _getMyPayStubs_decorators = [(0, common_1.Get)('my-paystubs'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _downloadPayStub_decorators = [(0, common_1.Get)('paystubs/:id/download'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.FINANCE, types_1.UserRole.EMPLOYEE)];
        _findAllMyPayrolls_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _findOne_decorators = [(0, common_1.Get)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _findAll_decorators = [(0, common_1.Get)('business/:businessId'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _getYearEndForms_decorators = [(0, common_1.Get)('report/year-end'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.FINANCE)];
        _getAnnualReport_decorators = [(0, common_1.Get)('report/annual'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.FINANCE)];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _calculate_decorators, { kind: "method", name: "calculate", static: false, private: false, access: { has: obj => "calculate" in obj, get: obj => obj.calculate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _finalize_decorators, { kind: "method", name: "finalize", static: false, private: false, access: { has: obj => "finalize" in obj, get: obj => obj.finalize }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _delete_decorators, { kind: "method", name: "delete", static: false, private: false, access: { has: obj => "delete" in obj, get: obj => obj.delete }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updatePayStub_decorators, { kind: "method", name: "updatePayStub", static: false, private: false, access: { has: obj => "updatePayStub" in obj, get: obj => obj.updatePayStub }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPayStubs_decorators, { kind: "method", name: "getPayStubs", static: false, private: false, access: { has: obj => "getPayStubs" in obj, get: obj => obj.getPayStubs }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyPayStubs_decorators, { kind: "method", name: "getMyPayStubs", static: false, private: false, access: { has: obj => "getMyPayStubs" in obj, get: obj => obj.getMyPayStubs }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _downloadPayStub_decorators, { kind: "method", name: "downloadPayStub", static: false, private: false, access: { has: obj => "downloadPayStub" in obj, get: obj => obj.downloadPayStub }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllMyPayrolls_decorators, { kind: "method", name: "findAllMyPayrolls", static: false, private: false, access: { has: obj => "findAllMyPayrolls" in obj, get: obj => obj.findAllMyPayrolls }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: obj => "findAll" in obj, get: obj => obj.findAll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getYearEndForms_decorators, { kind: "method", name: "getYearEndForms", static: false, private: false, access: { has: obj => "getYearEndForms" in obj, get: obj => obj.getYearEndForms }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAnnualReport_decorators, { kind: "method", name: "getAnnualReport", static: false, private: false, access: { has: obj => "getAnnualReport" in obj, get: obj => obj.getAnnualReport }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PayrollController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PayrollController = _classThis;
})();
exports.PayrollController = PayrollController;
