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
exports.UpdateClientDto = void 0;
const class_validator_1 = require("class-validator");
let UpdateClientDto = (() => {
    var _a;
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _type_decorators;
    let _type_initializers = [];
    let _type_extraInitializers = [];
    let _industry_decorators;
    let _industry_initializers = [];
    let _industry_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    let _address_decorators;
    let _address_initializers = [];
    let _address_extraInitializers = [];
    let _street_decorators;
    let _street_initializers = [];
    let _street_extraInitializers = [];
    let _city_decorators;
    let _city_initializers = [];
    let _city_extraInitializers = [];
    let _state_decorators;
    let _state_initializers = [];
    let _state_extraInitializers = [];
    let _zip_decorators;
    let _zip_initializers = [];
    let _zip_extraInitializers = [];
    let _country_decorators;
    let _country_initializers = [];
    let _country_extraInitializers = [];
    let _contactPerson_decorators;
    let _contactPerson_initializers = [];
    let _contactPerson_extraInitializers = [];
    let _email_decorators;
    let _email_initializers = [];
    let _email_extraInitializers = [];
    let _phone_decorators;
    let _phone_initializers = [];
    let _phone_extraInitializers = [];
    let _alternateContact_decorators;
    let _alternateContact_initializers = [];
    let _alternateContact_extraInitializers = [];
    let _billingAddressSameAsOffice_decorators;
    let _billingAddressSameAsOffice_initializers = [];
    let _billingAddressSameAsOffice_extraInitializers = [];
    let _billingAddress_decorators;
    let _billingAddress_initializers = [];
    let _billingAddress_extraInitializers = [];
    let _billingContactEmail_decorators;
    let _billingContactEmail_initializers = [];
    let _billingContactEmail_extraInitializers = [];
    let _billingContactEmail2_decorators;
    let _billingContactEmail2_initializers = [];
    let _billingContactEmail2_extraInitializers = [];
    let _billingContactEmail3_decorators;
    let _billingContactEmail3_initializers = [];
    let _billingContactEmail3_extraInitializers = [];
    let _paymentTerms_decorators;
    let _paymentTerms_initializers = [];
    let _paymentTerms_extraInitializers = [];
    return _a = class UpdateClientDto {
            constructor() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.type = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.industry = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _industry_initializers, void 0));
                this.status = (__runInitializers(this, _industry_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.address = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _address_initializers, void 0));
                this.street = (__runInitializers(this, _address_extraInitializers), __runInitializers(this, _street_initializers, void 0));
                this.city = (__runInitializers(this, _street_extraInitializers), __runInitializers(this, _city_initializers, void 0));
                this.state = (__runInitializers(this, _city_extraInitializers), __runInitializers(this, _state_initializers, void 0));
                this.zip = (__runInitializers(this, _state_extraInitializers), __runInitializers(this, _zip_initializers, void 0));
                this.country = (__runInitializers(this, _zip_extraInitializers), __runInitializers(this, _country_initializers, void 0));
                this.contactPerson = (__runInitializers(this, _country_extraInitializers), __runInitializers(this, _contactPerson_initializers, void 0));
                this.email = (__runInitializers(this, _contactPerson_extraInitializers), __runInitializers(this, _email_initializers, void 0));
                this.phone = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _phone_initializers, void 0));
                this.alternateContact = (__runInitializers(this, _phone_extraInitializers), __runInitializers(this, _alternateContact_initializers, void 0));
                this.billingAddressSameAsOffice = (__runInitializers(this, _alternateContact_extraInitializers), __runInitializers(this, _billingAddressSameAsOffice_initializers, void 0));
                this.billingAddress = (__runInitializers(this, _billingAddressSameAsOffice_extraInitializers), __runInitializers(this, _billingAddress_initializers, void 0));
                this.billingContactEmail = (__runInitializers(this, _billingAddress_extraInitializers), __runInitializers(this, _billingContactEmail_initializers, void 0));
                this.billingContactEmail2 = (__runInitializers(this, _billingContactEmail_extraInitializers), __runInitializers(this, _billingContactEmail2_initializers, void 0));
                this.billingContactEmail3 = (__runInitializers(this, _billingContactEmail2_extraInitializers), __runInitializers(this, _billingContactEmail3_initializers, void 0));
                this.paymentTerms = (__runInitializers(this, _billingContactEmail3_extraInitializers), __runInitializers(this, _paymentTerms_initializers, void 0));
                __runInitializers(this, _paymentTerms_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _type_decorators = [(0, class_validator_1.IsEnum)(['CORPORATE', 'GOVERNMENT', 'INDIVIDUAL']), (0, class_validator_1.IsOptional)()];
            _industry_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _status_decorators = [(0, class_validator_1.IsEnum)(['ACTIVE', 'INACTIVE']), (0, class_validator_1.IsOptional)()];
            _address_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _street_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _city_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _state_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _zip_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _country_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _contactPerson_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _email_decorators = [(0, class_validator_1.IsEmail)(), (0, class_validator_1.IsOptional)()];
            _phone_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _alternateContact_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _billingAddressSameAsOffice_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _billingAddress_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _billingContactEmail_decorators = [(0, class_validator_1.IsEmail)(), (0, class_validator_1.IsOptional)()];
            _billingContactEmail2_decorators = [(0, class_validator_1.IsEmail)(), (0, class_validator_1.IsOptional)()];
            _billingContactEmail3_decorators = [(0, class_validator_1.IsEmail)(), (0, class_validator_1.IsOptional)()];
            _paymentTerms_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: obj => "type" in obj, get: obj => obj.type, set: (obj, value) => { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _industry_decorators, { kind: "field", name: "industry", static: false, private: false, access: { has: obj => "industry" in obj, get: obj => obj.industry, set: (obj, value) => { obj.industry = value; } }, metadata: _metadata }, _industry_initializers, _industry_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _address_decorators, { kind: "field", name: "address", static: false, private: false, access: { has: obj => "address" in obj, get: obj => obj.address, set: (obj, value) => { obj.address = value; } }, metadata: _metadata }, _address_initializers, _address_extraInitializers);
            __esDecorate(null, null, _street_decorators, { kind: "field", name: "street", static: false, private: false, access: { has: obj => "street" in obj, get: obj => obj.street, set: (obj, value) => { obj.street = value; } }, metadata: _metadata }, _street_initializers, _street_extraInitializers);
            __esDecorate(null, null, _city_decorators, { kind: "field", name: "city", static: false, private: false, access: { has: obj => "city" in obj, get: obj => obj.city, set: (obj, value) => { obj.city = value; } }, metadata: _metadata }, _city_initializers, _city_extraInitializers);
            __esDecorate(null, null, _state_decorators, { kind: "field", name: "state", static: false, private: false, access: { has: obj => "state" in obj, get: obj => obj.state, set: (obj, value) => { obj.state = value; } }, metadata: _metadata }, _state_initializers, _state_extraInitializers);
            __esDecorate(null, null, _zip_decorators, { kind: "field", name: "zip", static: false, private: false, access: { has: obj => "zip" in obj, get: obj => obj.zip, set: (obj, value) => { obj.zip = value; } }, metadata: _metadata }, _zip_initializers, _zip_extraInitializers);
            __esDecorate(null, null, _country_decorators, { kind: "field", name: "country", static: false, private: false, access: { has: obj => "country" in obj, get: obj => obj.country, set: (obj, value) => { obj.country = value; } }, metadata: _metadata }, _country_initializers, _country_extraInitializers);
            __esDecorate(null, null, _contactPerson_decorators, { kind: "field", name: "contactPerson", static: false, private: false, access: { has: obj => "contactPerson" in obj, get: obj => obj.contactPerson, set: (obj, value) => { obj.contactPerson = value; } }, metadata: _metadata }, _contactPerson_initializers, _contactPerson_extraInitializers);
            __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: obj => "email" in obj, get: obj => obj.email, set: (obj, value) => { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
            __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: obj => "phone" in obj, get: obj => obj.phone, set: (obj, value) => { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
            __esDecorate(null, null, _alternateContact_decorators, { kind: "field", name: "alternateContact", static: false, private: false, access: { has: obj => "alternateContact" in obj, get: obj => obj.alternateContact, set: (obj, value) => { obj.alternateContact = value; } }, metadata: _metadata }, _alternateContact_initializers, _alternateContact_extraInitializers);
            __esDecorate(null, null, _billingAddressSameAsOffice_decorators, { kind: "field", name: "billingAddressSameAsOffice", static: false, private: false, access: { has: obj => "billingAddressSameAsOffice" in obj, get: obj => obj.billingAddressSameAsOffice, set: (obj, value) => { obj.billingAddressSameAsOffice = value; } }, metadata: _metadata }, _billingAddressSameAsOffice_initializers, _billingAddressSameAsOffice_extraInitializers);
            __esDecorate(null, null, _billingAddress_decorators, { kind: "field", name: "billingAddress", static: false, private: false, access: { has: obj => "billingAddress" in obj, get: obj => obj.billingAddress, set: (obj, value) => { obj.billingAddress = value; } }, metadata: _metadata }, _billingAddress_initializers, _billingAddress_extraInitializers);
            __esDecorate(null, null, _billingContactEmail_decorators, { kind: "field", name: "billingContactEmail", static: false, private: false, access: { has: obj => "billingContactEmail" in obj, get: obj => obj.billingContactEmail, set: (obj, value) => { obj.billingContactEmail = value; } }, metadata: _metadata }, _billingContactEmail_initializers, _billingContactEmail_extraInitializers);
            __esDecorate(null, null, _billingContactEmail2_decorators, { kind: "field", name: "billingContactEmail2", static: false, private: false, access: { has: obj => "billingContactEmail2" in obj, get: obj => obj.billingContactEmail2, set: (obj, value) => { obj.billingContactEmail2 = value; } }, metadata: _metadata }, _billingContactEmail2_initializers, _billingContactEmail2_extraInitializers);
            __esDecorate(null, null, _billingContactEmail3_decorators, { kind: "field", name: "billingContactEmail3", static: false, private: false, access: { has: obj => "billingContactEmail3" in obj, get: obj => obj.billingContactEmail3, set: (obj, value) => { obj.billingContactEmail3 = value; } }, metadata: _metadata }, _billingContactEmail3_initializers, _billingContactEmail3_extraInitializers);
            __esDecorate(null, null, _paymentTerms_decorators, { kind: "field", name: "paymentTerms", static: false, private: false, access: { has: obj => "paymentTerms" in obj, get: obj => obj.paymentTerms, set: (obj, value) => { obj.paymentTerms = value; } }, metadata: _metadata }, _paymentTerms_initializers, _paymentTerms_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.UpdateClientDto = UpdateClientDto;
