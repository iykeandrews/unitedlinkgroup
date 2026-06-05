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
exports.InvoicesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
let InvoicesController = (() => {
    let _classDecorators = [(0, common_1.Controller)('invoices'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createClient_decorators;
    let _findAllClients_decorators;
    let _createInvoice_decorators;
    let _updateInvoice_decorators;
    let _sendInvoice_decorators;
    let _getInvoiceEmailConfig_decorators;
    let _findAllInvoices_decorators;
    let _findAllByClient_decorators;
    let _findOneInvoice_decorators;
    var InvoicesController = _classThis = class {
        constructor(invoicesService) {
            this.invoicesService = (__runInitializers(this, _instanceExtraInitializers), invoicesService);
        }
        // --- Clients ---
        createClient(req, createClientDto, headerBusinessId) {
            return this.invoicesService.createClient(createClientDto, req.user, headerBusinessId);
        }
        findAllClients(req, headerBusinessId) {
            return this.invoicesService.findAllClients(req.user, headerBusinessId);
        }
        // --- Invoices ---
        createInvoice(req, createInvoiceDto, headerBusinessId) {
            console.log('Create Invoice Payload:', JSON.stringify(createInvoiceDto, null, 2));
            return this.invoicesService.createInvoice(createInvoiceDto, req.user, headerBusinessId);
        }
        updateInvoice(req, id, updateData) {
            console.log('Update Invoice Payload:', id, JSON.stringify(updateData, null, 2));
            return this.invoicesService.updateInvoice(id, updateData, req.user);
        }
        sendInvoice(req, id) {
            return this.invoicesService.sendInvoice(id, req.user);
        }
        getInvoiceEmailConfig() {
            const host = process.env.INVOICE_SMTP_HOST || '';
            const port = process.env.INVOICE_SMTP_PORT || '';
            const secure = process.env.INVOICE_SMTP_SECURE || '';
            const user = process.env.INVOICE_SMTP_USER || '';
            const pass = process.env.INVOICE_SMTP_PASS || '';
            const from = process.env.INVOICE_FROM || '';
            const replyTo = process.env.INVOICE_REPLY_TO || '';
            const cc = process.env.INVOICE_CC || '';
            return {
                configured: !!(host && user && pass && (from || user)),
                smtp: {
                    host: host || null,
                    port: port || null,
                    secure: secure || null,
                    userSet: !!user,
                    passSet: !!pass,
                },
                mail: {
                    from: from || null,
                    replyTo: replyTo || null,
                    cc: cc || null,
                },
            };
        }
        findAllInvoices(req, headerBusinessId) {
            return this.invoicesService.findAllInvoices(req.user, headerBusinessId);
        }
        findAllByClient(clientId, req) {
            return this.invoicesService.findAllByClient(clientId, req.user);
        }
        findOneInvoice(id, req) {
            return this.invoicesService.findOneInvoice(id, req.user);
        }
    };
    __setFunctionName(_classThis, "InvoicesController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createClient_decorators = [(0, common_1.Post)('clients'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _findAllClients_decorators = [(0, common_1.Get)('clients'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _createInvoice_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER), (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true }))];
        _updateInvoice_decorators = [(0, common_1.Patch)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER), (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true }))];
        _sendInvoice_decorators = [(0, common_1.Post)(':id/send'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _getInvoiceEmailConfig_decorators = [(0, common_1.Get)('email-config'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _findAllInvoices_decorators = [(0, common_1.Get)(), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _findAllByClient_decorators = [(0, common_1.Get)('client/:clientId'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        _findOneInvoice_decorators = [(0, common_1.Get)(':id'), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN, types_1.UserRole.BUSINESS_ADMIN, types_1.UserRole.MANAGER)];
        __esDecorate(_classThis, null, _createClient_decorators, { kind: "method", name: "createClient", static: false, private: false, access: { has: obj => "createClient" in obj, get: obj => obj.createClient }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllClients_decorators, { kind: "method", name: "findAllClients", static: false, private: false, access: { has: obj => "findAllClients" in obj, get: obj => obj.findAllClients }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createInvoice_decorators, { kind: "method", name: "createInvoice", static: false, private: false, access: { has: obj => "createInvoice" in obj, get: obj => obj.createInvoice }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateInvoice_decorators, { kind: "method", name: "updateInvoice", static: false, private: false, access: { has: obj => "updateInvoice" in obj, get: obj => obj.updateInvoice }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendInvoice_decorators, { kind: "method", name: "sendInvoice", static: false, private: false, access: { has: obj => "sendInvoice" in obj, get: obj => obj.sendInvoice }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getInvoiceEmailConfig_decorators, { kind: "method", name: "getInvoiceEmailConfig", static: false, private: false, access: { has: obj => "getInvoiceEmailConfig" in obj, get: obj => obj.getInvoiceEmailConfig }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllInvoices_decorators, { kind: "method", name: "findAllInvoices", static: false, private: false, access: { has: obj => "findAllInvoices" in obj, get: obj => obj.findAllInvoices }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findAllByClient_decorators, { kind: "method", name: "findAllByClient", static: false, private: false, access: { has: obj => "findAllByClient" in obj, get: obj => obj.findAllByClient }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOneInvoice_decorators, { kind: "method", name: "findOneInvoice", static: false, private: false, access: { has: obj => "findOneInvoice" in obj, get: obj => obj.findOneInvoice }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        InvoicesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return InvoicesController = _classThis;
})();
exports.InvoicesController = InvoicesController;
