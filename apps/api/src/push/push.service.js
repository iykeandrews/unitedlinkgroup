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
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
const web_push_1 = __importDefault(require("web-push"));
const axios_1 = __importDefault(require("axios"));
let PushService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PushService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
            this.logger = new common_1.Logger(PushService.name);
            const publicKey = process.env.VAPID_PUBLIC_KEY;
            const privateKey = process.env.VAPID_PRIVATE_KEY;
            const mailto = process.env.VAPID_MAILTO || 'mailto:notifications@unitedlinkgroup.local';
            if (publicKey && privateKey) {
                web_push_1.default.setVapidDetails(mailto, publicKey, privateKey);
            }
        }
        registerWeb(userId, subscription) {
            const sub = subscription;
            const endpoint = sub === null || sub === void 0 ? void 0 : sub.endpoint;
            const keys = (sub === null || sub === void 0 ? void 0 : sub.keys) || {};
            const p256dh = keys.p256dh || (sub === null || sub === void 0 ? void 0 : sub.p256dh);
            const auth = keys.auth || (sub === null || sub === void 0 ? void 0 : sub.auth);
            if (!endpoint || !p256dh || !auth) {
                return Promise.resolve();
            }
            return this.prisma.webPushSubscription.upsert({
                where: { endpoint },
                update: { userId, p256dh, auth, lastUsedAt: new Date() },
                create: { userId, endpoint, p256dh, auth, lastUsedAt: new Date() },
            }).then(() => undefined);
        }
        unregisterWeb(userId) {
            return this.prisma.webPushSubscription.deleteMany({ where: { userId } }).then(() => undefined);
        }
        registerExpo(userId, token) {
            return this.prisma.expoPushToken.upsert({
                where: { token },
                update: { userId, lastUsedAt: new Date() },
                create: { userId, token, lastUsedAt: new Date() },
            }).then(() => undefined);
        }
        unregisterExpo(userId) {
            return this.prisma.expoPushToken.deleteMany({ where: { userId } }).then(() => undefined);
        }
        async send(userId, payload) {
            const iconUrl = payload.iconUrl || this.iconForType(payload.type);
            // Send browser push via Web Push if configured and subscription exists
            if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                const subs = await this.prisma.webPushSubscription.findMany({ where: { userId } });
                for (const s of subs) {
                    try {
                        const pushSub = {
                            endpoint: s.endpoint,
                            keys: { p256dh: s.p256dh, auth: s.auth },
                        };
                        const webPayload = {
                            title: payload.title,
                            body: payload.message,
                            icon: iconUrl,
                            data: { ...payload.metadata, actionUrl: payload.actionUrl },
                            tag: this.makeTag(payload),
                        };
                        await web_push_1.default.sendNotification(pushSub, JSON.stringify(webPayload));
                        await this.prisma.webPushSubscription.update({ where: { endpoint: s.endpoint }, data: { lastUsedAt: new Date() } });
                    }
                    catch (err) {
                        this.logger.warn(`Web push failed for user ${userId}: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}`);
                    }
                }
            }
            // Send native push via Expo if token exists
            const expoTokens = await this.prisma.expoPushToken.findMany({ where: { userId } });
            for (const t of expoTokens) {
                try {
                    await axios_1.default.post('https://exp.host/--/api/v2/push/send', {
                        to: t.token,
                        title: payload.title,
                        body: payload.message,
                        sound: 'default',
                        data: { ...payload.metadata, actionUrl: payload.actionUrl, type: payload.type },
                    });
                    await this.prisma.expoPushToken.update({ where: { token: t.token }, data: { lastUsedAt: new Date() } });
                }
                catch (err) {
                    this.logger.warn(`Expo push failed for user ${userId}: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}`);
                }
            }
        }
        iconForType(type) {
            // Map types to icons; using favicon as default placeholder
            switch (type) {
                case 'SUCCESS':
                    return '/favicon.ico';
                case 'WARNING':
                    return '/favicon.ico';
                case 'ERROR':
                    return '/favicon.ico';
                case 'INFO':
                default:
                    return '/favicon.ico';
            }
        }
        makeTag(payload) {
            var _a, _b, _c, _d, _e;
            // Simple de-duplication tag derived from title+type+metadata shiftId/start/end
            const parts = [
                payload.type,
                payload.title,
                (_a = payload.metadata) === null || _a === void 0 ? void 0 : _a.messageId,
                (_b = payload.metadata) === null || _b === void 0 ? void 0 : _b.threadId,
                (_c = payload.metadata) === null || _c === void 0 ? void 0 : _c.shiftId,
                (_d = payload.metadata) === null || _d === void 0 ? void 0 : _d.start,
                (_e = payload.metadata) === null || _e === void 0 ? void 0 : _e.end,
            ].filter(Boolean);
            return parts.join(':');
        }
    };
    __setFunctionName(_classThis, "PushService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PushService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PushService = _classThis;
})();
exports.PushService = PushService;
