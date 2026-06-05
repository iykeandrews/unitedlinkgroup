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
exports.UpdateLeaveTypeDto = void 0;
const class_validator_1 = require("class-validator");
let UpdateLeaveTypeDto = (() => {
    var _a;
    let _name_decorators;
    let _name_initializers = [];
    let _name_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _isPaid_decorators;
    let _isPaid_initializers = [];
    let _isPaid_extraInitializers = [];
    let _allowNegativeBalance_decorators;
    let _allowNegativeBalance_initializers = [];
    let _allowNegativeBalance_extraInitializers = [];
    let _requiresApproval_decorators;
    let _requiresApproval_initializers = [];
    let _requiresApproval_extraInitializers = [];
    let _color_decorators;
    let _color_initializers = [];
    let _color_extraInitializers = [];
    let _accrualFrequency_decorators;
    let _accrualFrequency_initializers = [];
    let _accrualFrequency_extraInitializers = [];
    let _accrualRate_decorators;
    let _accrualRate_initializers = [];
    let _accrualRate_extraInitializers = [];
    let _maxBalance_decorators;
    let _maxBalance_initializers = [];
    let _maxBalance_extraInitializers = [];
    let _carryOverLimit_decorators;
    let _carryOverLimit_initializers = [];
    let _carryOverLimit_extraInitializers = [];
    return _a = class UpdateLeaveTypeDto {
            constructor() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.description = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.isPaid = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _isPaid_initializers, void 0));
                this.allowNegativeBalance = (__runInitializers(this, _isPaid_extraInitializers), __runInitializers(this, _allowNegativeBalance_initializers, void 0));
                this.requiresApproval = (__runInitializers(this, _allowNegativeBalance_extraInitializers), __runInitializers(this, _requiresApproval_initializers, void 0));
                this.color = (__runInitializers(this, _requiresApproval_extraInitializers), __runInitializers(this, _color_initializers, void 0));
                this.accrualFrequency = (__runInitializers(this, _color_extraInitializers), __runInitializers(this, _accrualFrequency_initializers, void 0));
                this.accrualRate = (__runInitializers(this, _accrualFrequency_extraInitializers), __runInitializers(this, _accrualRate_initializers, void 0));
                this.maxBalance = (__runInitializers(this, _accrualRate_extraInitializers), __runInitializers(this, _maxBalance_initializers, void 0));
                this.carryOverLimit = (__runInitializers(this, _maxBalance_extraInitializers), __runInitializers(this, _carryOverLimit_initializers, void 0));
                __runInitializers(this, _carryOverLimit_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _description_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _isPaid_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _allowNegativeBalance_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _requiresApproval_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _color_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _accrualFrequency_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _accrualRate_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            _maxBalance_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            _carryOverLimit_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: obj => "name" in obj, get: obj => obj.name, set: (obj, value) => { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _isPaid_decorators, { kind: "field", name: "isPaid", static: false, private: false, access: { has: obj => "isPaid" in obj, get: obj => obj.isPaid, set: (obj, value) => { obj.isPaid = value; } }, metadata: _metadata }, _isPaid_initializers, _isPaid_extraInitializers);
            __esDecorate(null, null, _allowNegativeBalance_decorators, { kind: "field", name: "allowNegativeBalance", static: false, private: false, access: { has: obj => "allowNegativeBalance" in obj, get: obj => obj.allowNegativeBalance, set: (obj, value) => { obj.allowNegativeBalance = value; } }, metadata: _metadata }, _allowNegativeBalance_initializers, _allowNegativeBalance_extraInitializers);
            __esDecorate(null, null, _requiresApproval_decorators, { kind: "field", name: "requiresApproval", static: false, private: false, access: { has: obj => "requiresApproval" in obj, get: obj => obj.requiresApproval, set: (obj, value) => { obj.requiresApproval = value; } }, metadata: _metadata }, _requiresApproval_initializers, _requiresApproval_extraInitializers);
            __esDecorate(null, null, _color_decorators, { kind: "field", name: "color", static: false, private: false, access: { has: obj => "color" in obj, get: obj => obj.color, set: (obj, value) => { obj.color = value; } }, metadata: _metadata }, _color_initializers, _color_extraInitializers);
            __esDecorate(null, null, _accrualFrequency_decorators, { kind: "field", name: "accrualFrequency", static: false, private: false, access: { has: obj => "accrualFrequency" in obj, get: obj => obj.accrualFrequency, set: (obj, value) => { obj.accrualFrequency = value; } }, metadata: _metadata }, _accrualFrequency_initializers, _accrualFrequency_extraInitializers);
            __esDecorate(null, null, _accrualRate_decorators, { kind: "field", name: "accrualRate", static: false, private: false, access: { has: obj => "accrualRate" in obj, get: obj => obj.accrualRate, set: (obj, value) => { obj.accrualRate = value; } }, metadata: _metadata }, _accrualRate_initializers, _accrualRate_extraInitializers);
            __esDecorate(null, null, _maxBalance_decorators, { kind: "field", name: "maxBalance", static: false, private: false, access: { has: obj => "maxBalance" in obj, get: obj => obj.maxBalance, set: (obj, value) => { obj.maxBalance = value; } }, metadata: _metadata }, _maxBalance_initializers, _maxBalance_extraInitializers);
            __esDecorate(null, null, _carryOverLimit_decorators, { kind: "field", name: "carryOverLimit", static: false, private: false, access: { has: obj => "carryOverLimit" in obj, get: obj => obj.carryOverLimit, set: (obj, value) => { obj.carryOverLimit = value; } }, metadata: _metadata }, _carryOverLimit_initializers, _carryOverLimit_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.UpdateLeaveTypeDto = UpdateLeaveTypeDto;
