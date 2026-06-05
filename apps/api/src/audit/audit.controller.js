"use strict";
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let AuditController = (() => {
    let _classDecorators = [(0, common_1.Controller)('audit'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getLogs_decorators;
    var AuditController = _classThis = class {
        constructor(auditService, prisma) {
            this.auditService = (__runInitializers(this, _instanceExtraInitializers), auditService);
            this.prisma = prisma;
        }
        async getLogs(req, businessId, resource, resourceId, action, limit, headerBusinessId) {
            let scopedBusinessId = req.user.businessId;
            if (req.user.role === types_1.UserRole.SUPER_ADMIN) {
                scopedBusinessId = businessId || headerBusinessId || scopedBusinessId;
            }
            // For Business Admin, req.user.businessId MUST be present.
            // If it's missing (e.g. malformed token or user not linked), we should probably block or return empty.
            // However, the Guard ensures valid token. If businessId is null in token, then scopedBusinessId is null.
            // If scopedBusinessId is null/undefined, AuditService fetches ALL logs.
            // WE MUST PREVENT THIS for non-Super Admin.
            if (!scopedBusinessId && req.user.role !== types_1.UserRole.SUPER_ADMIN) {
                // Fallback: try to find business via ownership (if token is missing it for some reason)
                const owned = await this.prisma.business.findFirst({ where: { ownerId: req.user.userId } });
                if (owned) {
                    scopedBusinessId = owned.id;
                }
                else {
                    // Block access
                    return []; // Or throw Forbidden
                }
            }
            const logs = await this.auditService.getLogs({
                businessId: scopedBusinessId,
                resource,
                resourceId,
                action,
                limit: limit ? parseInt(limit, 10) : undefined,
            });
            return logs;
        }
    };
    __setFunctionName(_classThis, "AuditController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getLogs_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.SUPER_ADMIN)];
        __esDecorate(_classThis, null, _getLogs_decorators, { kind: "method", name: "getLogs", static: false, private: false, access: { has: obj => "getLogs" in obj, get: obj => obj.getLogs }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuditController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuditController = _classThis;
})();
exports.AuditController = AuditController;
