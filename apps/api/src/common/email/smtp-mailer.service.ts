import { BadRequestException, Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

type SendEmailArgs = {
  to: string;
  cc?: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
};

@Injectable()
export class SmtpMailerService {
  private transporter: nodemailer.Transporter | null = null;
  private verified = false;

  private getTransporter(authMethodOverride?: string) {
    const host = process.env.INVOICE_SMTP_HOST || '';
    const port = parseInt(process.env.INVOICE_SMTP_PORT || '465', 10);
    const secure = String(process.env.INVOICE_SMTP_SECURE || 'true') === 'true';
    const user = process.env.INVOICE_SMTP_USER || '';
    const pass = process.env.INVOICE_SMTP_PASS || '';
    const authMethodFromEnv = (process.env.INVOICE_SMTP_AUTH_METHOD || '').trim() || undefined;
    const authMethod = authMethodOverride || authMethodFromEnv;
    const rejectUnauthorized = String(process.env.INVOICE_SMTP_TLS_REJECT_UNAUTHORIZED || 'true') === 'true';

    if (!host || !user || !pass) {
      const missing: string[] = [];
      if (!host) missing.push('INVOICE_SMTP_HOST');
      if (!user) missing.push('INVOICE_SMTP_USER');
      if (!pass) missing.push('INVOICE_SMTP_PASS');
      throw new BadRequestException(`Invoice SMTP is not configured (missing: ${missing.join(', ')}). Set these in apps/api/.env and restart the API.`);
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      authMethod,
      tls: { rejectUnauthorized, servername: host },
    });
    return transporter;
  }

  async send(args: SendEmailArgs) {
    const from = process.env.INVOICE_FROM || process.env.INVOICE_SMTP_USER || '';
    const replyTo = args.replyTo || process.env.INVOICE_REPLY_TO || undefined;

    if (!from) {
      throw new BadRequestException('Invoice sender is not configured (set INVOICE_FROM or INVOICE_SMTP_USER in apps/api/.env and restart the API)');
    }

    const sendMail = async (transporter: nodemailer.Transporter) => {
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
    } catch (e: any) {
      const code = e?.code ? String(e.code) : '';
      const cmd = e?.command ? String(e.command) : '';
      const authMethodFromEnv = (process.env.INVOICE_SMTP_AUTH_METHOD || '').trim() || '';
      if (code === 'EAUTH' && cmd.includes('AUTH PLAIN') && !authMethodFromEnv) {
        const retryTransporter = this.getTransporter('LOGIN');
        await retryTransporter.verify();
        return await sendMail(retryTransporter);
      }
      throw e;
    }
  }
}
