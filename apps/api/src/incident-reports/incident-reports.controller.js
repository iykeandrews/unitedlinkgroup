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
exports.IncidentReportsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
let IncidentReportsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('incident-reports'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _create_decorators;
    let _findAll_decorators;
    let _getLocationSummary_decorators;
    let _getAnalytics_decorators;
    let _export_decorators;
    let _findOne_decorators;
    let _update_decorators;
    let _addNote_decorators;
    let _assignInvestigator_decorators;
    let _uploadEvidence_decorators;
    let _remove_decorators;
    var IncidentReportsController = _classThis = class {
        constructor(incidentReportsService, uploadsService) {
            this.incidentReportsService = (__runInitializers(this, _instanceExtraInitializers), incidentReportsService);
            this.uploadsService = uploadsService;
        }
        create(req, createDto, headerBusinessId) {
            const userAgent = req.headers['user-agent'];
            return this.incidentReportsService.create(createDto, req.user, headerBusinessId, { userAgent });
        }
        findAll(req, headerBusinessId, page, pageSize, search, locationId, type, severity, status, reportingOfficerEmployeeId, from, to) {
            return this.incidentReportsService.findAll(req.user, headerBusinessId, {
                page: page ? parseInt(page, 10) : undefined,
                pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
                search,
                locationId,
                type,
                severity,
                status,
                reportingOfficerEmployeeId,
                from,
                to,
            });
        }
        getLocationSummary(req, headerBusinessId, status) {
            return this.incidentReportsService.getSummaryByLocation(req.user, headerBusinessId, status);
        }
        getAnalytics(req, headerBusinessId, period) {
            const p = period || 'weekly';
            const resolved = p === 'daily' || p === 'weekly' || p === 'monthly' ? p : 'weekly';
            return this.incidentReportsService.getAnalytics(req.user, headerBusinessId, resolved);
        }
        async export(req, headerBusinessId, res, format, search, locationId, type, severity, status, reportingOfficerEmployeeId, from, to) {
            const f = format === 'xlsx' ? 'xlsx' : 'csv';
            const out = await this.incidentReportsService.exportIncidents(req.user, headerBusinessId, f, {
                search,
                locationId,
                type,
                severity,
                status,
                reportingOfficerEmployeeId,
                from,
                to,
            });
            res.setHeader('Content-Type', out.mime);
            res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
            return out.data;
        }
        findOne(id, req) {
            return this.incidentReportsService.findOne(id, req.user);
        }
        update(req, id, updateDto) {
            return this.incidentReportsService.update(id, updateDto, req.user);
        }
        addNote(req, id, body) {
            return this.incidentReportsService.addInvestigationNote(id, req.user, (body === null || body === void 0 ? void 0 : body.note) || '');
        }
        assignInvestigator(req, id, body) {
            if (!(body === null || body === void 0 ? void 0 : body.investigatorEmployeeId))
                throw new common_1.BadRequestException('investigatorEmployeeId is required');
            return this.incidentReportsService.assignInvestigator(id, req.user, body.investigatorEmployeeId);
        }
        async uploadEvidence(req, id, file) {
            if (!file)
                throw new common_1.BadRequestException('file is required');
            const uploaded = await this.uploadsService.uploadBuffer({
                buffer: file.buffer,
                originalName: file.originalname,
                mimeType: file.mimetype,
                prefix: 'incident',
            });
            return this.incidentReportsService.addEvidence(id, req.user, {
                url: uploaded.url,
                filename: uploaded.key,
                originalName: uploaded.originalName,
                mimeType: uploaded.mimeType || undefined,
                sizeBytes: uploaded.size,
            });
        }
        remove(req, id) {
            return this.incidentReportsService.remove(id, req.user);
        }
    };
    __setFunctionName(_classThis, "IncidentReportsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE), (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true }))];
        _findAll_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _getLocationSummary_decorators = [(0, common_1.Get)('summary/locations'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _getAnalytics_decorators = [(0, common_1.Get)('analytics'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _export_decorators = [(0, common_1.Get)('export'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _findOne_decorators = [(0, common_1.Get)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE)];
        _update_decorators = [(0, common_1.Patch)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER), (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true }))];
        _addNote_decorators = [(0, common_1.Post)(':id/notes'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _assignInvestigator_decorators = [(0, common_1.Post)(':id/assign-investigator'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _uploadEvidence_decorators = [(0, common_1.Post)(':id/evidence'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER, types_1.UserRole.EMPLOYEE), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
                storage: (0, multer_1.memoryStorage)(),
                limits: { fileSize: 25 * 1024 * 1024 }
            }))];
        _remove_decorators = [(0, common_1.Delete)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: obj => "create" in obj, get: obj => obj.create }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: obj => "findAll" in obj, get: obj => obj.findAll }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getLocationSummary_decorators, { kind: "method", name: "getLocationSummary", static: false, private: false, access: { has: obj => "getLocationSummary" in obj, get: obj => obj.getLocationSummary }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAnalytics_decorators, { kind: "method", name: "getAnalytics", static: false, private: false, access: { has: obj => "getAnalytics" in obj, get: obj => obj.getAnalytics }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _export_decorators, { kind: "method", name: "export", static: false, private: false, access: { has: obj => "export" in obj, get: obj => obj.export }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: obj => "findOne" in obj, get: obj => obj.findOne }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: obj => "update" in obj, get: obj => obj.update }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addNote_decorators, { kind: "method", name: "addNote", static: false, private: false, access: { has: obj => "addNote" in obj, get: obj => obj.addNote }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _assignInvestigator_decorators, { kind: "method", name: "assignInvestigator", static: false, private: false, access: { has: obj => "assignInvestigator" in obj, get: obj => obj.assignInvestigator }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadEvidence_decorators, { kind: "method", name: "uploadEvidence", static: false, private: false, access: { has: obj => "uploadEvidence" in obj, get: obj => obj.uploadEvidence }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: obj => "remove" in obj, get: obj => obj.remove }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        IncidentReportsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return IncidentReportsController = _classThis;
})();
exports.IncidentReportsController = IncidentReportsController;
