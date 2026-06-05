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
exports.UpdateBusinessDto = void 0;
const class_validator_1 = require("class-validator");
let UpdateBusinessDto = (() => {
    var _a;
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _ein_decorators;
    let _ein_initializers = [];
    let _ein_extraInitializers = [];
    let _mobile_decorators;
    let _mobile_initializers = [];
    let _mobile_extraInitializers = [];
    let _country_decorators;
    let _country_initializers = [];
    let _country_extraInitializers = [];
    let _businessType_decorators;
    let _businessType_initializers = [];
    let _businessType_extraInitializers = [];
    let _industry_decorators;
    let _industry_initializers = [];
    let _industry_extraInitializers = [];
    let _employeeCount_decorators;
    let _employeeCount_initializers = [];
    let _employeeCount_extraInitializers = [];
    let _currencyCode_decorators;
    let _currencyCode_initializers = [];
    let _currencyCode_extraInitializers = [];
    let _address_decorators;
    let _address_initializers = [];
    let _address_extraInitializers = [];
    let _city_decorators;
    let _city_initializers = [];
    let _city_extraInitializers = [];
    let _state_decorators;
    let _state_initializers = [];
    let _state_extraInitializers = [];
    let _zip_decorators;
    let _zip_initializers = [];
    let _zip_extraInitializers = [];
    let _modules_decorators;
    let _modules_initializers = [];
    let _modules_extraInitializers = [];
    let _logoUrl_decorators;
    let _logoUrl_initializers = [];
    let _logoUrl_extraInitializers = [];
    let _settings_decorators;
    let _settings_initializers = [];
    let _settings_extraInitializers = [];
    return _a = class UpdateBusinessDto {
            constructor() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.ein = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _ein_initializers, void 0));
                this.mobile = (__runInitializers(this, _ein_extraInitializers), __runInitializers(this, _mobile_initializers, void 0));
                this.country = (__runInitializers(this, _mobile_extraInitializers), __runInitializers(this, _country_initializers, void 0));
                this.businessType = (__runInitializers(this, _country_extraInitializers), __runInitializers(this, _businessType_initializers, void 0));
                this.industry = (__runInitializers(this, _businessType_extraInitializers), __runInitializers(this, _industry_initializers, void 0));
                this.employeeCount = (__runInitializers(this, _industry_extraInitializers), __runInitializers(this, _employeeCount_initializers, void 0));
                this.currencyCode = (__runInitializers(this, _employeeCount_extraInitializers), __runInitializers(this, _currencyCode_initializers, void 0));
                this.address = (__runInitializers(this, _currencyCode_extraInitializers), __runInitializers(this, _address_initializers, void 0));
                this.city = (__runInitializers(this, _address_extraInitializers), __runInitializers(this, _city_initializers, void 0));
                this.state = (__runInitializers(this, _city_extraInitializers), __runInitializers(this, _state_initializers, void 0));
                this.zip = (__runInitializers(this, _state_extraInitializers), __runInitializers(this, _zip_initializers, void 0));
                this.modules = (__runInitializers(this, _zip_extraInitializers), __runInitializers(this, _modules_initializers, void 0));
                this.logoUrl = (__runInitializers(this, _modules_extraInitializers), __runInitializers(this, _logoUrl_initializers, void 0));
                this.settings = (__runInitializers(this, _logoUrl_extraInitializers), __runInitializers(this, _settings_initializers, void 0));
                __runInitializers(this, _settings_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _ein_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _mobile_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _country_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _businessType_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _industry_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _employeeCount_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _currencyCode_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _address_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _city_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _state_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _zip_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _modules_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _logoUrl_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _settings_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _ein_decorators, { kind: "field", name: "ein", static: false, private: false, access: { has: obj => "ein" in obj, get: obj => obj.ein, set: (obj, value) => { obj.ein = value; } }, metadata: _metadata }, _ein_initializers, _ein_extraInitializers);
            __esDecorate(null, null, _mobile_decorators, { kind: "field", name: "mobile", static: false, private: false, access: { has: obj => "mobile" in obj, get: obj => obj.mobile, set: (obj, value) => { obj.mobile = value; } }, metadata: _metadata }, _mobile_initializers, _mobile_extraInitializers);
            __esDecorate(null, null, _country_decorators, { kind: "field", name: "country", static: false, private: false, access: { has: obj => "country" in obj, get: obj => obj.country, set: (obj, value) => { obj.country = value; } }, metadata: _metadata }, _country_initializers, _country_extraInitializers);
            __esDecorate(null, null, _businessType_decorators, { kind: "field", name: "businessType", static: false, private: false, access: { has: obj => "businessType" in obj, get: obj => obj.businessType, set: (obj, value) => { obj.businessType = value; } }, metadata: _metadata }, _businessType_initializers, _businessType_extraInitializers);
            __esDecorate(null, null, _industry_decorators, { kind: "field", name: "industry", static: false, private: false, access: { has: obj => "industry" in obj, get: obj => obj.industry, set: (obj, value) => { obj.industry = value; } }, metadata: _metadata }, _industry_initializers, _industry_extraInitializers);
            __esDecorate(null, null, _employeeCount_decorators, { kind: "field", name: "employeeCount", static: false, private: false, access: { has: obj => "employeeCount" in obj, get: obj => obj.employeeCount, set: (obj, value) => { obj.employeeCount = value; } }, metadata: _metadata }, _employeeCount_initializers, _employeeCount_extraInitializers);
            __esDecorate(null, null, _currencyCode_decorators, { kind: "field", name: "currencyCode", static: false, private: false, access: { has: obj => "currencyCode" in obj, get: obj => obj.currencyCode, set: (obj, value) => { obj.currencyCode = value; } }, metadata: _metadata }, _currencyCode_initializers, _currencyCode_extraInitializers);
            __esDecorate(null, null, _address_decorators, { kind: "field", name: "address", static: false, private: false, access: { has: obj => "address" in obj, get: obj => obj.address, set: (obj, value) => { obj.address = value; } }, metadata: _metadata }, _address_initializers, _address_extraInitializers);
            __esDecorate(null, null, _city_decorators, { kind: "field", name: "city", static: false, private: false, access: { has: obj => "city" in obj, get: obj => obj.city, set: (obj, value) => { obj.city = value; } }, metadata: _metadata }, _city_initializers, _city_extraInitializers);
            __esDecorate(null, null, _state_decorators, { kind: "field", name: "state", static: false, private: false, access: { has: obj => "state" in obj, get: obj => obj.state, set: (obj, value) => { obj.state = value; } }, metadata: _metadata }, _state_initializers, _state_extraInitializers);
            __esDecorate(null, null, _zip_decorators, { kind: "field", name: "zip", static: false, private: false, access: { has: obj => "zip" in obj, get: obj => obj.zip, set: (obj, value) => { obj.zip = value; } }, metadata: _metadata }, _zip_initializers, _zip_extraInitializers);
            __esDecorate(null, null, _modules_decorators, { kind: "field", name: "modules", static: false, private: false, access: { has: obj => "modules" in obj, get: obj => obj.modules, set: (obj, value) => { obj.modules = value; } }, metadata: _metadata }, _modules_initializers, _modules_extraInitializers);
            __esDecorate(null, null, _logoUrl_decorators, { kind: "field", name: "logoUrl", static: false, private: false, access: { has: obj => "logoUrl" in obj, get: obj => obj.logoUrl, set: (obj, value) => { obj.logoUrl = value; } }, metadata: _metadata }, _logoUrl_initializers, _logoUrl_extraInitializers);
            __esDecorate(null, null, _settings_decorators, { kind: "field", name: "settings", static: false, private: false, access: { has: obj => "settings" in obj, get: obj => obj.settings, set: (obj, value) => { obj.settings = value; } }, metadata: _metadata }, _settings_initializers, _settings_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.UpdateBusinessDto = UpdateBusinessDto;
