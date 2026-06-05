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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const tax_util_1 = require("../common/tax.util");
const invoice_pdf_1 = require("./invoice-pdf");
let InvoicesService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var InvoicesService = _classThis = class {
        constructor(prisma, mailer) {
            this.prisma = prisma;
            this.mailer = mailer;
        }
        async validateBusinessAccess(targetBusinessId, user) {
            if (user.role === 'SUPER_ADMIN')
                return;
            // Check if user owns the business
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
            if (ownedBusiness && ownedBusiness.id === targetBusinessId)
                return;
            // Check if user is an employee of the business
            const employee = await this.prisma.employee.findFirst({
                where: { userId: user.userId || user.sub || user.id, businessId: targetBusinessId }
            });
            if (employee)
                return;
            throw new common_1.BadRequestException('Access denied: You do not have access to this business data');
        }
        async getBusinessId(user) {
            const userId = user.userId || user.sub || user.id;
            console.log(`Getting business ID for user: ${userId}`);
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee) {
                console.log(`Found employee record, businessId: ${employee.businessId}`);
                return employee.businessId;
            }
            const business = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (business) {
                console.log(`Found business owner record, businessId: ${business.id}`);
                return business.id;
            }
            console.error(`No business association found for user: ${userId}`);
            throw new common_1.BadRequestException('User is not associated with a business');
        }
        // --- Clients ---
        async createClient(data, user, businessIdHeader) {
            let businessId = businessIdHeader;
            if (!businessId || user.role !== 'SUPER_ADMIN') {
                businessId = await this.getBusinessId(user);
            }
            if (user.role === 'SUPER_ADMIN' && !businessId) {
                throw new common_1.BadRequestException('Business context required for Super Admin');
            }
            await this.validateBusinessAccess(businessId, user);
            return this.prisma.client.create({
                data: {
                    ...data,
                    businessId,
                },
            });
        }
        async findAllClients(user, businessIdHeader) {
            let businessId = businessIdHeader;
            if (!businessId || user.role !== 'SUPER_ADMIN') {
                try {
                    businessId = await this.getBusinessId(user);
                }
                catch (e) {
                    if (user.role === 'SUPER_ADMIN')
                        return []; // Return empty if SA has no context
                    throw e;
                }
            }
            if (businessId) {
                await this.validateBusinessAccess(businessId, user);
                return this.prisma.client.findMany({
                    where: { businessId },
                });
            }
            return [];
        }
        // --- Invoices ---
        async createInvoice(data, user, businessIdHeader) {
            let businessId = businessIdHeader;
            if (!businessId || user.role !== 'SUPER_ADMIN') {
                businessId = await this.getBusinessId(user);
            }
            if (user.role === 'SUPER_ADMIN' && !businessId) {
                throw new common_1.BadRequestException('Business context required for Super Admin');
            }
            await this.validateBusinessAccess(businessId, user);
            // Calculate totals
            let subtotal = 0;
            const itemsData = data.items.map(item => {
                const amount = item.quantity * item.rate;
                subtotal += amount;
                return {
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    amount,
                };
            });
            const tax = await (0, tax_util_1.resolveTaxContext)(this.prisma, businessId, data.locationId);
            const taxRate = tax.rate;
            const inclusive = tax.inclusive;
            let taxAmount = 0;
            let total = subtotal;
            if (taxRate > 0) {
                if (inclusive) {
                    taxAmount = subtotal * (taxRate / (100 + taxRate));
                    total = subtotal;
                }
                else {
                    taxAmount = subtotal * (taxRate / 100);
                    total = subtotal + taxAmount;
                }
            }
            const invoiceNumber = data.invoiceNumber || `INV-${Date.now()}`;
            return this.prisma.invoice.create({
                data: {
                    businessId,
                    clientId: data.clientId,
                    locationId: data.locationId,
                    invoiceNumber,
                    issueDate: new Date(data.issueDate),
                    dueDate: new Date(data.dueDate),
                    status: data.status || 'DRAFT',
                    notes: data.notes,
                    subtotal,
                    taxRate,
                    taxAmount,
                    total,
                    items: {
                        create: itemsData,
                    },
                },
                include: {
                    items: true,
                    client: true,
                },
            });
        }
        async updateInvoice(id, data, user) {
            const existing = await this.prisma.invoice.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!existing)
                throw new common_1.NotFoundException('Invoice not found');
            await this.validateBusinessAccess(existing.businessId, user);
            const businessId = existing.businessId;
            let subtotal = existing.subtotal;
            let itemsUpdateOp = {};
            if (data.items) {
                subtotal = 0;
                const newItemsData = data.items.map(item => {
                    const amount = item.quantity * item.rate;
                    subtotal += amount;
                    return {
                        description: item.description,
                        quantity: item.quantity,
                        rate: item.rate,
                        amount,
                    };
                });
                itemsUpdateOp = {
                    deleteMany: {},
                    create: newItemsData
                };
            }
            let taxRate = existing.taxRate;
            let taxAmount = existing.taxAmount;
            let total = existing.total;
            // Cast existing to any to access locationId if types are stale
            const existingLocId = existing.locationId;
            if (data.items || data.locationId !== undefined) {
                const locId = data.locationId !== undefined ? data.locationId : existingLocId;
                const tax = await (0, tax_util_1.resolveTaxContext)(this.prisma, businessId, locId || undefined);
                taxRate = tax.rate;
                const inclusive = tax.inclusive;
                if (taxRate > 0) {
                    if (inclusive) {
                        taxAmount = subtotal * (taxRate / (100 + taxRate));
                        total = subtotal;
                    }
                    else {
                        taxAmount = subtotal * (taxRate / 100);
                        total = subtotal + taxAmount;
                    }
                }
                else {
                    taxAmount = 0;
                    total = subtotal;
                }
            }
            return this.prisma.invoice.update({
                where: { id },
                data: {
                    clientId: data.clientId,
                    locationId: data.locationId,
                    invoiceNumber: data.invoiceNumber,
                    issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
                    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                    status: data.status,
                    notes: data.notes,
                    subtotal,
                    taxRate,
                    taxAmount,
                    total,
                    items: itemsUpdateOp,
                },
                include: {
                    items: true,
                    client: true,
                },
            });
        }
        async findAllInvoices(user, businessIdHeader) {
            let businessId = businessIdHeader;
            if (!businessId || user.role !== 'SUPER_ADMIN') {
                try {
                    businessId = await this.getBusinessId(user);
                }
                catch (e) {
                    if (user.role === 'SUPER_ADMIN')
                        return [];
                    throw e;
                }
            }
            if (businessId) {
                await this.validateBusinessAccess(businessId, user);
                return this.prisma.invoice.findMany({
                    where: { businessId },
                    include: { client: true, location: true },
                    orderBy: { createdAt: 'desc' },
                });
            }
            return [];
        }
        async findAllByClient(clientId, user) {
            const client = await this.prisma.client.findUnique({ where: { id: clientId } });
            if (!client)
                throw new common_1.NotFoundException('Client not found');
            await this.validateBusinessAccess(client.businessId, user);
            return this.prisma.invoice.findMany({
                where: { clientId },
                include: {
                    items: true,
                    client: true,
                    location: true,
                },
                orderBy: { createdAt: 'desc' },
            });
        }
        async findOneInvoice(id, user) {
            const invoice = await this.prisma.invoice.findUnique({
                where: { id },
                include: { items: true, client: true },
            });
            if (!invoice)
                throw new common_1.NotFoundException('Invoice not found');
            await this.validateBusinessAccess(invoice.businessId, user);
            return invoice;
        }
        async sendInvoice(id, user) {
            var _a, _b, _c, _d, _e;
            const invoice = await this.prisma.invoice.findUnique({
                where: { id },
                include: { client: true, items: true, business: true, location: true }
            });
            if (!invoice)
                throw new common_1.NotFoundException('Invoice not found');
            await this.validateBusinessAccess(invoice.businessId, user);
            const clientEmail = ((_a = invoice.client) === null || _a === void 0 ? void 0 : _a.billingContactEmail) || null;
            if (!clientEmail)
                throw new common_1.BadRequestException('Client billing email is required to send invoice');
            const ccFromClient = [
                (_b = invoice.client) === null || _b === void 0 ? void 0 : _b.billingContactEmail2,
                (_c = invoice.client) === null || _c === void 0 ? void 0 : _c.billingContactEmail3,
            ].filter(Boolean);
            const extractEmail = (val) => {
                const v = String(val || '').trim();
                if (!v)
                    return '';
                const m = v.match(/<([^>]+)>/);
                return ((m === null || m === void 0 ? void 0 : m[1]) || v).trim();
            };
            const businessEmail = extractEmail(process.env.INVOICE_REPLY_TO || '') ||
                extractEmail(process.env.INVOICE_FROM || '') ||
                extractEmail(process.env.INVOICE_SMTP_USER || '') ||
                '';
            const pdf = await (0, invoice_pdf_1.generateInvoicePdf)({ business: invoice.business, invoice, businessEmail });
            const invoiceNumber = invoice.invoiceNumber || 'invoice';
            const subject = `Invoice ${invoiceNumber} from ${((_d = invoice.business) === null || _d === void 0 ? void 0 : _d.name) || 'United Link Security'}`;
            const dueDateLabel = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '';
            const totalLabel = typeof invoice.total === 'number' ? `$${invoice.total.toFixed(2)}` : '';
            const businessName = ((_e = invoice.business) === null || _e === void 0 ? void 0 : _e.name) || 'United Link Security';
            const replyTo = process.env.INVOICE_REPLY_TO || process.env.INVOICE_FROM || process.env.INVOICE_SMTP_USER || undefined;
            const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.5; color:#111827;">
        <h2 style="margin:0 0 8px 0; font-size:18px;">${businessName} — Invoice ${invoiceNumber}</h2>
        <p style="margin:0 0 12px 0; color:#374151;">
          Thank you for your business. Please find your invoice attached as a PDF.
        </p>
        <div style="margin:0 0 12px 0; padding:12px; border:1px solid #E5E7EB; border-radius:10px; background:#F9FAFB;">
          <div><strong>Invoice:</strong> ${invoiceNumber}</div>
          ${dueDateLabel ? `<div><strong>Due date:</strong> ${dueDateLabel}</div>` : ''}
          ${totalLabel ? `<div><strong>Total due:</strong> ${totalLabel}</div>` : ''}
        </div>
        <p style="margin:0 0 12px 0; color:#374151;">
          If you have any questions or need assistance, reply to this email and we’ll be happy to help.
        </p>
        <p style="margin:0; color:#6B7280; font-size:12px;">
          ${businessName}
        </p>
      </div>
    `.trim();
            const text = [
                `${businessName} — Invoice ${invoiceNumber}`,
                '',
                'Thank you for your business. Please find your invoice attached as a PDF.',
                dueDateLabel ? `Due date: ${dueDateLabel}` : null,
                totalLabel ? `Total due: ${totalLabel}` : null,
                '',
                'If you have any questions, reply to this email.',
            ]
                .filter(Boolean)
                .join('\n');
            const parseCc = (val) => String(val || '')
                .split(/[;,]/g)
                .map((s) => s.trim())
                .filter(Boolean);
            const uniqEmails = (emails) => {
                const seen = new Set();
                const out = [];
                for (const e of emails) {
                    const k = String(e || '').trim().toLowerCase();
                    if (!k)
                        continue;
                    if (k === String(clientEmail).trim().toLowerCase())
                        continue;
                    if (seen.has(k))
                        continue;
                    seen.add(k);
                    out.push(String(e).trim());
                }
                return out;
            };
            const ccList = uniqEmails([
                ...ccFromClient,
                ...parseCc(process.env.INVOICE_CC || ''),
            ]);
            const cc = ccList.length ? ccList : undefined;
            const toErrorText = (val) => {
                if (!val)
                    return '';
                if (typeof val === 'string')
                    return val;
                if (typeof val === 'number' || typeof val === 'boolean')
                    return String(val);
                try {
                    return JSON.stringify(val);
                }
                catch {
                    return String(val);
                }
            };
            try {
                console.log(`[Invoice Email] Sending ${invoiceNumber} to=${clientEmail} cc=${ccList.join(', ')} replyTo=${replyTo || ''}`);
                await this.mailer.send({
                    to: clientEmail,
                    cc,
                    subject,
                    html,
                    text,
                    replyTo,
                    attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' }],
                });
            }
            catch (e) {
                console.error('[Invoice Email] Send failed', (e === null || e === void 0 ? void 0 : e.code) || '', (e === null || e === void 0 ? void 0 : e.response) || '', (e === null || e === void 0 ? void 0 : e.message) || e);
                const code = (e === null || e === void 0 ? void 0 : e.code) ? String(e.code) : '';
                const response = toErrorText((e === null || e === void 0 ? void 0 : e.response) || (e === null || e === void 0 ? void 0 : e.responseText) || '');
                const msg = toErrorText((e === null || e === void 0 ? void 0 : e.message) || 'Unknown SMTP error');
                const responseCode = (e === null || e === void 0 ? void 0 : e.responseCode) ? ` responseCode=${e.responseCode}` : '';
                const command = (e === null || e === void 0 ? void 0 : e.command) ? ` command=${e.command}` : '';
                const detail = [response, msg].filter(Boolean)[0] || 'Unknown SMTP error';
                throw new common_1.BadRequestException(`Failed to send invoice email${code ? ` (${code})` : ''}${responseCode}${command}: ${detail}`);
            }
            return this.prisma.invoice.update({
                where: { id },
                data: { status: 'SENT' }
            });
        }
    };
    __setFunctionName(_classThis, "InvoicesService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        InvoicesService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return InvoicesService = _classThis;
})();
exports.InvoicesService = InvoicesService;
