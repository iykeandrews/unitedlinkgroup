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
exports.ResumeLeaveRequestDto = void 0;
const class_validator_1 = require("class-validator");
let ResumeLeaveRequestDto = (() => {
    var _a;
    let _resumedAt_decorators;
    let _resumedAt_initializers = [];
    let _resumedAt_extraInitializers = [];
    let _resumedReason_decorators;
    let _resumedReason_initializers = [];
    let _resumedReason_extraInitializers = [];
    let _resumedTime_decorators;
    let _resumedTime_initializers = [];
    let _resumedTime_extraInitializers = [];
    return _a = class ResumeLeaveRequestDto {
            constructor() {
                this.resumedAt = __runInitializers(this, _resumedAt_initializers, void 0);
                this.resumedReason = (__runInitializers(this, _resumedAt_extraInitializers), __runInitializers(this, _resumedReason_initializers, void 0));
                this.resumedTime = (__runInitializers(this, _resumedReason_extraInitializers), __runInitializers(this, _resumedTime_initializers, void 0));
                __runInitializers(this, _resumedTime_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _resumedAt_decorators = [(0, class_validator_1.IsDateString)(), (0, class_validator_1.IsNotEmpty)()];
            _resumedReason_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)(), (0, class_validator_1.MaxLength)(500)];
            _resumedTime_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(120)];
            __esDecorate(null, null, _resumedAt_decorators, { kind: "field", name: "resumedAt", static: false, private: false, access: { has: obj => "resumedAt" in obj, get: obj => obj.resumedAt, set: (obj, value) => { obj.resumedAt = value; } }, metadata: _metadata }, _resumedAt_initializers, _resumedAt_extraInitializers);
            __esDecorate(null, null, _resumedReason_decorators, { kind: "field", name: "resumedReason", static: false, private: false, access: { has: obj => "resumedReason" in obj, get: obj => obj.resumedReason, set: (obj, value) => { obj.resumedReason = value; } }, metadata: _metadata }, _resumedReason_initializers, _resumedReason_extraInitializers);
            __esDecorate(null, null, _resumedTime_decorators, { kind: "field", name: "resumedTime", static: false, private: false, access: { has: obj => "resumedTime" in obj, get: obj => obj.resumedTime, set: (obj, value) => { obj.resumedTime = value; } }, metadata: _metadata }, _resumedTime_initializers, _resumedTime_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.ResumeLeaveRequestDto = ResumeLeaveRequestDto;
