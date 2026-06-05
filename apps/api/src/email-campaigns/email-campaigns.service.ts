import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEmailCampaignDto } from './dto/create-email-campaign.dto';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailCampaignsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  private transporter: nodemailer.Transporter | null = null;
  private verified = false;

  private getEnv(key: string) {
    return (process.env[key] || '').trim();
  }

  private getTransporter() {
    const host = this.getEnv('EMAIL_SMTP_HOST') || this.getEnv('INVOICE_SMTP_HOST');
    const portRaw = this.getEnv('EMAIL_SMTP_PORT') || this.getEnv('INVOICE_SMTP_PORT') || '465';
    const port = parseInt(portRaw, 10);
    const secureRaw = this.getEnv('EMAIL_SMTP_SECURE') || this.getEnv('INVOICE_SMTP_SECURE') || 'true';
    const secure = secureRaw === 'true';
    const user = this.getEnv('EMAIL_SMTP_USER') || this.getEnv('INVOICE_SMTP_USER');
    const pass = this.getEnv('EMAIL_SMTP_PASS') || this.getEnv('INVOICE_SMTP_PASS');
    const authMethod = this.getEnv('EMAIL_SMTP_AUTH_METHOD') || this.getEnv('INVOICE_SMTP_AUTH_METHOD') || undefined;
    const rejectUnauthorizedRaw =
      this.getEnv('EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED') || this.getEnv('INVOICE_SMTP_TLS_REJECT_UNAUTHORIZED') || 'true';
    const rejectUnauthorized = rejectUnauthorizedRaw === 'true';

    if (!host || !user || !pass) {
      const missing: string[] = [];
      if (!host) missing.push('EMAIL_SMTP_HOST (or INVOICE_SMTP_HOST)');
      if (!user) missing.push('EMAIL_SMTP_USER (or INVOICE_SMTP_USER)');
      if (!pass) missing.push('EMAIL_SMTP_PASS (or INVOICE_SMTP_PASS)');
      throw new BadRequestException(`Email SMTP is not configured (missing: ${missing.join(', ')})`);
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      authMethod,
      tls: { rejectUnauthorized, servername: host },
    });
  }

  private parseSpecificTarget(targetValue?: string) {
    const raw = String(targetValue || '').trim();
    if (!raw) return { employeeIds: [] as string[], emails: [] as string[] };
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const emails = parsed.map((x) => String(x || '').trim()).filter(Boolean);
        return { employeeIds: [] as string[], emails };
      }
      const employeeIds = Array.isArray(parsed?.employeeIds) ? parsed.employeeIds.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
      const emails = Array.isArray(parsed?.emails) ? parsed.emails.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
      return { employeeIds, emails };
    } catch {
      const emails = raw
        .split(/[;,]/g)
        .map((s) => s.trim())
        .filter(Boolean);
      return { employeeIds: [] as string[], emails };
    }
  }

  private uniqEmails(emails: string[]) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of emails) {
      const v = String(e || '').trim();
      if (!v) continue;
      const k = v.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(v);
    }
    return out;
  }

  private toHtml(content: string) {
    const safe = String(content || '');
    const looksHtml = /<([a-z][\s\S]*?)>/i.test(safe);
    if (looksHtml) return safe;
    const withBreaks = safe.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('<br/>');
    return `<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111827;">${withBreaks}</div>`;
  }

  private htmlToText(html: string) {
    const s = String(html || '');
    const noTags = s
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    return noTags.replace(/\n{3,}/g, '\n\n').trim();
  }

  private renderEmailShell(args: {
    subject: string;
    bodyHtml: string;
    business: {
      name: string;
      logoUrl?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      country?: string | null;
      mobile?: string | null;
    };
  }) {
    const subject = String(args.subject || '').trim();
    const businessName = String(args.business?.name || '').trim() || 'United Link Security';
    const logoUrl = args.business?.logoUrl ? String(args.business.logoUrl).trim() : '';

    const addressParts = [
      args.business?.address,
      [args.business?.city, args.business?.state, args.business?.zip].filter(Boolean).join(' '),
      args.business?.country,
    ]
      .map((x) => String(x || '').trim())
      .filter(Boolean);

    const phone = args.business?.mobile ? String(args.business.mobile).trim() : '';
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

  private async resolveRecipients(campaign: any, businessId: string) {
    const targetType = String(campaign.targetType || 'ALL').toUpperCase();
    const targetValue = campaign.targetValue ? String(campaign.targetValue) : '';

    if (targetType === 'ALL') {
      const employees = await this.prisma.employee.findMany({
        where: { businessId, status: 'ACTIVE' },
        select: { email: true, officialEmail: true },
      });
      return this.uniqEmails(employees.map((e) => e.officialEmail || e.email).filter(Boolean) as string[]);
    }

    if (targetType === 'DEPARTMENT') {
      if (!targetValue) return [];
      const employees = await this.prisma.employee.findMany({
        where: { businessId, status: 'ACTIVE', departmentId: targetValue },
        select: { email: true, officialEmail: true },
      });
      return this.uniqEmails(employees.map((e) => e.officialEmail || e.email).filter(Boolean) as string[]);
    }

    if (targetType === 'ROLE') {
      if (!targetValue) return [];
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetValue);
      const where: any = { businessId, status: 'ACTIVE' };
      if (isUUID) where.customRoleId = targetValue;
      else where.role = targetValue;
      const employees = await this.prisma.employee.findMany({
        where,
        select: { email: true, officialEmail: true },
      });
      return this.uniqEmails(employees.map((e) => e.officialEmail || e.email).filter(Boolean) as string[]);
    }

    if (targetType === 'SPECIFIC') {
      const spec = this.parseSpecificTarget(targetValue);
      const directEmails = this.uniqEmails(spec.emails);
      const fromEmployees =
        spec.employeeIds.length > 0
          ? await this.prisma.employee.findMany({
              where: { businessId, id: { in: spec.employeeIds } },
              select: { email: true, officialEmail: true },
            })
          : [];
      const employeeEmails = this.uniqEmails(fromEmployees.map((e) => e.officialEmail || e.email).filter(Boolean) as string[]);
      return this.uniqEmails([...employeeEmails, ...directEmails]);
    }

    return [];
  }

  private async sendEmailToRecipients(args: {
    subject: string;
    content: string;
    recipients: string[];
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
    business: {
      name: string;
      logoUrl?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      country?: string | null;
      mobile?: string | null;
    };
  }) {
    const transporter = this.transporter || this.getTransporter();
    this.transporter = transporter;
    const from = this.getEnv('EMAIL_FROM') || 'noreply@unitedlinkgroup.com';
    const replyTo = this.getEnv('EMAIL_REPLY_TO') || 'info@unitedlinkgroup.com';

    if (!this.verified) {
      await transporter.verify();
      this.verified = true;
    }

    const subject = String(args.subject || '').trim();
    const recipients = this.uniqEmails(args.recipients || []);
    if (!subject) throw new BadRequestException('Subject is required');
    if (!recipients.length) throw new BadRequestException('No recipients found');

    const bodyHtml = this.toHtml(args.content);
    const html = this.renderEmailShell({ subject, bodyHtml, business: args.business });
    const text = this.htmlToText(html);

    const chunkSize = 50;
    const chunks: string[][] = [];
    for (let i = 0; i < recipients.length; i += chunkSize) chunks.push(recipients.slice(i, i + chunkSize));

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

  async create(dto: CreateEmailCampaignDto, userId: string, businessId: string) {
    if (dto.targetType === 'DEPARTMENT') {
      if (!dto.targetValue) throw new BadRequestException('Department ID required');
      const dept = await this.prisma.department.findFirst({ where: { id: dto.targetValue, businessId } });
      if (!dept) throw new BadRequestException('Invalid department');
    } else if (dto.targetType === 'ROLE') {
      if (!dto.targetValue) throw new BadRequestException('Role required');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.targetValue);
      if (isUUID) {
        const role = await this.prisma.role.findFirst({ where: { id: dto.targetValue, businessId } });
        if (!role) throw new BadRequestException('Invalid custom role');
      } else {
        const validSystemRoles = ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'MANAGER', 'EMPLOYEE'];
        if (!validSystemRoles.includes(dto.targetValue)) throw new BadRequestException('Invalid system role');
      }
    } else if (dto.targetType === 'SPECIFIC') {
      const spec = this.parseSpecificTarget(dto.targetValue);
      if (!spec.employeeIds.length && !spec.emails.length) {
        throw new BadRequestException('At least one recipient is required');
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
        attachments: dto.attachments?.length
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

  async findAll(businessId: string) {
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

  async findOne(id: string, businessId: string) {
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

  async send(id: string, userId: string, businessId: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({ where: { id }, include: { attachments: true } });
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.businessId !== businessId) throw new BadRequestException('Access denied');

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, logoUrl: true, address: true, city: true, state: true, zip: true, country: true, mobile: true },
    });
    if (!business) throw new BadRequestException('Business not found');

    const recipients = await this.resolveRecipients(campaign, businessId);
    if (!recipients.length) throw new BadRequestException('No recipients found for this campaign');

    const attachments = campaign.attachments?.length
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
    } catch {
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

  async remove(id: string, userId: string, businessId: string) {
    const existing = await this.prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing || existing.businessId !== businessId) {
      throw new BadRequestException('Access denied');
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
}
