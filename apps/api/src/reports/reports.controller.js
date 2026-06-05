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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let ReportsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('reports'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getEmployeeDashboard_decorators;
    let _getSuperadminDashboard_decorators;
    let _getDashboardStats_decorators;
    let _getBusinessOverview_decorators;
    let _getPayrollSummary_decorators;
    let _getLaborCost_decorators;
    let _getAttendanceReport_decorators;
    let _getReliabilityReport_decorators;
    var ReportsController = _classThis = class {
        constructor(reportsService) {
            this.reportsService = (__runInitializers(this, _instanceExtraInitializers), reportsService);
        }
        getEmployeeDashboard(req, days) {
            const parsedDays = days ? Math.max(7, Math.min(90, parseInt(days, 10) || 30)) : 30;
            return this.reportsService.getEmployeeDashboard(req.user.userId, parsedDays, req.user.businessId);
        }
        getSuperadminDashboard(days) {
            const parsedDays = days ? Math.max(7, Math.min(180, parseInt(days, 10) || 30)) : 30;
            return this.reportsService.getSuperadminDashboard(parsedDays);
        }
        getDashboardStats(req, headerBusinessId, queryBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && (queryBusinessId || headerBusinessId))
                ? (queryBusinessId || headerBusinessId)
                : req.user.businessId;
            return this.reportsService.getDashboardStats(businessId);
        }
        getBusinessOverview(req, headerBusinessId, queryBusinessId, days) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && (queryBusinessId || headerBusinessId))
                ? (queryBusinessId || headerBusinessId)
                : req.user.businessId;
            const parsedDays = days ? Math.max(7, Math.min(180, parseInt(days, 10) || 30)) : 30;
            return this.reportsService.getBusinessOverview(businessId, parsedDays);
        }
        getPayrollSummary(req, startDate, endDate, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.reportsService.getPayrollSummary(businessId, startDate, endDate);
        }
        getLaborCost(req, startDate, endDate, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.reportsService.getLaborCostAnalysis(businessId, startDate, endDate);
        }
        getAttendanceReport(req, startDate, endDate, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.reportsService.getAttendanceReport(businessId, startDate, endDate);
        }
        getReliabilityReport(req, startDate, endDate, headerBusinessId) {
            const businessId = (req.user.role === types_1.UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
            return this.reportsService.getReliabilityReport(businessId, startDate, endDate);
        }
    };
    __setFunctionName(_classThis, "ReportsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getEmployeeDashboard_decorators = [(0, common_1.Get)('employee-dashboard'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _getSuperadminDashboard_decorators = [(0, common_1.Get)('superadmin-dashboard'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN)];
        _getDashboardStats_decorators = [(0, common_1.Get)('dashboard-stats'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _getBusinessOverview_decorators = [(0, common_1.Get)('business-overview'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _getPayrollSummary_decorators = [(0, common_1.Get)('payroll-summary'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getLaborCost_decorators = [(0, common_1.Get)('labor-cost'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getAttendanceReport_decorators = [(0, common_1.Get)('attendance'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _getReliabilityReport_decorators = [(0, common_1.Get)('reliability'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        __esDecorate(_classThis, null, _getEmployeeDashboard_decorators, { kind: "method", name: "getEmployeeDashboard", static: false, private: false, access: { has: obj => "getEmployeeDashboard" in obj, get: obj => obj.getEmployeeDashboard }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSuperadminDashboard_decorators, { kind: "method", name: "getSuperadminDashboard", static: false, private: false, access: { has: obj => "getSuperadminDashboard" in obj, get: obj => obj.getSuperadminDashboard }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getDashboardStats_decorators, { kind: "method", name: "getDashboardStats", static: false, private: false, access: { has: obj => "getDashboardStats" in obj, get: obj => obj.getDashboardStats }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBusinessOverview_decorators, { kind: "method", name: "getBusinessOverview", static: false, private: false, access: { has: obj => "getBusinessOverview" in obj, get: obj => obj.getBusinessOverview }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPayrollSummary_decorators, { kind: "method", name: "getPayrollSummary", static: false, private: false, access: { has: obj => "getPayrollSummary" in obj, get: obj => obj.getPayrollSummary }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getLaborCost_decorators, { kind: "method", name: "getLaborCost", static: false, private: false, access: { has: obj => "getLaborCost" in obj, get: obj => obj.getLaborCost }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAttendanceReport_decorators, { kind: "method", name: "getAttendanceReport", static: false, private: false, access: { has: obj => "getAttendanceReport" in obj, get: obj => obj.getAttendanceReport }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getReliabilityReport_decorators, { kind: "method", name: "getReliabilityReport", static: false, private: false, access: { has: obj => "getReliabilityReport" in obj, get: obj => obj.getReliabilityReport }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ReportsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ReportsController = _classThis;
})();
exports.ReportsController = ReportsController;
