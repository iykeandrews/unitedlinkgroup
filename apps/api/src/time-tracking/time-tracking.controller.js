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
exports.TimeTrackingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let TimeTrackingController = (() => {
    let _classDecorators = [(0, common_1.Controller)('time-tracking'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _importTimesheets_decorators;
    let _clockIn_decorators;
    let _clockOut_decorators;
    let _adminClockIn_decorators;
    let _adminClockOut_decorators;
    let _getEmployeeStatusForAdmin_decorators;
    let _startBreak_decorators;
    let _endBreak_decorators;
    let _locationPing_decorators;
    let _getStatus_decorators;
    let _getTimesheets_decorators;
    let _updateTimesheet_decorators;
    let _deleteTimesheet_decorators;
    let _restoreTimesheet_decorators;
    var TimeTrackingController = _classThis = class {
        constructor(timeTrackingService) {
            this.timeTrackingService = (__runInitializers(this, _instanceExtraInitializers), timeTrackingService);
        }
        async importTimesheets(file, body, user) {
            if (!file)
                throw new common_1.BadRequestException('No file uploaded');
            return this.timeTrackingService.importTimesheets(file.buffer, body.businessId, user);
        }
        async clockIn(body, user, ip, req) {
            var _a;
            const realIp = ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) || ip || req.ip;
            console.log('Clock In Request - IP Capture:', {
                xForwardedFor: req.headers['x-forwarded-for'],
                nestIp: ip,
                reqIp: req.ip,
                resolvedRealIp: realIp
            });
            const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
            const shift = await this.timeTrackingService.requireClockInShift(employeeId);
            const locationId = shift.locationId || undefined;
            return this.timeTrackingService.clockIn(employeeId, locationId, body.lat, body.lng, realIp);
        }
        async clockOut(body, user, ip, req) {
            var _a;
            const realIp = ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) || ip || req.ip;
            const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
            return this.timeTrackingService.clockOut(employeeId, realIp, body.note, body.lat, body.lng);
        }
        async adminClockIn(body, user) {
            console.log('Admin Clock In Request:', body);
            return this.timeTrackingService.adminClockIn(body.employeeId, body.locationId, user);
        }
        async adminClockOut(body, user) {
            console.log('Admin Clock Out Request:', body);
            return this.timeTrackingService.adminClockOut(body.employeeId, user);
        }
        async getEmployeeStatusForAdmin(employeeId, user) {
            return this.timeTrackingService.getEmployeeStatus(employeeId, user);
        }
        async startBreak(body, user) {
            const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
            return this.timeTrackingService.startBreak(employeeId, body.type, body.lat, body.lng);
        }
        async endBreak(body, user) {
            const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
            return this.timeTrackingService.endBreak(employeeId, body.lat, body.lng);
        }
        async locationPing(body, user) {
            const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
            return this.timeTrackingService.locationPing(employeeId, body.lat, body.lng);
        }
        async getStatus(user, businessId) {
            const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, businessId || user.businessId, user);
            return this.timeTrackingService.getEmployeeStatus(employeeId);
        }
        async getTimesheets(queryEmployeeId, start, end, user, headerBusinessId) {
            // If Employee, force own timesheets
            if (user.role === types_1.UserRole.EMPLOYEE) {
                const targetEmployeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, user.businessId, user);
                return this.timeTrackingService.getTimesheets(targetEmployeeId, new Date(start), new Date(end), user);
            }
            // Admin/Manager
            if (queryEmployeeId) {
                return this.timeTrackingService.getTimesheets(queryEmployeeId, new Date(start), new Date(end), user);
            }
            // If no specific employee requested, get all for business
            // Use header business ID if available (for Super Admin switching views), otherwise fallback to user's business
            let businessId = headerBusinessId;
            if (!businessId) {
                businessId = await this.timeTrackingService.getBusinessId(user.userId);
            }
            return this.timeTrackingService.getBusinessTimesheets(businessId, new Date(start), new Date(end), user);
        }
        async updateTimesheet(id, body, user) {
            return this.timeTrackingService.updateTimesheet(id, body, user);
        }
        async deleteTimesheet(id, user) {
            // If Employee, verify ownership
            if (user.role === types_1.UserRole.EMPLOYEE) {
                const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, undefined, user);
                return this.timeTrackingService.deleteTimesheet(id, employeeId, user);
            }
            return this.timeTrackingService.deleteTimesheet(id, undefined, user);
        }
        async restoreTimesheet(id, user) {
            // If Employee, verify ownership
            if (user.role === types_1.UserRole.EMPLOYEE) {
                const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, undefined, user);
                return this.timeTrackingService.restoreTimesheet(id, employeeId, user);
            }
            return this.timeTrackingService.restoreTimesheet(id, undefined, user);
        }
    };
    __setFunctionName(_classThis, "TimeTrackingController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _importTimesheets_decorators = [(0, common_1.Post)('import'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file'))];
        _clockIn_decorators = [(0, common_1.Post)('clock-in'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _clockOut_decorators = [(0, common_1.Post)('clock-out'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _adminClockIn_decorators = [(0, common_1.Post)('admin/clock-in'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _adminClockOut_decorators = [(0, common_1.Post)('admin/clock-out'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _getEmployeeStatusForAdmin_decorators = [(0, common_1.Get)('admin/status/:employeeId'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _startBreak_decorators = [(0, common_1.Post)('break/start'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _endBreak_decorators = [(0, common_1.Post)('break/end'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _locationPing_decorators = [(0, common_1.Post)('location/ping'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _getStatus_decorators = [(0, common_1.Get)('status'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _getTimesheets_decorators = [(0, common_1.Get)('timesheets'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _updateTimesheet_decorators = [(0, common_1.Patch)('timesheets/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _deleteTimesheet_decorators = [(0, common_1.Delete)('timesheets/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _restoreTimesheet_decorators = [(0, common_1.Post)('timesheets/:id/restore'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        __esDecorate(_classThis, null, _importTimesheets_decorators, { kind: "method", name: "importTimesheets", static: false, private: false, access: { has: obj => "importTimesheets" in obj, get: obj => obj.importTimesheets }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _clockIn_decorators, { kind: "method", name: "clockIn", static: false, private: false, access: { has: obj => "clockIn" in obj, get: obj => obj.clockIn }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _clockOut_decorators, { kind: "method", name: "clockOut", static: false, private: false, access: { has: obj => "clockOut" in obj, get: obj => obj.clockOut }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _adminClockIn_decorators, { kind: "method", name: "adminClockIn", static: false, private: false, access: { has: obj => "adminClockIn" in obj, get: obj => obj.adminClockIn }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _adminClockOut_decorators, { kind: "method", name: "adminClockOut", static: false, private: false, access: { has: obj => "adminClockOut" in obj, get: obj => obj.adminClockOut }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getEmployeeStatusForAdmin_decorators, { kind: "method", name: "getEmployeeStatusForAdmin", static: false, private: false, access: { has: obj => "getEmployeeStatusForAdmin" in obj, get: obj => obj.getEmployeeStatusForAdmin }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _startBreak_decorators, { kind: "method", name: "startBreak", static: false, private: false, access: { has: obj => "startBreak" in obj, get: obj => obj.startBreak }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _endBreak_decorators, { kind: "method", name: "endBreak", static: false, private: false, access: { has: obj => "endBreak" in obj, get: obj => obj.endBreak }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _locationPing_decorators, { kind: "method", name: "locationPing", static: false, private: false, access: { has: obj => "locationPing" in obj, get: obj => obj.locationPing }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getStatus_decorators, { kind: "method", name: "getStatus", static: false, private: false, access: { has: obj => "getStatus" in obj, get: obj => obj.getStatus }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTimesheets_decorators, { kind: "method", name: "getTimesheets", static: false, private: false, access: { has: obj => "getTimesheets" in obj, get: obj => obj.getTimesheets }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateTimesheet_decorators, { kind: "method", name: "updateTimesheet", static: false, private: false, access: { has: obj => "updateTimesheet" in obj, get: obj => obj.updateTimesheet }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteTimesheet_decorators, { kind: "method", name: "deleteTimesheet", static: false, private: false, access: { has: obj => "deleteTimesheet" in obj, get: obj => obj.deleteTimesheet }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _restoreTimesheet_decorators, { kind: "method", name: "restoreTimesheet", static: false, private: false, access: { has: obj => "restoreTimesheet" in obj, get: obj => obj.restoreTimesheet }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TimeTrackingController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TimeTrackingController = _classThis;
})();
exports.TimeTrackingController = TimeTrackingController;
