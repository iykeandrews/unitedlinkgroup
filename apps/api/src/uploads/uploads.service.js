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
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let UploadsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var UploadsService = _classThis = class {
        constructor() {
            this.s3 = null;
            this.bucket = process.env.AWS_S3_BUCKET || '';
            this.region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '';
            this.provider = (process.env.UPLOADS_PROVIDER || '').toLowerCase();
        }
        resolveProvider() {
            if (this.provider === 's3')
                return 's3';
            if (this.provider === 'local')
                return 'local';
            if (this.bucket)
                return 's3';
            return 'local';
        }
        ensureS3() {
            if (this.s3)
                return this.s3;
            if (!this.bucket)
                throw new common_1.BadRequestException('AWS_S3_BUCKET is not configured');
            if (!this.region)
                throw new common_1.BadRequestException('AWS_REGION is not configured');
            this.s3 = new client_s3_1.S3Client({ region: this.region });
            return this.s3;
        }
        uploadsDir() {
            return path.join(process.cwd(), 'apps/api/uploads');
        }
        ensureUploadsDir() {
            const dir = this.uploadsDir();
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            return dir;
        }
        extFromName(originalName) {
            const ext = path.extname(originalName || '').slice(0, 16);
            if (!ext)
                return '';
            if (!ext.startsWith('.'))
                return '';
            return ext.replace(/[^a-zA-Z0-9.]/g, '');
        }
        makeKey(prefix, originalName) {
            const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
            const ext = this.extFromName(originalName);
            const safePrefix = (prefix || 'file').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'file';
            return `${safePrefix}-${unique}${ext}`;
        }
        async uploadBuffer(input) {
            if (!(input === null || input === void 0 ? void 0 : input.buffer) || !Buffer.isBuffer(input.buffer) || input.buffer.length === 0) {
                throw new common_1.BadRequestException('File is required');
            }
            const key = this.makeKey(input.prefix, input.originalName);
            const provider = this.resolveProvider();
            if (provider === 's3') {
                const s3 = this.ensureS3();
                await s3.send(new client_s3_1.PutObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                    Body: input.buffer,
                    ContentType: input.mimeType || undefined,
                }));
            }
            else {
                const dir = this.ensureUploadsDir();
                fs.writeFileSync(path.join(dir, key), input.buffer);
            }
            return {
                key,
                url: `/uploads/${key}`,
                originalName: input.originalName,
                mimeType: input.mimeType || null,
                size: input.buffer.length,
            };
        }
        isS3Enabled() {
            return this.resolveProvider() === 's3';
        }
        async getSignedDownloadUrl(key, expiresSeconds = 60) {
            const safeKey = path.basename(key);
            if (!safeKey)
                throw new common_1.BadRequestException('File not found');
            const s3 = this.ensureS3();
            return (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: safeKey,
            }), { expiresIn: expiresSeconds });
        }
        getLocalFilePath(key) {
            const safeKey = path.basename(key);
            return path.join(this.uploadsDir(), safeKey);
        }
    };
    __setFunctionName(_classThis, "UploadsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UploadsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UploadsService = _classThis;
})();
exports.UploadsService = UploadsService;
