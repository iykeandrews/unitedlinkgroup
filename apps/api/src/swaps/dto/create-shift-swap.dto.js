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
exports.CreateShiftSwapDto = void 0;
const class_validator_1 = require("class-validator");
let CreateShiftSwapDto = (() => {
    var _a;
    let _offeredShiftId_decorators;
    let _offeredShiftId_initializers = [];
    let _offeredShiftId_extraInitializers = [];
    let _requestedShiftId_decorators;
    let _requestedShiftId_initializers = [];
    let _requestedShiftId_extraInitializers = [];
    let _message_decorators;
    let _message_initializers = [];
    let _message_extraInitializers = [];
    let _requesterEmployeeId_decorators;
    let _requesterEmployeeId_initializers = [];
    let _requesterEmployeeId_extraInitializers = [];
    return _a = class CreateShiftSwapDto {
            constructor() {
                this.offeredShiftId = __runInitializers(this, _offeredShiftId_initializers, void 0);
                this.requestedShiftId = (__runInitializers(this, _offeredShiftId_extraInitializers), __runInitializers(this, _requestedShiftId_initializers, void 0));
                this.message = (__runInitializers(this, _requestedShiftId_extraInitializers), __runInitializers(this, _message_initializers, void 0));
                this.requesterEmployeeId = (__runInitializers(this, _message_extraInitializers), __runInitializers(this, _requesterEmployeeId_initializers, void 0));
                __runInitializers(this, _requesterEmployeeId_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _offeredShiftId_decorators = [(0, class_validator_1.IsUUID)()];
            _requestedShiftId_decorators = [(0, class_validator_1.IsUUID)()];
            _message_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500)];
            _requesterEmployeeId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsUUID)()];
            __esDecorate(null, null, _offeredShiftId_decorators, { kind: "field", name: "offeredShiftId", static: false, private: false, access: { has: obj => "offeredShiftId" in obj, get: obj => obj.offeredShiftId, set: (obj, value) => { obj.offeredShiftId = value; } }, metadata: _metadata }, _offeredShiftId_initializers, _offeredShiftId_extraInitializers);
            __esDecorate(null, null, _requestedShiftId_decorators, { kind: "field", name: "requestedShiftId", static: false, private: false, access: { has: obj => "requestedShiftId" in obj, get: obj => obj.requestedShiftId, set: (obj, value) => { obj.requestedShiftId = value; } }, metadata: _metadata }, _requestedShiftId_initializers, _requestedShiftId_extraInitializers);
            __esDecorate(null, null, _message_decorators, { kind: "field", name: "message", static: false, private: false, access: { has: obj => "message" in obj, get: obj => obj.message, set: (obj, value) => { obj.message = value; } }, metadata: _metadata }, _message_initializers, _message_extraInitializers);
            __esDecorate(null, null, _requesterEmployeeId_decorators, { kind: "field", name: "requesterEmployeeId", static: false, private: false, access: { has: obj => "requesterEmployeeId" in obj, get: obj => obj.requesterEmployeeId, set: (obj, value) => { obj.requesterEmployeeId = value; } }, metadata: _metadata }, _requesterEmployeeId_initializers, _requesterEmployeeId_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.CreateShiftSwapDto = CreateShiftSwapDto;
