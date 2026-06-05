"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const multer_1 = require("multer");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const jwt_query_auth_guard_1 = require("../auth/jwt-query-auth.guard");
let UploadsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('uploads')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _uploadFile_decorators;
    let _uploadImage_decorators;
    let _uploadVideo_decorators;
    let _serveFile_decorators;
    var UploadsController = _classThis = class {
        constructor(uploadsService) {
            this.uploadsService = (__runInitializers(this, _instanceExtraInitializers), uploadsService);
        }
        async uploadFile(file) {
            if (!file)
                throw new common_1.BadRequestException('File is required');
            const uploaded = await this.uploadsService.uploadBuffer({
                buffer: file.buffer,
                originalName: file.originalname,
                mimeType: file.mimetype,
                prefix: 'file',
            });
            return { url: uploaded.url, filename: uploaded.key, originalName: uploaded.originalName };
        }
        async uploadImage(file) {
            if (!file)
                throw new common_1.BadRequestException('File is required');
            const uploaded = await this.uploadsService.uploadBuffer({
                buffer: file.buffer,
                originalName: file.originalname,
                mimeType: file.mimetype,
                prefix: 'img',
            });
            return {
                url: uploaded.url,
                filename: uploaded.key,
                originalName: uploaded.originalName,
                mimeType: uploaded.mimeType,
                size: uploaded.size,
            };
        }
        async uploadVideo(file) {
            if (!file)
                throw new common_1.BadRequestException('File is required');
            const uploaded = await this.uploadsService.uploadBuffer({
                buffer: file.buffer,
                originalName: file.originalname,
                mimeType: file.mimetype,
                prefix: 'vid',
            });
            return {
                url: uploaded.url,
                filename: uploaded.key,
                originalName: uploaded.originalName,
                mimeType: uploaded.mimeType,
                size: uploaded.size,
            };
        }
        async serveFile(filename, res) {
            // Prevent directory traversal
            const safeFilename = path.basename(filename);
            if (this.uploadsService.isS3Enabled()) {
                const url = await this.uploadsService.getSignedDownloadUrl(safeFilename, 60);
                return res.redirect(url);
            }
            const filePath = this.uploadsService.getLocalFilePath(safeFilename);
            if (!fs.existsSync(filePath)) {
                throw new common_1.BadRequestException('File not found');
            }
            return res.sendFile(filePath);
        }
    };
    __setFunctionName(_classThis, "UploadsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _uploadFile_decorators = [(0, common_1.Post)(), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
                storage: (0, multer_1.memoryStorage)(),
                limits: { fileSize: 25 * 1024 * 1024 }
            }))];
        _uploadImage_decorators = [(0, common_1.Post)('images'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
                storage: (0, multer_1.memoryStorage)(),
                fileFilter: (req, file, cb) => {
                    const ok = typeof file.mimetype === 'string' && file.mimetype.startsWith('image/');
                    cb(ok ? null : new common_1.BadRequestException('Only image uploads are allowed'), ok);
                },
                limits: { fileSize: 10 * 1024 * 1024 },
            }))];
        _uploadVideo_decorators = [(0, common_1.Post)('videos'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
                storage: (0, multer_1.memoryStorage)(),
                fileFilter: (req, file, cb) => {
                    const ok = typeof file.mimetype === 'string' && file.mimetype.startsWith('video/');
                    cb(ok ? null : new common_1.BadRequestException('Only video uploads are allowed'), ok);
                },
                limits: { fileSize: 50 * 1024 * 1024 },
            }))];
        _serveFile_decorators = [(0, common_1.Get)(':filename'), (0, common_1.UseGuards)(jwt_query_auth_guard_1.JwtQueryAuthGuard)];
        __esDecorate(_classThis, null, _uploadFile_decorators, { kind: "method", name: "uploadFile", static: false, private: false, access: { has: obj => "uploadFile" in obj, get: obj => obj.uploadFile }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadImage_decorators, { kind: "method", name: "uploadImage", static: false, private: false, access: { has: obj => "uploadImage" in obj, get: obj => obj.uploadImage }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadVideo_decorators, { kind: "method", name: "uploadVideo", static: false, private: false, access: { has: obj => "uploadVideo" in obj, get: obj => obj.uploadVideo }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _serveFile_decorators, { kind: "method", name: "serveFile", static: false, private: false, access: { has: obj => "serveFile" in obj, get: obj => obj.serveFile }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UploadsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UploadsController = _classThis;
})();
exports.UploadsController = UploadsController;
