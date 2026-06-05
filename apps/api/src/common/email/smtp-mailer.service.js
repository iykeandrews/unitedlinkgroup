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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmtpMailerService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer_1 = __importDefault(require("nodemailer"));
let SmtpMailerService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SmtpMailerService = _classThis = class {
        constructor() {
            this.transporter = null;
            this.verified = false;
        }
        getTransporter(authMethodOverride) {
            const host = process.env.INVOICE_SMTP_HOST || '';
            const port = parseInt(process.env.INVOICE_SMTP_PORT || '465', 10);
            const secure = String(process.env.INVOICE_SMTP_SECURE || 'true') === 'true';
            const user = process.env.INVOICE_SMTP_USER || '';
            const pass = process.env.INVOICE_SMTP_PASS || '';
            const authMethodFromEnv = (process.env.INVOICE_SMTP_AUTH_METHOD || '').trim() || undefined;
            const authMethod = authMethodOverride || authMethodFromEnv;
            const rejectUnauthorized = String(process.env.INVOICE_SMTP_TLS_REJECT_UNAUTHORIZED || 'true') === 'true';
            if (!host || !user || !pass) {
                const missing = [];
                if (!host)
                    missing.push('INVOICE_SMTP_HOST');
                if (!user)
                    missing.push('INVOICE_SMTP_USER');
                if (!pass)
                    missing.push('INVOICE_SMTP_PASS');
                throw new common_1.BadRequestException(`Invoice SMTP is not configured (missing: ${missing.join(', ')}). Set these in apps/api/.env and restart the API.`);
            }
            const transporter = nodemailer_1.default.createTransport({
                host,
                port,
                secure,
                auth: { user, pass },
                authMethod,
                tls: { rejectUnauthorized, servername: host },
            });
            return transporter;
        }
        async send(args) {
            const from = process.env.INVOICE_FROM || process.env.INVOICE_SMTP_USER || '';
            const replyTo = args.replyTo || process.env.INVOICE_REPLY_TO || undefined;
            if (!from) {
                throw new common_1.BadRequestException('Invoice sender is not configured (set INVOICE_FROM or INVOICE_SMTP_USER in apps/api/.env and restart the API)');
            }
            const sendMail = async (transporter) => {
                return transporter.sendMail({
                    from,
                    to: args.to,
                    cc: args.cc,
                    subject: args.subject,
                    text: args.text,
                    html: args.html,
                    replyTo,
                    attachments: (args.attachments || []).map((a) => ({
                        filename: a.filename,
                        content: a.content,
                        contentType: a.contentType,
                    })),
                });
            };
            if (!this.transporter) {
                this.transporter = this.getTransporter();
                this.verified = false;
            }
            if (!this.verified) {
                await this.transporter.verify();
                this.verified = true;
            }
            try {
                return await sendMail(this.transporter);
            }
            catch (e) {
                const code = (e === null || e === void 0 ? void 0 : e.code) ? String(e.code) : '';
                const cmd = (e === null || e === void 0 ? void 0 : e.command) ? String(e.command) : '';
                const authMethodFromEnv = (process.env.INVOICE_SMTP_AUTH_METHOD || '').trim() || '';
                if (code === 'EAUTH' && cmd.includes('AUTH PLAIN') && !authMethodFromEnv) {
                    const retryTransporter = this.getTransporter('LOGIN');
                    await retryTransporter.verify();
                    return await sendMail(retryTransporter);
                }
                throw e;
            }
        }
    };
    __setFunctionName(_classThis, "SmtpMailerService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SmtpMailerService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SmtpMailerService = _classThis;
})();
exports.SmtpMailerService = SmtpMailerService;
