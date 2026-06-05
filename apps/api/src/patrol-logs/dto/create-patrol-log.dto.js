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
exports.CreatePatrolLogDto = void 0;
const class_validator_1 = require("class-validator");
let CreatePatrolLogDto = (() => {
    var _a;
    let _servicePinId_decorators;
    let _servicePinId_initializers = [];
    let _servicePinId_extraInitializers = [];
    let _message_decorators;
    let _message_initializers = [];
    let _message_extraInitializers = [];
    let _type_decorators;
    let _type_initializers = [];
    let _type_extraInitializers = [];
    let _geoLat_decorators;
    let _geoLat_initializers = [];
    let _geoLat_extraInitializers = [];
    let _geoLng_decorators;
    let _geoLng_initializers = [];
    let _geoLng_extraInitializers = [];
    let _imageUrl_decorators;
    let _imageUrl_initializers = [];
    let _imageUrl_extraInitializers = [];
    return _a = class CreatePatrolLogDto {
            constructor() {
                this.servicePinId = __runInitializers(this, _servicePinId_initializers, void 0);
                this.message = (__runInitializers(this, _servicePinId_extraInitializers), __runInitializers(this, _message_initializers, void 0));
                this.type = (__runInitializers(this, _message_extraInitializers), __runInitializers(this, _type_initializers, void 0));
                this.geoLat = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _geoLat_initializers, void 0));
                this.geoLng = (__runInitializers(this, _geoLat_extraInitializers), __runInitializers(this, _geoLng_initializers, void 0));
                this.imageUrl = (__runInitializers(this, _geoLng_extraInitializers), __runInitializers(this, _imageUrl_initializers, void 0));
                __runInitializers(this, _imageUrl_extraInitializers);
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _servicePinId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            _message_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            _type_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _geoLat_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            _geoLng_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.IsOptional)()];
            _imageUrl_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _servicePinId_decorators, { kind: "field", name: "servicePinId", static: false, private: false, access: { has: obj => "servicePinId" in obj, get: obj => obj.servicePinId, set: (obj, value) => { obj.servicePinId = value; } }, metadata: _metadata }, _servicePinId_initializers, _servicePinId_extraInitializers);
            __esDecorate(null, null, _message_decorators, { kind: "field", name: "message", static: false, private: false, access: { has: obj => "message" in obj, get: obj => obj.message, set: (obj, value) => { obj.message = value; } }, metadata: _metadata }, _message_initializers, _message_extraInitializers);
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: obj => "type" in obj, get: obj => obj.type, set: (obj, value) => { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _geoLat_decorators, { kind: "field", name: "geoLat", static: false, private: false, access: { has: obj => "geoLat" in obj, get: obj => obj.geoLat, set: (obj, value) => { obj.geoLat = value; } }, metadata: _metadata }, _geoLat_initializers, _geoLat_extraInitializers);
            __esDecorate(null, null, _geoLng_decorators, { kind: "field", name: "geoLng", static: false, private: false, access: { has: obj => "geoLng" in obj, get: obj => obj.geoLng, set: (obj, value) => { obj.geoLng = value; } }, metadata: _metadata }, _geoLng_initializers, _geoLng_extraInitializers);
            __esDecorate(null, null, _imageUrl_decorators, { kind: "field", name: "imageUrl", static: false, private: false, access: { has: obj => "imageUrl" in obj, get: obj => obj.imageUrl, set: (obj, value) => { obj.imageUrl = value; } }, metadata: _metadata }, _imageUrl_initializers, _imageUrl_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
})();
exports.CreatePatrolLogDto = CreatePatrolLogDto;
