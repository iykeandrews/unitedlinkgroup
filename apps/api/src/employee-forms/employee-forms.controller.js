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
exports.EmployeeFormsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let EmployeeFormsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('employee-forms'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _listTemplates_decorators;
    let _createTemplate_decorators;
    let _updateTemplate_decorators;
    let _archiveTemplate_decorators;
    let _assignTemplate_decorators;
    let _listAssignments_decorators;
    let _adminGetAssignment_decorators;
    let _myAssignments_decorators;
    let _myAssignment_decorators;
    let _mySubmit_decorators;
    var EmployeeFormsController = _classThis = class {
        constructor(employeeFormsService) {
            this.employeeFormsService = (__runInitializers(this, _instanceExtraInitializers), employeeFormsService);
        }
        listTemplates(req, businessId, query) {
            return this.employeeFormsService.listTemplates(req.user, businessId, query);
        }
        createTemplate(req, dto, businessId) {
            return this.employeeFormsService.createTemplate(req.user, dto, businessId);
        }
        updateTemplate(req, id, dto) {
            return this.employeeFormsService.updateTemplate(req.user, id, dto);
        }
        archiveTemplate(req, id) {
            return this.employeeFormsService.archiveTemplate(req.user, id);
        }
        assignTemplate(req, id, dto, businessId) {
            return this.employeeFormsService.assignTemplate(req.user, id, dto, businessId);
        }
        listAssignments(req, businessId, query) {
            return this.employeeFormsService.listAssignmentsAdmin(req.user, businessId, query);
        }
        adminGetAssignment(req, id) {
            return this.employeeFormsService.adminGetAssignment(req.user, id);
        }
        myAssignments(req, query) {
            return this.employeeFormsService.listMyAssignments(req.user, query);
        }
        myAssignment(req, id) {
            return this.employeeFormsService.getMyAssignment(req.user, id);
        }
        mySubmit(req, id, dto) {
            return this.employeeFormsService.submitMyAssignment(req.user, id, dto);
        }
    };
    __setFunctionName(_classThis, "EmployeeFormsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _listTemplates_decorators = [(0, common_1.Get)('templates'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _createTemplate_decorators = [(0, common_1.Post)('templates'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _updateTemplate_decorators = [(0, common_1.Patch)('templates/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _archiveTemplate_decorators = [(0, common_1.Delete)('templates/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _assignTemplate_decorators = [(0, common_1.Post)('templates/:id/assign'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _listAssignments_decorators = [(0, common_1.Get)('assignments'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _adminGetAssignment_decorators = [(0, common_1.Get)('assignments/:id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.SUPER_ADMIN)];
        _myAssignments_decorators = [(0, common_1.Get)('my-assignments')];
        _myAssignment_decorators = [(0, common_1.Get)('my-assignments/:id')];
        _mySubmit_decorators = [(0, common_1.Post)('my-assignments/:id/submit')];
        __esDecorate(_classThis, null, _listTemplates_decorators, { kind: "method", name: "listTemplates", static: false, private: false, access: { has: obj => "listTemplates" in obj, get: obj => obj.listTemplates }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createTemplate_decorators, { kind: "method", name: "createTemplate", static: false, private: false, access: { has: obj => "createTemplate" in obj, get: obj => obj.createTemplate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateTemplate_decorators, { kind: "method", name: "updateTemplate", static: false, private: false, access: { has: obj => "updateTemplate" in obj, get: obj => obj.updateTemplate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _archiveTemplate_decorators, { kind: "method", name: "archiveTemplate", static: false, private: false, access: { has: obj => "archiveTemplate" in obj, get: obj => obj.archiveTemplate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _assignTemplate_decorators, { kind: "method", name: "assignTemplate", static: false, private: false, access: { has: obj => "assignTemplate" in obj, get: obj => obj.assignTemplate }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listAssignments_decorators, { kind: "method", name: "listAssignments", static: false, private: false, access: { has: obj => "listAssignments" in obj, get: obj => obj.listAssignments }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _adminGetAssignment_decorators, { kind: "method", name: "adminGetAssignment", static: false, private: false, access: { has: obj => "adminGetAssignment" in obj, get: obj => obj.adminGetAssignment }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myAssignments_decorators, { kind: "method", name: "myAssignments", static: false, private: false, access: { has: obj => "myAssignments" in obj, get: obj => obj.myAssignments }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myAssignment_decorators, { kind: "method", name: "myAssignment", static: false, private: false, access: { has: obj => "myAssignment" in obj, get: obj => obj.myAssignment }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _mySubmit_decorators, { kind: "method", name: "mySubmit", static: false, private: false, access: { has: obj => "mySubmit" in obj, get: obj => obj.mySubmit }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmployeeFormsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmployeeFormsController = _classThis;
})();
exports.EmployeeFormsController = EmployeeFormsController;
