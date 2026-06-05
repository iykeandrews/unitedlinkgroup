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
exports.LeaveController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let LeaveController = (() => {
    let _classDecorators = [(0, common_1.Controller)('leave'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createType_decorators;
    let _calculateHours_decorators;
    let _getTypes_decorators;
    let _updateType_decorators;
    let _assignBalance_decorators;
    let _getBalance_decorators;
    let _requestLeave_decorators;
    let _getMyRequests_decorators;
    let _getEmployeeRequests_decorators;
    let _getMyBalances_decorators;
    let _getRequests_decorators;
    let _updateStatus_decorators;
    let _updateDetails_decorators;
    let _resumeLeave_decorators;
    let _cancelLeave_decorators;
    let _accrue_decorators;
    let _accruePayroll_decorators;
    var LeaveController = _classThis = class {
        constructor(leaveService) {
            this.leaveService = (__runInitializers(this, _instanceExtraInitializers), leaveService);
        }
        createType(body, req) {
            // Ideally businessId comes from the user context for admin, but allowing explicit pass for now
            return this.leaveService.createLeaveType(body.businessId, body, req.user);
        }
        async calculateHours(employeeId, startDate, endDate, isAllDay, startTime, endTime) {
            const service = this.leaveService;
            const total = await service.calculateLeaveHoursInternal(employeeId, new Date(startDate), new Date(endDate), isAllDay === undefined ? true : isAllDay === 'true', startTime, endTime);
            return { totalHours: total };
        }
        async getTypes(businessId) {
            try {
                return await this.leaveService.getLeaveTypes(businessId);
            }
            catch (error) {
                console.error('Error fetching leave types for business:', businessId, error);
                throw error;
            }
        }
        updateType(id, body, req) {
            return this.leaveService.updateLeaveType(id, body, req.user);
        }
        assignBalance(body, req) {
            return this.leaveService.assignLeaveBalance(body.employeeId, body.leaveTypeId, body.hours, req.user);
        }
        async getBalance(employeeId, user) {
            // TODO: Security check to ensure user can view this employee's balance
            return this.leaveService.getLeaveBalances(employeeId, user);
        }
        async requestLeave(body, user) {
            // Force employeeId verification logic here if needed, but for MVP we assume client sends correct ID
            return this.leaveService.requestLeave(body, user);
        }
        async getMyRequests(req) {
            return this.leaveService.getRequestsForUser(req.user.userId);
        }
        async getEmployeeRequests(employeeId, req) {
            if (!employeeId)
                return this.leaveService.getRequestsForUser(req.user.userId);
            return this.leaveService.getMyLeaveRequests(employeeId, req.user);
        }
        async getMyBalances(req) {
            return this.leaveService.getBalancesForUser(req.user.userId);
        }
        async getRequests(queryBusinessId, headerBusinessId, status, req) {
            let businessId = queryBusinessId || headerBusinessId;
            if (!businessId && (req === null || req === void 0 ? void 0 : req.user)) {
                if (req.user.role === types_1.UserRole.SUPER_ADMIN) {
                    // Super admin must provide business ID via header or query
                    // But for safety, we'll let it fail in service if not found, or throw here
                    // throw new BadRequestException('Business context required');
                }
                else {
                    businessId = await this.leaveService.getBusinessId(req.user.userId);
                }
            }
            if (!businessId) {
                // If still no business ID (e.g. Super Admin didn't provide one), we can't fetch.
                // However, maybe we should return empty? Or throw?
                // Let's assume consumer will provide it if super admin.
            }
            return this.leaveService.getLeaveRequests(businessId, status, req.user);
        }
        updateStatus(id, body, user) {
            return this.leaveService.updateLeaveRequestStatus(id, user.userId, body.status, body.rejectionReason, user);
        }
        updateDetails(id, body, user) {
            return this.leaveService.updateLeaveRequestDetails(id, body, user);
        }
        resumeLeave(id, body, user) {
            return this.leaveService.resumeLeaveEarly(id, body, user);
        }
        cancelLeave(id, body, user) {
            return this.leaveService.cancelApprovedLeave(id, body, user);
        }
        async accrue(body, user) {
            const start = body.periodStart ? new Date(body.periodStart) : undefined;
            const end = body.periodEnd ? new Date(body.periodEnd) : undefined;
            return this.leaveService.accrueLeave(body.employeeId, body.leaveTypeId, body.method, start, end, user);
        }
        async accruePayroll(body, user) {
            return this.leaveService.accrueForPayrollPeriod(body.businessId, new Date(body.periodStart), new Date(body.periodEnd), user);
        }
    };
    __setFunctionName(_classThis, "LeaveController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createType_decorators = [(0, common_1.Post)('types'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _calculateHours_decorators = [(0, common_1.Get)('calculate-hours'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getTypes_decorators = [(0, common_1.Get)('types/:businessId')];
        _updateType_decorators = [(0, common_1.Put)('types/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _assignBalance_decorators = [(0, common_1.Post)('balance'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getBalance_decorators = [(0, common_1.Get)('balance')];
        _requestLeave_decorators = [(0, common_1.Post)('request'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getMyRequests_decorators = [(0, common_1.Get)('my-requests'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getEmployeeRequests_decorators = [(0, common_1.Get)('employee-requests'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getMyBalances_decorators = [(0, common_1.Get)('my-balances'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getRequests_decorators = [(0, common_1.Get)('requests'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _updateStatus_decorators = [(0, common_1.Put)('requests/:id/status'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _updateDetails_decorators = [(0, common_1.Put)('requests/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _resumeLeave_decorators = [(0, common_1.Put)('requests/:id/resume'), (0, roles_decorator_1.Roles)(types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _cancelLeave_decorators = [(0, common_1.Put)('requests/:id/cancel'), (0, roles_decorator_1.Roles)(types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _accrue_decorators = [(0, common_1.Post)('accrue'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _accruePayroll_decorators = [(0, common_1.Post)('accrue/payroll'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        __esDecorate(_classThis, null, _createType_decorators, { kind: "method", name: "createType", static: false, private: false, access: { has: obj => "createType" in obj, get: obj => obj.createType }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _calculateHours_decorators, { kind: "method", name: "calculateHours", static: false, private: false, access: { has: obj => "calculateHours" in obj, get: obj => obj.calculateHours }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTypes_decorators, { kind: "method", name: "getTypes", static: false, private: false, access: { has: obj => "getTypes" in obj, get: obj => obj.getTypes }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateType_decorators, { kind: "method", name: "updateType", static: false, private: false, access: { has: obj => "updateType" in obj, get: obj => obj.updateType }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _assignBalance_decorators, { kind: "method", name: "assignBalance", static: false, private: false, access: { has: obj => "assignBalance" in obj, get: obj => obj.assignBalance }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getBalance_decorators, { kind: "method", name: "getBalance", static: false, private: false, access: { has: obj => "getBalance" in obj, get: obj => obj.getBalance }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _requestLeave_decorators, { kind: "method", name: "requestLeave", static: false, private: false, access: { has: obj => "requestLeave" in obj, get: obj => obj.requestLeave }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyRequests_decorators, { kind: "method", name: "getMyRequests", static: false, private: false, access: { has: obj => "getMyRequests" in obj, get: obj => obj.getMyRequests }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getEmployeeRequests_decorators, { kind: "method", name: "getEmployeeRequests", static: false, private: false, access: { has: obj => "getEmployeeRequests" in obj, get: obj => obj.getEmployeeRequests }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyBalances_decorators, { kind: "method", name: "getMyBalances", static: false, private: false, access: { has: obj => "getMyBalances" in obj, get: obj => obj.getMyBalances }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getRequests_decorators, { kind: "method", name: "getRequests", static: false, private: false, access: { has: obj => "getRequests" in obj, get: obj => obj.getRequests }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateStatus_decorators, { kind: "method", name: "updateStatus", static: false, private: false, access: { has: obj => "updateStatus" in obj, get: obj => obj.updateStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateDetails_decorators, { kind: "method", name: "updateDetails", static: false, private: false, access: { has: obj => "updateDetails" in obj, get: obj => obj.updateDetails }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resumeLeave_decorators, { kind: "method", name: "resumeLeave", static: false, private: false, access: { has: obj => "resumeLeave" in obj, get: obj => obj.resumeLeave }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancelLeave_decorators, { kind: "method", name: "cancelLeave", static: false, private: false, access: { has: obj => "cancelLeave" in obj, get: obj => obj.cancelLeave }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _accrue_decorators, { kind: "method", name: "accrue", static: false, private: false, access: { has: obj => "accrue" in obj, get: obj => obj.accrue }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _accruePayroll_decorators, { kind: "method", name: "accruePayroll", static: false, private: false, access: { has: obj => "accruePayroll" in obj, get: obj => obj.accruePayroll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LeaveController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LeaveController = _classThis;
})();
exports.LeaveController = LeaveController;
