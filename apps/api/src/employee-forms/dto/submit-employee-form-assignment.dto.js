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
exports.SubmitEmployeeFormAssignmentDto = void 0;
const class_validator_1 = require("class-validator");
let SubmitEmployeeFormAssignmentDto = (() => {
    var _a;
    let _values_decorators;
    let _values_initializers = [];
    let _values_extraInitializers = [];
    let _signatureData_decorators;
    let _signatureData_initializers = [];
    let _signatureData_extraInitializers = [];
    let _signatureName_decorators;
    let _signatureName_initializers = [];
    let _signatureName_extraInitializers = [];
    return _a = class SubmitEmployeeFormAssignmentDto {
            constructor() {
                this.values = __runInitializers(this, _values_initializers, void 0);
                this.signatureData = (__runInitializers(this, _values_extraInitializers), __runInitializers(this, _signatureData_initializers, void 0));
                this.signatureName = (__runInitializers(this, _signatureData_extraInitializers), __runInitializers(this, _signatureName_initializers, void 0));
                __runInitializers(this, _signatureName_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _values_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _signatureData_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            _signatureName_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            __esDecorate(null, null, _values_decorators, { kind: "field", name: "values", static: false, private: false, access: { has: obj => "values" in obj, get: obj => obj.values, set: (obj, value) => { obj.values = value; } }, metadata: _metadata }, _values_initializers, _values_extraInitializers);
            __esDecorate(null, null, _signatureData_decorators, { kind: "field", name: "signatureData", static: false, private: false, access: { has: obj => "signatureData" in obj, get: obj => obj.signatureData, set: (obj, value) => { obj.signatureData = value; } }, metadata: _metadata }, _signatureData_initializers, _signatureData_extraInitializers);
            __esDecorate(null, null, _signatureName_decorators, { kind: "field", name: "signatureName", static: false, private: false, access: { has: obj => "signatureName" in obj, get: obj => obj.signatureName, set: (obj, value) => { obj.signatureName = value; } }, metadata: _metadata }, _signatureName_initializers, _signatureName_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.SubmitEmployeeFormAssignmentDto = SubmitEmployeeFormAssignmentDto;
