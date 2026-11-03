import { BadRequestException, Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

type SendEmailArgs = {
  smtpProfile?: 'INVOICE' | 'REPORT';
  to: string;
  cc?: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string; cid?: string; contentDisposition?: 'inline' | 'attachment' }>;
};

@Injectable()
export class SmtpMailerService {
  private profile: 'INVOICE' | 'REPORT' = 'INVOICE';
  private reportMailer?: SmtpMailerService;
  private transporter: nodemailer.Transporter | null = null;
  private verified = false;

  private getTransporter(authMethodOverride?: string) {
    const host = process.env[`${this.profile}_SMTP_HOST`] || '';
    const port = parseInt(process.env[`${this.profile}_SMTP_PORT`] || '465', 10);
    const secure = String(process.env[`${this.profile}_SMTP_SECURE`] || 'true') === 'true';
    const user = process.env[`${this.profile}_SMTP_USER`] || '';
    const pass = process.env[`${this.profile}_SMTP_PASS`] || '';
    const authMethodFromEnv = (process.env[`${this.profile}_SMTP_AUTH_METHOD`] || '').trim() || undefined;
    const authMethod = authMethodOverride || authMethodFromEnv;
    const rejectUnauthorized = String(process.env[`${this.profile}_SMTP_TLS_REJECT_UNAUTHORIZED`] || 'true') === 'true';

    if (!host || !user || !pass) {
      const missing: string[] = [];
      if (!host) missing.push(`${this.profile}_SMTP_HOST`);
      if (!user) missing.push(`${this.profile}_SMTP_USER`);
      if (!pass) missing.push(`${this.profile}_SMTP_PASS`);
      throw new BadRequestException(`SMTP is not configured (missing: ${missing.join(', ')}). Configure these in the server environment.`);
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

  async send(args: SendEmailArgs): Promise<nodemailer.SentMessageInfo> {
    if (args.smtpProfile === 'REPORT' && this.profile !== 'REPORT') {
      if (!this.reportMailer) {
        this.reportMailer = new SmtpMailerService();
        this.reportMailer.profile = 'REPORT';
      }
      return this.reportMailer.send(args);
    }
    const from = process.env[`${this.profile}_FROM`] || process.env[`${this.profile}_SMTP_USER`] || '';
    const replyTo = args.replyTo || process.env[`${this.profile}_REPLY_TO`] || undefined;

    if (!from) {
      throw new BadRequestException(`Sender is not configured (set ${this.profile}_FROM or ${this.profile}_SMTP_USER)`);
    }

    const sendMail = async (transporter: nodemailer.Transporter) => {
      const result = await transporter.sendMail({
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
          ...(a.cid ? { cid: a.cid, contentDisposition: a.contentDisposition || 'inline' } : {}),
        })),
      });
      if (result.rejected?.length) {
        throw new BadRequestException('The mail server rejected one or more email recipients. Other recipients may already have received the email. Correct the addresses before retrying.');
      }
      return result;
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
      const authMethodFromEnv = (process.env[`${this.profile}_SMTP_AUTH_METHOD`] || '').trim() || '';
      if (code === 'EAUTH' && cmd.includes('AUTH PLAIN') && !authMethodFromEnv) {
        const retryTransporter = this.getTransporter('LOGIN');
        await retryTransporter.verify();
        return await sendMail(retryTransporter);
      }
      throw e;
    }
  }
}
