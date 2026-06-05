import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { resolveTaxContext } from '../common/tax.util';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { SmtpMailerService } from '../common/email/smtp-mailer.service';
import { generateInvoicePdf } from './invoice-pdf';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService, private mailer: SmtpMailerService) {}

  private async validateBusinessAccess(targetBusinessId: string, user: any) {
    if (user.role === 'SUPER_ADMIN') return;
    
    // Check if user owns the business
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    // Check if user is an employee of the business
    const employee = await this.prisma.employee.findFirst({ 
        where: { userId: user.userId || user.sub || user.id, businessId: targetBusinessId } 
    });
    if (employee) return;

    throw new BadRequestException('Access denied: You do not have access to this business data');
  }

  private async getBusinessId(user: any): Promise<string> {
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
    throw new BadRequestException('User is not associated with a business');
  }

  // --- Clients ---

  async createClient(data: { name: string; email?: string; phone?: string; address?: string }, user: any, businessIdHeader?: string) {
    let businessId = businessIdHeader;
    if (!businessId || user.role !== 'SUPER_ADMIN') {
        businessId = await this.getBusinessId(user);
    }
    
    if (user.role === 'SUPER_ADMIN' && !businessId) {
        throw new BadRequestException('Business context required for Super Admin');
    }

    await this.validateBusinessAccess(businessId, user);

    return this.prisma.client.create({
      data: {
        ...data,
        businessId,
      },
    });
  }

  async findAllClients(user: any, businessIdHeader?: string) {
    let businessId = businessIdHeader;
    if (!businessId || user.role !== 'SUPER_ADMIN') {
        try {
            businessId = await this.getBusinessId(user);
        } catch (e) {
            if (user.role === 'SUPER_ADMIN') return []; // Return empty if SA has no context
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

  async createInvoice(data: CreateInvoiceDto, user: any, businessIdHeader?: string) {
    let businessId = businessIdHeader;
    if (!businessId || user.role !== 'SUPER_ADMIN') {
        businessId = await this.getBusinessId(user);
    }
    
    if (user.role === 'SUPER_ADMIN' && !businessId) {
        throw new BadRequestException('Business context required for Super Admin');
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

    const tax = await resolveTaxContext(this.prisma, businessId, data.locationId);
    const taxRate = tax.rate;
    const inclusive = tax.inclusive;
    let taxAmount = 0;
    let total = subtotal;
    if (taxRate > 0) {
      if (inclusive) {
        taxAmount = subtotal * (taxRate / (100 + taxRate));
        total = subtotal;
      } else {
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
      } as any,
      include: {
        items: true,
        client: true,
      },
    });
  }

  async updateInvoice(id: string, data: Partial<CreateInvoiceDto>, user: any) {
    const existing = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true }
    });
    
    if (!existing) throw new NotFoundException('Invoice not found');
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
    const existingLocId = (existing as any).locationId;

    if (data.items || data.locationId !== undefined) {
        const locId = data.locationId !== undefined ? data.locationId : existingLocId;
        const tax = await resolveTaxContext(this.prisma, businessId, locId || undefined);
        taxRate = tax.rate;
        const inclusive = tax.inclusive;
        
        if (taxRate > 0) {
          if (inclusive) {
            taxAmount = subtotal * (taxRate / (100 + taxRate));
            total = subtotal;
          } else {
            taxAmount = subtotal * (taxRate / 100);
            total = subtotal + taxAmount;
          }
        } else {
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
      } as any,
      include: {
        items: true,
        client: true,
      },
    });
  }

  async findAllInvoices(user: any, businessIdHeader?: string) {
    let businessId = businessIdHeader;
    if (!businessId || user.role !== 'SUPER_ADMIN') {
        try {
            businessId = await this.getBusinessId(user);
        } catch (e) {
            if (user.role === 'SUPER_ADMIN') return [];
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

  async findAllByClient(clientId: string, user: any) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
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


  async findOneInvoice(id: string, user: any) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, client: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.validateBusinessAccess(invoice.businessId, user);
    return invoice;
  }

  async sendInvoice(id: string, user: any) {
    const invoice = await this.prisma.invoice.findUnique({
        where: { id },
        include: { client: true, items: true, business: true, location: true }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.validateBusinessAccess(invoice.businessId, user);

    const clientEmail = (invoice.client as any)?.billingContactEmail || null;
    if (!clientEmail) throw new BadRequestException('Client billing email is required to send invoice');
    const ccFromClient = [
      (invoice.client as any)?.billingContactEmail2,
      (invoice.client as any)?.billingContactEmail3,
    ].filter(Boolean) as string[];

    const extractEmail = (val: string) => {
      const v = String(val || '').trim();
      if (!v) return '';
      const m = v.match(/<([^>]+)>/);
      return (m?.[1] || v).trim();
    };

    const businessEmail =
      extractEmail(process.env.INVOICE_REPLY_TO || '') ||
      extractEmail(process.env.INVOICE_FROM || '') ||
      extractEmail(process.env.INVOICE_SMTP_USER || '') ||
      '';

    const pdf = await generateInvoicePdf({ business: invoice.business, invoice, businessEmail });
    const invoiceNumber = invoice.invoiceNumber || 'invoice';
    const subject = `Invoice ${invoiceNumber} from ${invoice.business?.name || 'United Link Security'}`;

    const dueDateLabel = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '';
    const totalLabel = typeof invoice.total === 'number' ? `$${invoice.total.toFixed(2)}` : '';
    const businessName = invoice.business?.name || 'United Link Security';

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

    const parseCc = (val: string) =>
      String(val || '')
        .split(/[;,]/g)
        .map((s) => s.trim())
        .filter(Boolean);

    const uniqEmails = (emails: string[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const e of emails) {
        const k = String(e || '').trim().toLowerCase();
        if (!k) continue;
        if (k === String(clientEmail).trim().toLowerCase()) continue;
        if (seen.has(k)) continue;
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

    const toErrorText = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'number' || typeof val === 'boolean') return String(val);
      try {
        return JSON.stringify(val);
      } catch {
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
    } catch (e: any) {
      console.error('[Invoice Email] Send failed', e?.code || '', e?.response || '', e?.message || e);
      const code = e?.code ? String(e.code) : '';
      const response = toErrorText(e?.response || e?.responseText || '');
      const msg = toErrorText(e?.message || 'Unknown SMTP error');
      const responseCode = e?.responseCode ? ` responseCode=${e.responseCode}` : '';
      const command = e?.command ? ` command=${e.command}` : '';
      const detail = [response, msg].filter(Boolean)[0] || 'Unknown SMTP error';
      throw new BadRequestException(`Failed to send invoice email${code ? ` (${code})` : ''}${responseCode}${command}: ${detail}`);
    }
    
    return this.prisma.invoice.update({
        where: { id },
        data: { status: 'SENT' }
    });
  }
}
