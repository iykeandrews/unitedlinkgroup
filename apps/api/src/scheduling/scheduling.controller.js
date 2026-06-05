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
exports.SchedulingController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let SchedulingController = (() => {
    let _classDecorators = [(0, common_1.Controller)('scheduling'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createShift_decorators;
    let _getShifts_decorators;
    let _getMyShifts_decorators;
    let _getMyCallouts_decorators;
    let _getMyPeerShifts_decorators;
    let _applyForShift_decorators;
    let _approveShiftApplication_decorators;
    let _declineShiftApplication_decorators;
    let _recordCallout_decorators;
    let _listPendingCallouts_decorators;
    let _approveCallout_decorators;
    let _rejectCallout_decorators;
    let _reassignShift_decorators;
    let _broadcastShift_decorators;
    let _shiftHistory_decorators;
    let _updateShift_decorators;
    let _deleteShift_decorators;
    let _publishShifts_decorators;
    let _autoSchedule_decorators;
    let _getMyAvailability_decorators;
    let _updateMyAvailability_decorators;
    var SchedulingController = _classThis = class {
        constructor(schedulingService) {
            this.schedulingService = (__runInitializers(this, _instanceExtraInitializers), schedulingService);
        }
        createShift(data, req) {
            return this.schedulingService.createShift(data, req.user);
        }
        async getShifts(queryBusinessId, headerBusinessId, start, end, employeeId, req) {
            console.log('getShifts called', { queryBusinessId, headerBusinessId, start, end, employeeId, user: req.user });
            try {
                let targetBusinessId = queryBusinessId || headerBusinessId;
                if (!targetBusinessId) {
                    // Only try to derive from user if they are not super admin, or if we want to support employee fallback
                    if (req.user.role === types_1.UserRole.SUPER_ADMIN) {
                        throw new Error('Business context required for Super Admin');
                    }
                    targetBusinessId = await this.schedulingService.getBusinessId(req.user.userId);
                }
                console.log('targetBusinessId resolved:', targetBusinessId);
                return await this.schedulingService.getShifts(targetBusinessId, new Date(start), new Date(end), req.user, employeeId);
            }
            catch (error) {
                console.error('Error in getShifts:', error);
                throw error;
            }
        }
        async getMyShifts(start, end, req) {
            return this.schedulingService.getMyShifts(req.user.userId, new Date(start), new Date(end));
        }
        async getMyCallouts(req) {
            return this.schedulingService.getMyCallouts(req.user.userId);
        }
        async getMyPeerShifts(start, end, req) {
            return this.schedulingService.getMyPeerShifts(req.user.userId, new Date(start), new Date(end));
        }
        applyForShift(id, req) {
            return this.schedulingService.applyForShift(id, req.user.userId);
        }
        approveShiftApplication(id, req) {
            return this.schedulingService.approveShiftApplication(id, req.user);
        }
        declineShiftApplication(id, req) {
            return this.schedulingService.declineShiftApplication(id, req.user);
        }
        recordCallout(id, body, req, ip, userAgent) {
            return this.schedulingService.recordCallout(id, body, req.user, { ipAddress: ip, userAgent });
        }
        listPendingCallouts(req, businessId) {
            return this.schedulingService.listPendingCallouts(req.user, businessId);
        }
        approveCallout(id, req) {
            return this.schedulingService.approveCallout(id, req.user);
        }
        rejectCallout(id, body, req) {
            return this.schedulingService.rejectCallout(id, body, req.user);
        }
        reassignShift(id, body, req, ip, userAgent) {
            return this.schedulingService.reassignShift(id, body, req.user, { ipAddress: ip, userAgent });
        }
        broadcastShift(id, body, req, ip, userAgent) {
            return this.schedulingService.broadcastOpenShift(id, body, req.user, { ipAddress: ip, userAgent });
        }
        shiftHistory(id, req) {
            return this.schedulingService.getShiftHistory(id, req.user);
        }
        updateShift(id, data, req) {
            return this.schedulingService.updateShift(id, data, req.user);
        }
        deleteShift(id, req) {
            return this.schedulingService.deleteShift(id, req.user);
        }
        publishShifts(queryBusinessId, headerBusinessId, start, end, req) {
            let targetBusinessId = queryBusinessId || headerBusinessId;
            if (!targetBusinessId) {
                if (req.user.role === types_1.UserRole.SUPER_ADMIN) {
                    throw new Error('Business context required for Super Admin');
                }
                return this.schedulingService.getBusinessId(req.user.userId).then(businessId => {
                    return this.schedulingService.publishShifts(businessId, new Date(start), new Date(end), req.user);
                });
            }
            return this.schedulingService.publishShifts(targetBusinessId, new Date(start), new Date(end), req.user);
        }
        autoSchedule(queryBusinessId, headerBusinessId, start, end, clientId, req) {
            let targetBusinessId = queryBusinessId || headerBusinessId;
            if (!targetBusinessId) {
                if (req.user.role === types_1.UserRole.SUPER_ADMIN) {
                    throw new Error('Business context required for Super Admin');
                }
                return this.schedulingService.getBusinessId(req.user.userId).then(businessId => {
                    return this.schedulingService.autoSchedule(businessId, new Date(start), new Date(end), req.user, { clientId });
                });
            }
            return this.schedulingService.autoSchedule(targetBusinessId, new Date(start), new Date(end), req.user, { clientId });
        }
        getMyAvailability(req) {
            return this.schedulingService.getMyAvailability(req.user.userId);
        }
        updateMyAvailability(body, req) {
            return this.schedulingService.updateMyAvailability(req.user.userId, body);
        }
    };
    __setFunctionName(_classThis, "SchedulingController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createShift_decorators = [(0, common_1.Post)('shifts'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _getShifts_decorators = [(0, common_1.Get)('shifts'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _getMyShifts_decorators = [(0, common_1.Get)('my'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _getMyCallouts_decorators = [(0, common_1.Get)('my-callouts'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _getMyPeerShifts_decorators = [(0, common_1.Get)('my-peers'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _applyForShift_decorators = [(0, common_1.Post)('shifts/:id/apply'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _approveShiftApplication_decorators = [(0, common_1.Post)('applications/:id/approve'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _declineShiftApplication_decorators = [(0, common_1.Post)('applications/:id/decline'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _recordCallout_decorators = [(0, common_1.Post)('shifts/:id/callout'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _listPendingCallouts_decorators = [(0, common_1.Get)('callouts/pending'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _approveCallout_decorators = [(0, common_1.Post)('callouts/:id/approve'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _rejectCallout_decorators = [(0, common_1.Post)('callouts/:id/reject'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _reassignShift_decorators = [(0, common_1.Post)('shifts/:id/reassign'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _broadcastShift_decorators = [(0, common_1.Post)('shifts/:id/broadcast'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _shiftHistory_decorators = [(0, common_1.Get)('shifts/:id/history'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _updateShift_decorators = [(0, common_1.Put)('shifts/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _deleteShift_decorators = [(0, common_1.Delete)('shifts/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _publishShifts_decorators = [(0, common_1.Post)('shifts/publish'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _autoSchedule_decorators = [(0, common_1.Post)('auto-schedule'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _getMyAvailability_decorators = [(0, common_1.Get)('availability'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER)];
        _updateMyAvailability_decorators = [(0, common_1.Post)('availability'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER)];
        __esDecorate(_classThis, null, _createShift_decorators, { kind: "method", name: "createShift", static: false, private: false, access: { has: obj => "createShift" in obj, get: obj => obj.createShift }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getShifts_decorators, { kind: "method", name: "getShifts", static: false, private: false, access: { has: obj => "getShifts" in obj, get: obj => obj.getShifts }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyShifts_decorators, { kind: "method", name: "getMyShifts", static: false, private: false, access: { has: obj => "getMyShifts" in obj, get: obj => obj.getMyShifts }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyCallouts_decorators, { kind: "method", name: "getMyCallouts", static: false, private: false, access: { has: obj => "getMyCallouts" in obj, get: obj => obj.getMyCallouts }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyPeerShifts_decorators, { kind: "method", name: "getMyPeerShifts", static: false, private: false, access: { has: obj => "getMyPeerShifts" in obj, get: obj => obj.getMyPeerShifts }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _applyForShift_decorators, { kind: "method", name: "applyForShift", static: false, private: false, access: { has: obj => "applyForShift" in obj, get: obj => obj.applyForShift }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approveShiftApplication_decorators, { kind: "method", name: "approveShiftApplication", static: false, private: false, access: { has: obj => "approveShiftApplication" in obj, get: obj => obj.approveShiftApplication }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _declineShiftApplication_decorators, { kind: "method", name: "declineShiftApplication", static: false, private: false, access: { has: obj => "declineShiftApplication" in obj, get: obj => obj.declineShiftApplication }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _recordCallout_decorators, { kind: "method", name: "recordCallout", static: false, private: false, access: { has: obj => "recordCallout" in obj, get: obj => obj.recordCallout }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listPendingCallouts_decorators, { kind: "method", name: "listPendingCallouts", static: false, private: false, access: { has: obj => "listPendingCallouts" in obj, get: obj => obj.listPendingCallouts }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approveCallout_decorators, { kind: "method", name: "approveCallout", static: false, private: false, access: { has: obj => "approveCallout" in obj, get: obj => obj.approveCallout }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rejectCallout_decorators, { kind: "method", name: "rejectCallout", static: false, private: false, access: { has: obj => "rejectCallout" in obj, get: obj => obj.rejectCallout }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reassignShift_decorators, { kind: "method", name: "reassignShift", static: false, private: false, access: { has: obj => "reassignShift" in obj, get: obj => obj.reassignShift }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _broadcastShift_decorators, { kind: "method", name: "broadcastShift", static: false, private: false, access: { has: obj => "broadcastShift" in obj, get: obj => obj.broadcastShift }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _shiftHistory_decorators, { kind: "method", name: "shiftHistory", static: false, private: false, access: { has: obj => "shiftHistory" in obj, get: obj => obj.shiftHistory }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateShift_decorators, { kind: "method", name: "updateShift", static: false, private: false, access: { has: obj => "updateShift" in obj, get: obj => obj.updateShift }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteShift_decorators, { kind: "method", name: "deleteShift", static: false, private: false, access: { has: obj => "deleteShift" in obj, get: obj => obj.deleteShift }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _publishShifts_decorators, { kind: "method", name: "publishShifts", static: false, private: false, access: { has: obj => "publishShifts" in obj, get: obj => obj.publishShifts }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _autoSchedule_decorators, { kind: "method", name: "autoSchedule", static: false, private: false, access: { has: obj => "autoSchedule" in obj, get: obj => obj.autoSchedule }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyAvailability_decorators, { kind: "method", name: "getMyAvailability", static: false, private: false, access: { has: obj => "getMyAvailability" in obj, get: obj => obj.getMyAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMyAvailability_decorators, { kind: "method", name: "updateMyAvailability", static: false, private: false, access: { has: obj => "updateMyAvailability" in obj, get: obj => obj.updateMyAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SchedulingController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SchedulingController = _classThis;
})();
exports.SchedulingController = SchedulingController;
