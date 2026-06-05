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
exports.EmployeesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let EmployeesController = (() => {
    let _classDecorators = [(0, common_1.Controller)('employees'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getMe_decorators;
    let _updateMyProfileImage_decorators;
    let _updateMyPassword_decorators;
    let _updateMyBio_decorators;
    let _listMyAvailability_decorators;
    let _createMyAvailability_decorators;
    let _updateMyAvailability_decorators;
    let _deleteMyAvailability_decorators;
    let _findAll_decorators;
    let _listChatDirectory_decorators;
    let _getExpiringQualifications_decorators;
    let _getAllQualifications_decorators;
    let _getMyQualifications_decorators;
    let _addMyQualification_decorators;
    let _updateMyQualification_decorators;
    let _deleteMyQualification_decorators;
    let _getAllAvailabilities_decorators;
    let _findOne_decorators;
    let _create_decorators;
    let _update_decorators;
    let _updatePassword_decorators;
    let _listAvailability_decorators;
    let _createAvailability_decorators;
    let _updateAvailability_decorators;
    let _deleteAvailability_decorators;
    let _getQualifications_decorators;
    let _addQualification_decorators;
    let _updateQualification_decorators;
    let _deleteQualification_decorators;
    var EmployeesController = _classThis = class {
        constructor(employeesService) {
            this.employeesService = (__runInitializers(this, _instanceExtraInitializers), employeesService);
        }
        getMe(req, businessId) {
            return this.employeesService.getMe(req.user, businessId);
        }
        updateMyProfileImage(req, body, businessId) {
            return this.employeesService.updateMyProfileImage(req.user, body.url, businessId);
        }
        updateMyPassword(req, body, businessId) {
            return this.employeesService.updateMyPassword(req.user, body, businessId);
        }
        updateMyBio(req, body, businessId) {
            return this.employeesService.updateMyBio(req.user, body, businessId);
        }
        listMyAvailability(req, businessId) {
            return this.employeesService.listMyAvailability(req.user, businessId);
        }
        createMyAvailability(req, body, businessId) {
            return this.employeesService.createMyAvailability(req.user, body, businessId);
        }
        updateMyAvailability(req, availabilityId, body, businessId) {
            return this.employeesService.updateMyAvailability(req.user, availabilityId, body, businessId);
        }
        deleteMyAvailability(req, availabilityId, businessId) {
            return this.employeesService.deleteMyAvailability(req.user, availabilityId, businessId);
        }
        findAll(req, status, businessId) {
            return this.employeesService.findAll(req.user, status, businessId);
        }
        listChatDirectory(req, businessId) {
            return this.employeesService.listChatDirectory(req.user, businessId);
        }
        getExpiringQualifications(req, businessId) {
            return this.employeesService.getExpiringQualifications(req.user, businessId);
        }
        getAllQualifications(req, businessId) {
            return this.employeesService.getAllQualifications(req.user, businessId);
        }
        getMyQualifications(req, businessId) {
            return this.employeesService.getMyQualifications(req.user, businessId);
        }
        addMyQualification(req, body, businessId) {
            return this.employeesService.addMyQualification(req.user, body, businessId);
        }
        updateMyQualification(req, qualificationId, body, businessId) {
            return this.employeesService.updateMyQualification(req.user, qualificationId, body, businessId);
        }
        deleteMyQualification(req, qualificationId, businessId) {
            return this.employeesService.deleteMyQualification(req.user, qualificationId, businessId);
        }
        getAllAvailabilities(req, businessId) {
            return this.employeesService.getAllAvailabilities(req.user, businessId);
        }
        findOne(req, id, businessId) {
            return this.employeesService.findOne(req.user, id, businessId);
        }
        create(req, body, businessId) {
            return this.employeesService.create(req.user, body, businessId);
        }
        update(req, id, body, businessId) {
            return this.employeesService.update(req.user, id, body, businessId);
        }
        updatePassword(req, id, body, businessId) {
            return this.employeesService.update(req.user, id, { password: body.password }, businessId);
        }
        listAvailability(req, id, businessId) {
            return this.employeesService.listAvailability(req.user, id, businessId);
        }
        createAvailability(req, id, body, businessId) {
            return this.employeesService.createAvailability(req.user, id, body, businessId);
        }
        updateAvailability(req, id, availabilityId, body, businessId) {
            return this.employeesService.updateAvailability(req.user, id, availabilityId, body, businessId);
        }
        deleteAvailability(req, id, availabilityId, businessId) {
            return this.employeesService.deleteAvailability(req.user, id, availabilityId, businessId);
        }
        getQualifications(req, id, businessId) {
            return this.employeesService.getQualifications(req.user, id, businessId);
        }
        addQualification(req, id, body, businessId) {
            return this.employeesService.addQualification(req.user, id, body, businessId);
        }
        updateQualification(req, qualificationId, body, businessId) {
            return this.employeesService.updateQualification(req.user, qualificationId, body, businessId);
        }
        deleteQualification(req, qualificationId, businessId) {
            return this.employeesService.deleteQualification(req.user, qualificationId, businessId);
        }
    };
    __setFunctionName(_classThis, "EmployeesController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getMe_decorators = [(0, common_1.Get)('me'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _updateMyProfileImage_decorators = [(0, common_1.Patch)('me/profile-image'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN)];
        _updateMyPassword_decorators = [(0, common_1.Patch)('me/password'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN)];
        _updateMyBio_decorators = [(0, common_1.Patch)('me/bio'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE, types_1.UserRole.MANAGER, types_1.UserRole.BUSINESS_ADMIN)];
        _listMyAvailability_decorators = [(0, common_1.Get)('me/availability'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _createMyAvailability_decorators = [(0, common_1.Post)('me/availability'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _updateMyAvailability_decorators = [(0, common_1.Patch)('me/availability/:availabilityId'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _deleteMyAvailability_decorators = [(0, common_1.Delete)('me/availability/:availabilityId'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _findAll_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _listChatDirectory_decorators = [(0, common_1.Get)('chat-directory'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _getExpiringQualifications_decorators = [(0, common_1.Get)('qualifications/expiring'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _getAllQualifications_decorators = [(0, common_1.Get)('qualifications/all'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _getMyQualifications_decorators = [(0, common_1.Get)('me/qualifications'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _addMyQualification_decorators = [(0, common_1.Post)('me/qualifications'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _updateMyQualification_decorators = [(0, common_1.Patch)('me/qualifications/:qualificationId'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _deleteMyQualification_decorators = [(0, common_1.Delete)('me/qualifications/:qualificationId'), (0, roles_decorator_1.Roles)(types_1.UserRole.EMPLOYEE)];
        _getAllAvailabilities_decorators = [(0, common_1.Get)('availability/all'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _findOne_decorators = [(0, common_1.Get)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _update_decorators = [(0, common_1.Patch)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _updatePassword_decorators = [(0, common_1.Patch)(':id/password'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        _listAvailability_decorators = [(0, common_1.Get)(':id/availability'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _createAvailability_decorators = [(0, common_1.Post)(':id/availability'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _updateAvailability_decorators = [(0, common_1.Patch)(':id/availability/:availabilityId'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _deleteAvailability_decorators = [(0, common_1.Delete)(':id/availability/:availabilityId'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _getQualifications_decorators = [(0, common_1.Get)(':id/qualifications'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _addQualification_decorators = [(0, common_1.Post)(':id/qualifications'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _updateQualification_decorators = [(0, common_1.Patch)(':id/qualifications/:qualificationId'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        _deleteQualification_decorators = [(0, common_1.Delete)(':id/qualifications/:qualificationId'), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN, types_1.UserRole.MANAGER)];
        __esDecorate(_classThis, null, _getMe_decorators, { kind: "method", name: "getMe", static: false, private: false, access: { has: obj => "getMe" in obj, get: obj => obj.getMe }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMyProfileImage_decorators, { kind: "method", name: "updateMyProfileImage", static: false, private: false, access: { has: obj => "updateMyProfileImage" in obj, get: obj => obj.updateMyProfileImage }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMyPassword_decorators, { kind: "method", name: "updateMyPassword", static: false, private: false, access: { has: obj => "updateMyPassword" in obj, get: obj => obj.updateMyPassword }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMyBio_decorators, { kind: "method", name: "updateMyBio", static: false, private: false, access: { has: obj => "updateMyBio" in obj, get: obj => obj.updateMyBio }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listMyAvailability_decorators, { kind: "method", name: "listMyAvailability", static: false, private: false, access: { has: obj => "listMyAvailability" in obj, get: obj => obj.listMyAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createMyAvailability_decorators, { kind: "method", name: "createMyAvailability", static: false, private: false, access: { has: obj => "createMyAvailability" in obj, get: obj => obj.createMyAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMyAvailability_decorators, { kind: "method", name: "updateMyAvailability", static: false, private: false, access: { has: obj => "updateMyAvailability" in obj, get: obj => obj.updateMyAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteMyAvailability_decorators, { kind: "method", name: "deleteMyAvailability", static: false, private: false, access: { has: obj => "deleteMyAvailability" in obj, get: obj => obj.deleteMyAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: obj => "findAll" in obj, get: obj => obj.findAll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listChatDirectory_decorators, { kind: "method", name: "listChatDirectory", static: false, private: false, access: { has: obj => "listChatDirectory" in obj, get: obj => obj.listChatDirectory }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getExpiringQualifications_decorators, { kind: "method", name: "getExpiringQualifications", static: false, private: false, access: { has: obj => "getExpiringQualifications" in obj, get: obj => obj.getExpiringQualifications }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllQualifications_decorators, { kind: "method", name: "getAllQualifications", static: false, private: false, access: { has: obj => "getAllQualifications" in obj, get: obj => obj.getAllQualifications }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyQualifications_decorators, { kind: "method", name: "getMyQualifications", static: false, private: false, access: { has: obj => "getMyQualifications" in obj, get: obj => obj.getMyQualifications }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addMyQualification_decorators, { kind: "method", name: "addMyQualification", static: false, private: false, access: { has: obj => "addMyQualification" in obj, get: obj => obj.addMyQualification }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMyQualification_decorators, { kind: "method", name: "updateMyQualification", static: false, private: false, access: { has: obj => "updateMyQualification" in obj, get: obj => obj.updateMyQualification }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteMyQualification_decorators, { kind: "method", name: "deleteMyQualification", static: false, private: false, access: { has: obj => "deleteMyQualification" in obj, get: obj => obj.deleteMyQualification }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllAvailabilities_decorators, { kind: "method", name: "getAllAvailabilities", static: false, private: false, access: { has: obj => "getAllAvailabilities" in obj, get: obj => obj.getAllAvailabilities }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: obj => "update" in obj, get: obj => obj.update }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updatePassword_decorators, { kind: "method", name: "updatePassword", static: false, private: false, access: { has: obj => "updatePassword" in obj, get: obj => obj.updatePassword }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listAvailability_decorators, { kind: "method", name: "listAvailability", static: false, private: false, access: { has: obj => "listAvailability" in obj, get: obj => obj.listAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createAvailability_decorators, { kind: "method", name: "createAvailability", static: false, private: false, access: { has: obj => "createAvailability" in obj, get: obj => obj.createAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateAvailability_decorators, { kind: "method", name: "updateAvailability", static: false, private: false, access: { has: obj => "updateAvailability" in obj, get: obj => obj.updateAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteAvailability_decorators, { kind: "method", name: "deleteAvailability", static: false, private: false, access: { has: obj => "deleteAvailability" in obj, get: obj => obj.deleteAvailability }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getQualifications_decorators, { kind: "method", name: "getQualifications", static: false, private: false, access: { has: obj => "getQualifications" in obj, get: obj => obj.getQualifications }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addQualification_decorators, { kind: "method", name: "addQualification", static: false, private: false, access: { has: obj => "addQualification" in obj, get: obj => obj.addQualification }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateQualification_decorators, { kind: "method", name: "updateQualification", static: false, private: false, access: { has: obj => "updateQualification" in obj, get: obj => obj.updateQualification }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteQualification_decorators, { kind: "method", name: "deleteQualification", static: false, private: false, access: { has: obj => "deleteQualification" in obj, get: obj => obj.deleteQualification }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmployeesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmployeesController = _classThis;
})();
exports.EmployeesController = EmployeesController;
