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
exports.CreateEmployeeFormTemplateDto = void 0;
const class_validator_1 = require("class-validator");
let CreateEmployeeFormTemplateDto = (() => {
    var _a;
    let _businessId_decorators;
    let _businessId_initializers = [];
    let _businessId_extraInitializers = [];
    let _type_decorators;
    let _type_initializers = [];
    let _type_extraInitializers = [];
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _version_decorators;
    let _version_initializers = [];
    let _version_extraInitializers = [];
    let _body_decorators;
    let _body_initializers = [];
    let _body_extraInitializers = [];
    let _fields_decorators;
    let _fields_initializers = [];
    let _fields_extraInitializers = [];
    let _fileUrl_decorators;
    let _fileUrl_initializers = [];
    let _fileUrl_extraInitializers = [];
    let _acknowledgementRequired_decorators;
    let _acknowledgementRequired_initializers = [];
    let _acknowledgementRequired_extraInitializers = [];
    let _requiresSignature_decorators;
    let _requiresSignature_initializers = [];
    let _requiresSignature_extraInitializers = [];
    return _a = class CreateEmployeeFormTemplateDto {
            constructor() {
                this.businessId = __runInitializers(this, _businessId_initializers, void 0);
                this.type = (__runInitializers(this, _businessId_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.title = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _title_initializers, void 0));
                this.description = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.status = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.version = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _version_initializers, void 0));
                this.body = (__runInitializers(this, _version_extraInitializers), __runInitializers(this, _body_initializers, void 0));
                this.fields = (__runInitializers(this, _body_extraInitializers), __runInitializers(this, _fields_initializers, void 0));
                this.fileUrl = (__runInitializers(this, _fields_extraInitializers), __runInitializers(this, _fileUrl_initializers, void 0));
                this.acknowledgementRequired = (__runInitializers(this, _fileUrl_extraInitializers), __runInitializers(this, _acknowledgementRequired_initializers, void 0));
                this.requiresSignature = (__runInitializers(this, _acknowledgementRequired_extraInitializers), __runInitializers(this, _requiresSignature_initializers, void 0));
                __runInitializers(this, _requiresSignature_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _businessId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _type_decorators = [(0, class_validator_1.IsEnum)(['EMPLOYMENT_FORM', 'SOP']), (0, class_validator_1.IsOptional)()];
            _title_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            _description_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _status_decorators = [(0, class_validator_1.IsEnum)(['DRAFT', 'ACTIVE', 'ARCHIVED']), (0, class_validator_1.IsOptional)()];
            _version_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _body_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _fields_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _fileUrl_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _acknowledgementRequired_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _requiresSignature_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _businessId_decorators, { kind: "field", name: "businessId", static: false, private: false, access: { has: obj => "businessId" in obj, get: obj => obj.businessId, set: (obj, value) => { obj.businessId = value; } }, metadata: _metadata }, _businessId_initializers, _businessId_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: obj => "type" in obj, get: obj => obj.type, set: (obj, value) => { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _version_decorators, { kind: "field", name: "version", static: false, private: false, access: { has: obj => "version" in obj, get: obj => obj.version, set: (obj, value) => { obj.version = value; } }, metadata: _metadata }, _version_initializers, _version_extraInitializers);
            __esDecorate(null, null, _body_decorators, { kind: "field", name: "body", static: false, private: false, access: { has: obj => "body" in obj, get: obj => obj.body, set: (obj, value) => { obj.body = value; } }, metadata: _metadata }, _body_initializers, _body_extraInitializers);
            __esDecorate(null, null, _fields_decorators, { kind: "field", name: "fields", static: false, private: false, access: { has: obj => "fields" in obj, get: obj => obj.fields, set: (obj, value) => { obj.fields = value; } }, metadata: _metadata }, _fields_initializers, _fields_extraInitializers);
            __esDecorate(null, null, _fileUrl_decorators, { kind: "field", name: "fileUrl", static: false, private: false, access: { has: obj => "fileUrl" in obj, get: obj => obj.fileUrl, set: (obj, value) => { obj.fileUrl = value; } }, metadata: _metadata }, _fileUrl_initializers, _fileUrl_extraInitializers);
            __esDecorate(null, null, _acknowledgementRequired_decorators, { kind: "field", name: "acknowledgementRequired", static: false, private: false, access: { has: obj => "acknowledgementRequired" in obj, get: obj => obj.acknowledgementRequired, set: (obj, value) => { obj.acknowledgementRequired = value; } }, metadata: _metadata }, _acknowledgementRequired_initializers, _acknowledgementRequired_extraInitializers);
            __esDecorate(null, null, _requiresSignature_decorators, { kind: "field", name: "requiresSignature", static: false, private: false, access: { has: obj => "requiresSignature" in obj, get: obj => obj.requiresSignature, set: (obj, value) => { obj.requiresSignature = value; } }, metadata: _metadata }, _requiresSignature_initializers, _requiresSignature_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.CreateEmployeeFormTemplateDto = CreateEmployeeFormTemplateDto;
