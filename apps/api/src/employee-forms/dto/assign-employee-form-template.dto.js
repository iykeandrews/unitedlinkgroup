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
exports.AssignEmployeeFormTemplateDto = void 0;
const class_validator_1 = require("class-validator");
let AssignEmployeeFormTemplateDto = (() => {
    var _a;
    let _employeeIds_decorators;
    let _employeeIds_initializers = [];
    let _employeeIds_extraInitializers = [];
    let _assignAll_decorators;
    let _assignAll_initializers = [];
    let _assignAll_extraInitializers = [];
    let _dueAt_decorators;
    let _dueAt_initializers = [];
    let _dueAt_extraInitializers = [];
    return _a = class AssignEmployeeFormTemplateDto {
            constructor() {
                this.employeeIds = __runInitializers(this, _employeeIds_initializers, void 0);
                this.assignAll = (__runInitializers(this, _employeeIds_extraInitializers), __runInitializers(this, _assignAll_initializers, void 0));
                this.dueAt = (__runInitializers(this, _assignAll_extraInitializers), __runInitializers(this, _dueAt_initializers, void 0));
                __runInitializers(this, _dueAt_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _employeeIds_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsOptional)()];
            _assignAll_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _dueAt_decorators = [(0, class_validator_1.IsDateString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _employeeIds_decorators, { kind: "field", name: "employeeIds", static: false, private: false, access: { has: obj => "employeeIds" in obj, get: obj => obj.employeeIds, set: (obj, value) => { obj.employeeIds = value; } }, metadata: _metadata }, _employeeIds_initializers, _employeeIds_extraInitializers);
            __esDecorate(null, null, _assignAll_decorators, { kind: "field", name: "assignAll", static: false, private: false, access: { has: obj => "assignAll" in obj, get: obj => obj.assignAll, set: (obj, value) => { obj.assignAll = value; } }, metadata: _metadata }, _assignAll_initializers, _assignAll_extraInitializers);
            __esDecorate(null, null, _dueAt_decorators, { kind: "field", name: "dueAt", static: false, private: false, access: { has: obj => "dueAt" in obj, get: obj => obj.dueAt, set: (obj, value) => { obj.dueAt = value; } }, metadata: _metadata }, _dueAt_initializers, _dueAt_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.AssignEmployeeFormTemplateDto = AssignEmployeeFormTemplateDto;
