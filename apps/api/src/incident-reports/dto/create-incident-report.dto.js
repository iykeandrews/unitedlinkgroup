"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateIncidentReportDto = exports.IncidentPersonInputDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let IncidentPersonInputDto = (() => {
    var _a;
    let _role_decorators;
    let _role_initializers = [];
    let _role_extraInitializers = [];
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _contactInfo_decorators;
    let _contactInfo_initializers = [];
    let _contactInfo_extraInitializers = [];
    return _a = class IncidentPersonInputDto {
            constructor() {
                this.role = __runInitializers(this, _role_initializers, void 0);
                this.name = (__runInitializers(this, _role_extraInitializers), __runInitializers(this, _name_initializers, void 0));
                this.contactInfo = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _contactInfo_initializers, void 0));
                __runInitializers(this, _contactInfo_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _role_decorators = [(0, class_validator_1.IsString)()];
            _name_decorators = [(0, class_validator_1.IsString)()];
            _contactInfo_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _role_decorators, { kind: "field", name: "role", static: false, private: false, access: { has: obj => "role" in obj, get: obj => obj.role, set: (obj, value) => { obj.role = value; } }, metadata: _metadata }, _role_initializers, _role_extraInitializers);
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _contactInfo_decorators, { kind: "field", name: "contactInfo", static: false, private: false, access: { has: obj => "contactInfo" in obj, get: obj => obj.contactInfo, set: (obj, value) => { obj.contactInfo = value; } }, metadata: _metadata }, _contactInfo_initializers, _contactInfo_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.IncidentPersonInputDto = IncidentPersonInputDto;
let CreateIncidentReportDto = (() => {
    var _a;
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _type_decorators;
    let _type_initializers = [];
    let _type_extraInitializers = [];
    let _severity_decorators;
    let _severity_initializers = [];
    let _severity_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _shift_decorators;
    let _shift_initializers = [];
    let _shift_extraInitializers = [];
    let _buildingArea_decorators;
    let _buildingArea_initializers = [];
    let _buildingArea_extraInitializers = [];
    let _locationId_decorators;
    let _locationId_initializers = [];
    let _locationId_extraInitializers = [];
    let _incidentAt_decorators;
    let _incidentAt_initializers = [];
    let _incidentAt_extraInitializers = [];
    let _date_decorators;
    let _date_initializers = [];
    let _date_extraInitializers = [];
    let _responseAction_decorators;
    let _responseAction_initializers = [];
    let _responseAction_extraInitializers = [];
    let _witnessPresent_decorators;
    let _witnessPresent_initializers = [];
    let _witnessPresent_extraInitializers = [];
    let _lawEnforcementInvolved_decorators;
    let _lawEnforcementInvolved_initializers = [];
    let _lawEnforcementInvolved_extraInitializers = [];
    let _evidenceCollected_decorators;
    let _evidenceCollected_initializers = [];
    let _evidenceCollected_extraInitializers = [];
    let _reportingOfficerEmployeeId_decorators;
    let _reportingOfficerEmployeeId_initializers = [];
    let _reportingOfficerEmployeeId_extraInitializers = [];
    let _assignedSupervisorId_decorators;
    let _assignedSupervisorId_initializers = [];
    let _assignedSupervisorId_extraInitializers = [];
    let _persons_decorators;
    let _persons_initializers = [];
    let _persons_extraInitializers = [];
    let _images_decorators;
    let _images_initializers = [];
    let _images_extraInitializers = [];
    let _deviceInfo_decorators;
    let _deviceInfo_initializers = [];
    let _deviceInfo_extraInitializers = [];
    let _geoLat_decorators;
    let _geoLat_initializers = [];
    let _geoLat_extraInitializers = [];
    let _geoLng_decorators;
    let _geoLng_initializers = [];
    let _geoLng_extraInitializers = [];
    return _a = class CreateIncidentReportDto {
            constructor() {
                this.title = __runInitializers(this, _title_initializers, void 0);
                this.description = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.type = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _type_initializers, void 0)); // GENERAL, THEFT, INJURY, SECURITY, DAMAGE
                this.severity = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _severity_initializers, void 0)); // LOW, MEDIUM, HIGH, CRITICAL
                this.status = (__runInitializers(this, _severity_extraInitializers), __runInitializers(this, _status_initializers, void 0)); // OPEN, INVESTIGATING, RESOLVED, CLOSED
                this.shift = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _shift_initializers, void 0));
                this.buildingArea = (__runInitializers(this, _shift_extraInitializers), __runInitializers(this, _buildingArea_initializers, void 0));
                this.locationId = (__runInitializers(this, _buildingArea_extraInitializers), __runInitializers(this, _locationId_initializers, void 0));
                this.incidentAt = (__runInitializers(this, _locationId_extraInitializers), __runInitializers(this, _incidentAt_initializers, void 0));
                this.date = (__runInitializers(this, _incidentAt_extraInitializers), __runInitializers(this, _date_initializers, void 0));
                this.responseAction = (__runInitializers(this, _date_extraInitializers), __runInitializers(this, _responseAction_initializers, void 0));
                this.witnessPresent = (__runInitializers(this, _responseAction_extraInitializers), __runInitializers(this, _witnessPresent_initializers, void 0));
                this.lawEnforcementInvolved = (__runInitializers(this, _witnessPresent_extraInitializers), __runInitializers(this, _lawEnforcementInvolved_initializers, void 0));
                this.evidenceCollected = (__runInitializers(this, _lawEnforcementInvolved_extraInitializers), __runInitializers(this, _evidenceCollected_initializers, void 0));
                this.reportingOfficerEmployeeId = (__runInitializers(this, _evidenceCollected_extraInitializers), __runInitializers(this, _reportingOfficerEmployeeId_initializers, void 0));
                this.assignedSupervisorId = (__runInitializers(this, _reportingOfficerEmployeeId_extraInitializers), __runInitializers(this, _assignedSupervisorId_initializers, void 0));
                this.persons = (__runInitializers(this, _assignedSupervisorId_extraInitializers), __runInitializers(this, _persons_initializers, void 0));
                this.images = (__runInitializers(this, _persons_extraInitializers), __runInitializers(this, _images_initializers, void 0));
                this.deviceInfo = (__runInitializers(this, _images_extraInitializers), __runInitializers(this, _deviceInfo_initializers, void 0));
                this.geoLat = (__runInitializers(this, _deviceInfo_extraInitializers), __runInitializers(this, _geoLat_initializers, void 0));
                this.geoLng = (__runInitializers(this, _geoLat_extraInitializers), __runInitializers(this, _geoLng_initializers, void 0));
                __runInitializers(this, _geoLng_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [(0, class_validator_1.IsString)()];
            _description_decorators = [(0, class_validator_1.IsString)()];
            _type_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _severity_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _status_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _shift_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _buildingArea_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _locationId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _incidentAt_decorators = [(0, class_validator_1.IsDateString)(), (0, class_validator_1.IsOptional)()];
            _date_decorators = [(0, class_validator_1.IsDateString)(), (0, class_validator_1.IsOptional)()];
            _responseAction_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _witnessPresent_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _lawEnforcementInvolved_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _evidenceCollected_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsOptional)()];
            _reportingOfficerEmployeeId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _assignedSupervisorId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _persons_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsOptional)(), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(() => IncidentPersonInputDto)];
            _images_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsOptional)()];
            _deviceInfo_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _geoLat_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            _geoLng_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: obj => "type" in obj, get: obj => obj.type, set: (obj, value) => { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _severity_decorators, { kind: "field", name: "severity", static: false, private: false, access: { has: obj => "severity" in obj, get: obj => obj.severity, set: (obj, value) => { obj.severity = value; } }, metadata: _metadata }, _severity_initializers, _severity_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _shift_decorators, { kind: "field", name: "shift", static: false, private: false, access: { has: obj => "shift" in obj, get: obj => obj.shift, set: (obj, value) => { obj.shift = value; } }, metadata: _metadata }, _shift_initializers, _shift_extraInitializers);
            __esDecorate(null, null, _buildingArea_decorators, { kind: "field", name: "buildingArea", static: false, private: false, access: { has: obj => "buildingArea" in obj, get: obj => obj.buildingArea, set: (obj, value) => { obj.buildingArea = value; } }, metadata: _metadata }, _buildingArea_initializers, _buildingArea_extraInitializers);
            __esDecorate(null, null, _locationId_decorators, { kind: "field", name: "locationId", static: false, private: false, access: { has: obj => "locationId" in obj, get: obj => obj.locationId, set: (obj, value) => { obj.locationId = value; } }, metadata: _metadata }, _locationId_initializers, _locationId_extraInitializers);
            __esDecorate(null, null, _incidentAt_decorators, { kind: "field", name: "incidentAt", static: false, private: false, access: { has: obj => "incidentAt" in obj, get: obj => obj.incidentAt, set: (obj, value) => { obj.incidentAt = value; } }, metadata: _metadata }, _incidentAt_initializers, _incidentAt_extraInitializers);
            __esDecorate(null, null, _date_decorators, { kind: "field", name: "date", static: false, private: false, access: { has: obj => "date" in obj, get: obj => obj.date, set: (obj, value) => { obj.date = value; } }, metadata: _metadata }, _date_initializers, _date_extraInitializers);
            __esDecorate(null, null, _responseAction_decorators, { kind: "field", name: "responseAction", static: false, private: false, access: { has: obj => "responseAction" in obj, get: obj => obj.responseAction, set: (obj, value) => { obj.responseAction = value; } }, metadata: _metadata }, _responseAction_initializers, _responseAction_extraInitializers);
            __esDecorate(null, null, _witnessPresent_decorators, { kind: "field", name: "witnessPresent", static: false, private: false, access: { has: obj => "witnessPresent" in obj, get: obj => obj.witnessPresent, set: (obj, value) => { obj.witnessPresent = value; } }, metadata: _metadata }, _witnessPresent_initializers, _witnessPresent_extraInitializers);
            __esDecorate(null, null, _lawEnforcementInvolved_decorators, { kind: "field", name: "lawEnforcementInvolved", static: false, private: false, access: { has: obj => "lawEnforcementInvolved" in obj, get: obj => obj.lawEnforcementInvolved, set: (obj, value) => { obj.lawEnforcementInvolved = value; } }, metadata: _metadata }, _lawEnforcementInvolved_initializers, _lawEnforcementInvolved_extraInitializers);
            __esDecorate(null, null, _evidenceCollected_decorators, { kind: "field", name: "evidenceCollected", static: false, private: false, access: { has: obj => "evidenceCollected" in obj, get: obj => obj.evidenceCollected, set: (obj, value) => { obj.evidenceCollected = value; } }, metadata: _metadata }, _evidenceCollected_initializers, _evidenceCollected_extraInitializers);
            __esDecorate(null, null, _reportingOfficerEmployeeId_decorators, { kind: "field", name: "reportingOfficerEmployeeId", static: false, private: false, access: { has: obj => "reportingOfficerEmployeeId" in obj, get: obj => obj.reportingOfficerEmployeeId, set: (obj, value) => { obj.reportingOfficerEmployeeId = value; } }, metadata: _metadata }, _reportingOfficerEmployeeId_initializers, _reportingOfficerEmployeeId_extraInitializers);
            __esDecorate(null, null, _assignedSupervisorId_decorators, { kind: "field", name: "assignedSupervisorId", static: false, private: false, access: { has: obj => "assignedSupervisorId" in obj, get: obj => obj.assignedSupervisorId, set: (obj, value) => { obj.assignedSupervisorId = value; } }, metadata: _metadata }, _assignedSupervisorId_initializers, _assignedSupervisorId_extraInitializers);
            __esDecorate(null, null, _persons_decorators, { kind: "field", name: "persons", static: false, private: false, access: { has: obj => "persons" in obj, get: obj => obj.persons, set: (obj, value) => { obj.persons = value; } }, metadata: _metadata }, _persons_initializers, _persons_extraInitializers);
            __esDecorate(null, null, _images_decorators, { kind: "field", name: "images", static: false, private: false, access: { has: obj => "images" in obj, get: obj => obj.images, set: (obj, value) => { obj.images = value; } }, metadata: _metadata }, _images_initializers, _images_extraInitializers);
            __esDecorate(null, null, _deviceInfo_decorators, { kind: "field", name: "deviceInfo", static: false, private: false, access: { has: obj => "deviceInfo" in obj, get: obj => obj.deviceInfo, set: (obj, value) => { obj.deviceInfo = value; } }, metadata: _metadata }, _deviceInfo_initializers, _deviceInfo_extraInitializers);
            __esDecorate(null, null, _geoLat_decorators, { kind: "field", name: "geoLat", static: false, private: false, access: { has: obj => "geoLat" in obj, get: obj => obj.geoLat, set: (obj, value) => { obj.geoLat = value; } }, metadata: _metadata }, _geoLat_initializers, _geoLat_extraInitializers);
            __esDecorate(null, null, _geoLng_decorators, { kind: "field", name: "geoLng", static: false, private: false, access: { has: obj => "geoLng" in obj, get: obj => obj.geoLng, set: (obj, value) => { obj.geoLng = value; } }, metadata: _metadata }, _geoLng_initializers, _geoLng_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.CreateIncidentReportDto = CreateIncidentReportDto;
