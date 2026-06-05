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
exports.UpdateServicePinDto = void 0;
const class_validator_1 = require("class-validator");
let UpdateServicePinDto = (() => {
    var _a;
    let _positionType_decorators;
    let _positionType_initializers = [];
    let _positionType_extraInitializers = [];
    let _count_decorators;
    let _count_initializers = [];
    let _count_extraInitializers = [];
    let _shiftType_decorators;
    let _shiftType_initializers = [];
    let _shiftType_extraInitializers = [];
    let _startTime_decorators;
    let _startTime_initializers = [];
    let _startTime_extraInitializers = [];
    let _endTime_decorators;
    let _endTime_initializers = [];
    let _endTime_extraInitializers = [];
    let _days_decorators;
    let _days_initializers = [];
    let _days_extraInitializers = [];
    let _payRate_decorators;
    let _payRate_initializers = [];
    let _payRate_extraInitializers = [];
    let _specialInstructions_decorators;
    let _specialInstructions_initializers = [];
    let _specialInstructions_extraInitializers = [];
    let _geoLat_decorators;
    let _geoLat_initializers = [];
    let _geoLat_extraInitializers = [];
    let _geoLng_decorators;
    let _geoLng_initializers = [];
    let _geoLng_extraInitializers = [];
    let _status_decorators;
    let _status_initializers = [];
    let _status_extraInitializers = [];
    return _a = class UpdateServicePinDto {
            constructor() {
                this.positionType = __runInitializers(this, _positionType_initializers, void 0);
                this.count = (__runInitializers(this, _positionType_extraInitializers), __runInitializers(this, _count_initializers, void 0));
                this.shiftType = (__runInitializers(this, _count_extraInitializers), __runInitializers(this, _shiftType_initializers, void 0));
                this.startTime = (__runInitializers(this, _shiftType_extraInitializers), __runInitializers(this, _startTime_initializers, void 0));
                this.endTime = (__runInitializers(this, _startTime_extraInitializers), __runInitializers(this, _endTime_initializers, void 0));
                this.days = (__runInitializers(this, _endTime_extraInitializers), __runInitializers(this, _days_initializers, void 0));
                this.payRate = (__runInitializers(this, _days_extraInitializers), __runInitializers(this, _payRate_initializers, void 0));
                this.specialInstructions = (__runInitializers(this, _payRate_extraInitializers), __runInitializers(this, _specialInstructions_initializers, void 0));
                this.geoLat = (__runInitializers(this, _specialInstructions_extraInitializers), __runInitializers(this, _geoLat_initializers, void 0));
                this.geoLng = (__runInitializers(this, _geoLat_extraInitializers), __runInitializers(this, _geoLng_initializers, void 0));
                this.status = (__runInitializers(this, _geoLng_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                __runInitializers(this, _status_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _positionType_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _count_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _shiftType_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _startTime_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _endTime_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _days_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _payRate_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _specialInstructions_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _geoLat_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _geoLng_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _positionType_decorators, { kind: "field", name: "positionType", static: false, private: false, access: { has: obj => "positionType" in obj, get: obj => obj.positionType, set: (obj, value) => { obj.positionType = value; } }, metadata: _metadata }, _positionType_initializers, _positionType_extraInitializers);
            __esDecorate(null, null, _count_decorators, { kind: "field", name: "count", static: false, private: false, access: { has: obj => "count" in obj, get: obj => obj.count, set: (obj, value) => { obj.count = value; } }, metadata: _metadata }, _count_initializers, _count_extraInitializers);
            __esDecorate(null, null, _shiftType_decorators, { kind: "field", name: "shiftType", static: false, private: false, access: { has: obj => "shiftType" in obj, get: obj => obj.shiftType, set: (obj, value) => { obj.shiftType = value; } }, metadata: _metadata }, _shiftType_initializers, _shiftType_extraInitializers);
            __esDecorate(null, null, _startTime_decorators, { kind: "field", name: "startTime", static: false, private: false, access: { has: obj => "startTime" in obj, get: obj => obj.startTime, set: (obj, value) => { obj.startTime = value; } }, metadata: _metadata }, _startTime_initializers, _startTime_extraInitializers);
            __esDecorate(null, null, _endTime_decorators, { kind: "field", name: "endTime", static: false, private: false, access: { has: obj => "endTime" in obj, get: obj => obj.endTime, set: (obj, value) => { obj.endTime = value; } }, metadata: _metadata }, _endTime_initializers, _endTime_extraInitializers);
            __esDecorate(null, null, _days_decorators, { kind: "field", name: "days", static: false, private: false, access: { has: obj => "days" in obj, get: obj => obj.days, set: (obj, value) => { obj.days = value; } }, metadata: _metadata }, _days_initializers, _days_extraInitializers);
            __esDecorate(null, null, _payRate_decorators, { kind: "field", name: "payRate", static: false, private: false, access: { has: obj => "payRate" in obj, get: obj => obj.payRate, set: (obj, value) => { obj.payRate = value; } }, metadata: _metadata }, _payRate_initializers, _payRate_extraInitializers);
            __esDecorate(null, null, _specialInstructions_decorators, { kind: "field", name: "specialInstructions", static: false, private: false, access: { has: obj => "specialInstructions" in obj, get: obj => obj.specialInstructions, set: (obj, value) => { obj.specialInstructions = value; } }, metadata: _metadata }, _specialInstructions_initializers, _specialInstructions_extraInitializers);
            __esDecorate(null, null, _geoLat_decorators, { kind: "field", name: "geoLat", static: false, private: false, access: { has: obj => "geoLat" in obj, get: obj => obj.geoLat, set: (obj, value) => { obj.geoLat = value; } }, metadata: _metadata }, _geoLat_initializers, _geoLat_extraInitializers);
            __esDecorate(null, null, _geoLng_decorators, { kind: "field", name: "geoLng", static: false, private: false, access: { has: obj => "geoLng" in obj, get: obj => obj.geoLng, set: (obj, value) => { obj.geoLng = value; } }, metadata: _metadata }, _geoLng_initializers, _geoLng_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: obj => "status" in obj, get: obj => obj.status, set: (obj, value) => { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.UpdateServicePinDto = UpdateServicePinDto;
