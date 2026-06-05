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
exports.EmailCampaignsService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer_1 = __importDefault(require("nodemailer"));
let EmailCampaignsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var EmailCampaignsService = _classThis = class {
        constructor(prisma, auditService, notificationsService) {
            this.prisma = prisma;
            this.auditService = auditService;
            this.notificationsService = notificationsService;
            this.transporter = null;
            this.verified = false;
        }
        getEnv(key) {
            return (process.env[key] || '').trim();
        }
        getTransporter() {
            const host = this.getEnv('EMAIL_SMTP_HOST') || this.getEnv('INVOICE_SMTP_HOST');
            const portRaw = this.getEnv('EMAIL_SMTP_PORT') || this.getEnv('INVOICE_SMTP_PORT') || '465';
            const port = parseInt(portRaw, 10);
            const secureRaw = this.getEnv('EMAIL_SMTP_SECURE') || this.getEnv('INVOICE_SMTP_SECURE') || 'true';
            const secure = secureRaw === 'true';
            const user = this.getEnv('EMAIL_SMTP_USER') || this.getEnv('INVOICE_SMTP_USER');
            const pass = this.getEnv('EMAIL_SMTP_PASS') || this.getEnv('INVOICE_SMTP_PASS');
            const authMethod = this.getEnv('EMAIL_SMTP_AUTH_METHOD') || this.getEnv('INVOICE_SMTP_AUTH_METHOD') || undefined;
            const rejectUnauthorizedRaw = this.getEnv('EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED') || this.getEnv('INVOICE_SMTP_TLS_REJECT_UNAUTHORIZED') || 'true';
            const rejectUnauthorized = rejectUnauthorizedRaw === 'true';
            if (!host || !user || !pass) {
                const missing = [];
                if (!host)
                    missing.push('EMAIL_SMTP_HOST (or INVOICE_SMTP_HOST)');
                if (!user)
                    missing.push('EMAIL_SMTP_USER (or INVOICE_SMTP_USER)');
                if (!pass)
                    missing.push('EMAIL_SMTP_PASS (or INVOICE_SMTP_PASS)');
                throw new common_1.BadRequestException(`Email SMTP is not configured (missing: ${missing.join(', ')})`);
            }
            return nodemailer_1.default.createTransport({
                host,
                port,
                secure,
                auth: { user, pass },
                authMethod,
                tls: { rejectUnauthorized, servername: host },
            });
        }
        parseSpecificTarget(targetValue) {
            const raw = String(targetValue || '').trim();
            if (!raw)
                return { employeeIds: [], emails: [] };
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    const emails = parsed.map((x) => String(x || '').trim()).filter(Boolean);
                    return { employeeIds: [], emails };
                }
                const employeeIds = Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.employeeIds) ? parsed.employeeIds.map((x) => String(x || '').trim()).filter(Boolean) : [];
                const emails = Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.emails) ? parsed.emails.map((x) => String(x || '').trim()).filter(Boolean) : [];
                return { employeeIds, emails };
            }
            catch {
                const emails = raw
                    .split(/[;,]/g)
                    .map((s) => s.trim())
                    .filter(Boolean);
                return { employeeIds: [], emails };
            }
        }
        uniqEmails(emails) {
            const seen = new Set();
            const out = [];
            for (const e of emails) {
                const v = String(e || '').trim();
                if (!v)
                    continue;
                const k = v.toLowerCase();
                if (seen.has(k))
                    continue;
                seen.add(k);
                out.push(v);
            }
            return out;
        }
        toHtml(content) {
            const safe = String(content || '');
            const looksHtml = /<([a-z][\s\S]*?)>/i.test(safe);
            if (looksHtml)
                return safe;
            const withBreaks = safe.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('<br/>');
            return `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">${withBreaks}</div>`;
        }
        htmlToText(html) {
            const s = String(html || '');
            const noTags = s
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<[^>]+>/g, '');
            return noTags.replace(/\n{3,}/g, '\n\n').trim();
        }
        renderEmailShell(args) {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const subject = String(args.subject || '').trim();
            const businessName = String(((_a = args.business) === null || _a === void 0 ? void 0 : _a.name) || '').trim() || 'United Link Security';
            const logoUrl = ((_b = args.business) === null || _b === void 0 ? void 0 : _b.logoUrl) ? String(args.business.logoUrl).trim() : '';
            const addressParts = [
                (_c = args.business) === null || _c === void 0 ? void 0 : _c.address,
                [(_d = args.business) === null || _d === void 0 ? void 0 : _d.city, (_e = args.business) === null || _e === void 0 ? void 0 : _e.state, (_f = args.business) === null || _f === void 0 ? void 0 : _f.zip].filter(Boolean).join(' '),
                (_g = args.business) === null || _g === void 0 ? void 0 : _g.country,
            ]
                .map((x) => String(x || '').trim())
                .filter(Boolean);
            const phone = ((_h = args.business) === null || _h === void 0 ? void 0 : _h.mobile) ? String(args.business.mobile).trim() : '';
            const preheader = this.htmlToText(args.bodyHtml).slice(0, 140);
            const now = new Date();
            const dateLabel = isFinite(now.getTime())
                ? now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
                : '';
            const headerLogo = logoUrl
                ? `<img src="${logoUrl}" width="36" height="36" alt="${businessName}" style="display:block;border:0;outline:none;text-decoration:none;border-radius:8px;"/>`
                : `<div style="width:36px;height:36px;border-radius:10px;background:#111827;color:#ffffff;font-weight:800;font-size:14px;line-height:36px;text-align:center;letter-spacing:0.6px;">ULS</div>`;
            const footerAddress = addressParts.length ? addressParts.join('<br/>') : '';
            return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <meta name="x-apple-disable-message-reformatting"/>
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fb;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f7fb;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
            <tr>
              <td style="padding:0 0 14px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:middle;padding-right:10px;">
                            ${headerLogo}
                          </td>
                          <td style="vertical-align:middle;">
                            <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:20px;font-weight:800;color:#111827;">
                              ${businessName}
                            </div>
                            <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:600;color:#6b7280;">
                              United Link Security • Official Communication
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;color:#6b7280;">
                        ${dateLabel}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(17,24,39,0.06);">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                  <tr>
                    <td style="padding:22px 22px 12px 22px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:20px;line-height:26px;font-weight:800;color:#111827;margin:0;">
                        ${subject}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 22px 22px 22px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:22px;color:#111827;">
                        ${args.bodyHtml}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 4px 0 4px;">
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                  This is an automated message from United Link Security. Please do not reply to this email.
                </div>
                ${phone ? `<div style="margin-top:6px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">Phone: ${phone}</div>` : ''}
                ${footerAddress ? `<div style="margin-top:10px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">${footerAddress}</div>` : ''}
                <div style="margin-top:10px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#9ca3af;text-align:center;">
                  © ${new Date().getFullYear()} United Link Security. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `.trim();
        }
        async resolveRecipients(campaign, businessId) {
            const targetType = String(campaign.targetType || 'ALL').toUpperCase();
            const targetValue = campaign.targetValue ? String(campaign.targetValue) : '';
            if (targetType === 'ALL') {
                const employees = await this.prisma.employee.findMany({
                    where: { businessId, status: 'ACTIVE' },
                    select: { email: true, officialEmail: true },
                });
                return this.uniqEmails(employees.map((e) => e.officialEmail || e.email).filter(Boolean));
            }
            if (targetType === 'DEPARTMENT') {
                if (!targetValue)
                    return [];
                const employees = await this.prisma.employee.findMany({
                    where: { businessId, status: 'ACTIVE', departmentId: targetValue },
                    select: { email: true, officialEmail: true },
                });
                return this.uniqEmails(employees.map((e) => e.officialEmail || e.email).filter(Boolean));
            }
            if (targetType === 'ROLE') {
                if (!targetValue)
                    return [];
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetValue);
                const where = { businessId, status: 'ACTIVE' };
                if (isUUID)
                    where.customRoleId = targetValue;
                else
                    where.role = targetValue;
                const employees = await this.prisma.employee.findMany({
                    where,
                    select: { email: true, officialEmail: true },
                });
                return this.uniqEmails(employees.map((e) => e.officialEmail || e.email).filter(Boolean));
            }
            if (targetType === 'SPECIFIC') {
                const spec = this.parseSpecificTarget(targetValue);
                const directEmails = this.uniqEmails(spec.emails);
                const fromEmployees = spec.employeeIds.length > 0
                    ? await this.prisma.employee.findMany({
                        where: { businessId, id: { in: spec.employeeIds } },
                        select: { email: true, officialEmail: true },
                    })
                    : [];
                const employeeEmails = this.uniqEmails(fromEmployees.map((e) => e.officialEmail || e.email).filter(Boolean));
                return this.uniqEmails([...employeeEmails, ...directEmails]);
            }
            return [];
        }
        async sendEmailToRecipients(args) {
            const transporter = this.transporter || this.getTransporter();
            this.transporter = transporter;
            const from = 'noreply@unitedlinksecurity.com';
            const replyTo = 'no-reply@unitedlinksecurity.com';
            if (!this.verified) {
                await transporter.verify();
                this.verified = true;
            }
            const subject = String(args.subject || '').trim();
            const recipients = this.uniqEmails(args.recipients || []);
            if (!subject)
                throw new common_1.BadRequestException('Subject is required');
            if (!recipients.length)
                throw new common_1.BadRequestException('No recipients found');
            const bodyHtml = this.toHtml(args.content);
            const html = this.renderEmailShell({ subject, bodyHtml, business: args.business });
            const text = this.htmlToText(html);
            const chunkSize = 50;
            const chunks = [];
            for (let i = 0; i < recipients.length; i += chunkSize)
                chunks.push(recipients.slice(i, i + chunkSize));
            for (const chunk of chunks) {
                const isSingle = chunk.length === 1;
                await transporter.sendMail({
                    from,
                    to: isSingle ? chunk[0] : from,
                    bcc: isSingle ? undefined : chunk,
                    subject,
                    html,
                    text,
                    replyTo,
                    attachments: args.attachments,
                    headers: {
                        'X-Auto-Response-Suppress': 'All',
                        Precedence: 'bulk',
                    },
                });
            }
        }
        async create(dto, userId, businessId) {
            var _a;
            if (dto.targetType === 'DEPARTMENT') {
                if (!dto.targetValue)
                    throw new common_1.BadRequestException('Department ID required');
                const dept = await this.prisma.department.findFirst({ where: { id: dto.targetValue, businessId } });
                if (!dept)
                    throw new common_1.BadRequestException('Invalid department');
            }
            else if (dto.targetType === 'ROLE') {
                if (!dto.targetValue)
                    throw new common_1.BadRequestException('Role required');
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.targetValue);
                if (isUUID) {
                    const role = await this.prisma.role.findFirst({ where: { id: dto.targetValue, businessId } });
                    if (!role)
                        throw new common_1.BadRequestException('Invalid custom role');
                }
                else {
                    const validSystemRoles = ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'MANAGER', 'EMPLOYEE'];
                    if (!validSystemRoles.includes(dto.targetValue))
                        throw new common_1.BadRequestException('Invalid system role');
                }
            }
            else if (dto.targetType === 'SPECIFIC') {
                const spec = this.parseSpecificTarget(dto.targetValue);
                if (!spec.employeeIds.length && !spec.emails.length) {
                    throw new common_1.BadRequestException('At least one recipient is required');
                }
            }
            // If scheduledAt is present and in future, status is SCHEDULED, else DRAFT (unless explicitly SENT which shouldn't happen on create usually)
            let status = dto.status || 'DRAFT';
            if (dto.scheduledAt && new Date(dto.scheduledAt) > new Date()) {
                status = 'SCHEDULED';
            }
            const campaign = await this.prisma.emailCampaign.create({
                data: {
                    subject: dto.subject,
                    content: dto.content,
                    targetType: dto.targetType,
                    targetValue: dto.targetValue || null,
                    status,
                    scheduledAt: dto.scheduledAt || null,
                    senderId: userId,
                    businessId,
                    recipientCount: 0,
                    attachments: ((_a = dto.attachments) === null || _a === void 0 ? void 0 : _a.length)
                        ? {
                            create: dto.attachments.map((a) => ({
                                filename: a.filename,
                                contentType: a.contentType,
                                contentBase64: a.contentBase64,
                                size: 0,
                            })),
                        }
                        : undefined,
                },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'CREATE',
                resource: 'EMAIL_CAMPAIGN',
                resourceId: campaign.id,
                details: dto,
            });
            return campaign;
        }
        async findAll(businessId) {
            return this.prisma.emailCampaign.findMany({
                where: { businessId },
                include: {
                    sender: {
                        select: { firstName: true, lastName: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        async findOne(id, businessId) {
            const campaign = await this.prisma.emailCampaign.findUnique({
                where: { id },
                include: {
                    sender: {
                        select: { firstName: true, lastName: true }
                    }
                }
            });
            if (!campaign || campaign.businessId !== businessId) {
                return null;
            }
            return campaign;
        }
        async send(id, userId, businessId) {
            var _a;
            const campaign = await this.prisma.emailCampaign.findUnique({ where: { id }, include: { attachments: true } });
            if (!campaign)
                throw new Error('Campaign not found');
            if (campaign.businessId !== businessId)
                throw new common_1.BadRequestException('Access denied');
            const business = await this.prisma.business.findUnique({
                where: { id: businessId },
                select: { name: true, logoUrl: true, address: true, city: true, state: true, zip: true, country: true, mobile: true },
            });
            if (!business)
                throw new common_1.BadRequestException('Business not found');
            const recipients = await this.resolveRecipients(campaign, businessId);
            if (!recipients.length)
                throw new common_1.BadRequestException('No recipients found for this campaign');
            const attachments = ((_a = campaign.attachments) === null || _a === void 0 ? void 0 : _a.length)
                ? campaign.attachments.map((a) => {
                    const base64Raw = String(a.contentBase64 || '');
                    const base64 = base64Raw.includes('base64,') ? base64Raw.split('base64,').pop() || '' : base64Raw;
                    return {
                        filename: a.filename,
                        contentType: a.contentType,
                        content: Buffer.from(base64, 'base64'),
                    };
                })
                : undefined;
            try {
                await this.sendEmailToRecipients({ subject: campaign.subject, content: campaign.content, recipients, attachments, business });
            }
            catch {
                const failed = await this.prisma.emailCampaign.update({
                    where: { id },
                    data: {
                        status: 'FAILED',
                    },
                });
                return failed;
            }
            const updatedCampaign = await this.prisma.emailCampaign.update({
                where: { id },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    recipientCount: recipients.length,
                },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'SEND',
                resource: 'EMAIL_CAMPAIGN',
                resourceId: id,
            });
            return updatedCampaign;
        }
        async remove(id, userId, businessId) {
            const existing = await this.prisma.emailCampaign.findUnique({ where: { id } });
            if (!existing || existing.businessId !== businessId) {
                throw new common_1.BadRequestException('Access denied');
            }
            const campaign = await this.prisma.emailCampaign.delete({
                where: { id },
            });
            await this.auditService.logAction({
                businessId,
                userId,
                action: 'DELETE',
                resource: 'EMAIL_CAMPAIGN',
                resourceId: id,
            });
            return campaign;
        }
    };
    __setFunctionName(_classThis, "EmailCampaignsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EmailCampaignsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EmailCampaignsService = _classThis;
})();
exports.EmailCampaignsService = EmailCampaignsService;
