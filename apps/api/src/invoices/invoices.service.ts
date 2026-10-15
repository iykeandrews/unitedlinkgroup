import { invoiceEmail } from "./invoice-email";
import { loadInvoiceLogo } from "./invoice-logo";
import { invoiceRecipients } from "./invoice-billing";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { reserveInvoiceNumber } from "./invoice-number";
import { PrismaService } from "../prisma.service";
import { resolveTaxContext } from "../common/tax.util";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { SmtpMailerService } from "../common/email/smtp-mailer.service";
import { generateInvoicePdf } from "./invoice-pdf";
import {
  cents,
  invoiceDay,
  invoiceTotals,
  invoiceTracking,
  PAYMENT_METHODS,
} from "./invoice-accounting";
import { RecordPaymentDto, VoidPaymentDto } from "./dto/record-payment.dto";
const include = {
  items: true,
  client: true,
  location: true,
  payments: { orderBy: { createdAt: "desc" as const } },
};
@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private mailer: SmtpMailerService,
  ) {}
  private userId(user: any) {
    const id = user.userId || user.sub || user.id;
    if (!id) throw new ForbiddenException("Sign in to access invoices.");
    return id;
  }
  private async validateBusinessAccess(id: string, user: any) {
    const userId = this.userId(user);
    if (user.role === "SUPER_ADMIN") return;
    if (
      await this.prisma.business.findFirst({ where: { id, ownerId: userId } })
    )
      return;
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId,
        businessId: id,
        role: { in: ["BUSINESS_ADMIN", "MANAGER", "FINANCE"] },
      },
    });
    if (employee) return;
    throw new ForbiddenException(
      "You do not have permission to manage invoices for this business.",
    );
  }
  private async businessContext(user: any, header?: string) {
    if (header) {
      await this.validateBusinessAccess(header, user);
      return header;
    }
    if (user.role === "SUPER_ADMIN")
      throw new BadRequestException("Select a business first.");
    const userId = this.userId(user);
    const [owned, employment] = await Promise.all([
      this.prisma.business.findMany({
        where: { ownerId: userId },
        select: { id: true },
      }),
      this.prisma.employee.findMany({
        where: {
          userId,
          role: { in: ["BUSINESS_ADMIN", "MANAGER", "FINANCE"] },
        },
        select: { businessId: true },
      }),
    ]);
    const ids = [
      ...new Set([
        ...owned.map((b) => b.id),
        ...employment.map((e) => e.businessId),
      ]),
    ];
    if (ids.length !== 1)
      throw new BadRequestException("Select a business first.");
    return ids[0];
  }
  private async invoiceAccess(
    id: string,
    user: any,
    header?: string,
    db: any = this.prisma,
  ) {
    const invoice = await db.invoice.findUnique({ where: { id }, include });
    if (!invoice) throw new NotFoundException("Invoice not found.");
    if (header && header !== invoice.businessId)
      throw new ForbiddenException(
        "Invoice does not belong to the selected business.",
      );
    await this.validateBusinessAccess(invoice.businessId, user);
    return invoice;
  }
  private async references(
    businessId: string,
    clientId: string,
    locationId?: string | null,
  ) {
    if (
      !(await this.prisma.client.findFirst({
        where: { id: clientId, businessId },
      }))
    )
      throw new BadRequestException("Select a client in this business.");
    if (
      locationId &&
      !(await this.prisma.location.findFirst({
        where: { id: locationId, businessId, clientId },
      }))
    )
      throw new BadRequestException(
        "Select a site belonging to this client and business.",
      );
  }
  private dates(issue: string, due: string) {
    const a = invoiceDay(issue, "Service start date"),
      b = invoiceDay(due, "Service end date");
    if (b < a)
      throw new BadRequestException(
        "Service end date cannot be before the service start date.",
      );
    return { issueDate: new Date(a), dueDate: new Date(b) };
  }
  private status(value?: string) {
    if (value && !["DRAFT", "SENT", "VOID", "CANCELLED"].includes(value))
      throw new BadRequestException(
        "Paid and overdue status are calculated from payments and dates.",
      );
    return value === "CANCELLED" ? "VOID" : value;
  }
  async createClient(data: any, user: any, header?: string) {
    const businessId = await this.businessContext(user, header);
    if (
      typeof data.name !== "string" ||
      !data.name.trim() ||
      data.name.length > 200
    )
      throw new BadRequestException(
        "Enter a client name of up to 200 characters.",
      );
    const optional = (key: string, max: number) => {
      if (
        data[key] !== undefined &&
        (typeof data[key] !== "string" || data[key].length > max)
      )
        throw new BadRequestException(`Invalid ${key}.`);
      return data[key]?.trim() || null;
    };
    const email = optional("email", 254);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new BadRequestException("Enter a valid client email.");
    return this.prisma.client.create({
      data: {
        businessId,
        name: data.name.trim(),
        email,
        billingContactEmail: email,
        phone: optional("phone", 50),
        address: optional("address", 500),
      },
    });
  }
  async findAllClients(user: any, header?: string) {
    const businessId = await this.businessContext(user, header);
    return this.prisma.client.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
    });
  }
  async createInvoice(data: CreateInvoiceDto, user: any, header?: string) {
    const businessId = await this.businessContext(user, header);
    const status = this.status(data.status) || "DRAFT";
    if (status === "VOID")
      throw new BadRequestException("Create a draft or issued invoice.");
    await this.references(businessId, data.clientId, data.locationId);
    const dates = this.dates(data.issueDate, data.dueDate);
    const tax = await resolveTaxContext(
      this.prisma,
      businessId,
      data.locationId,
      true,
    );
    const { items, ...totals } = invoiceTotals(
      data.items,
      tax.rate,
      tax.inclusive,
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        const invoiceNumber = await reserveInvoiceNumber(tx, businessId);
        const invoice = await tx.invoice.create({
          data: {
            businessId,
            clientId: data.clientId,
            locationId: data.locationId || null,
            invoiceNumber,
            ...dates,
            status,
            notes: data.notes,
            ...totals,
            items: { create: items },
          },
          include,
        });
        await this.audit(tx, user, businessId, "INVOICE_CREATED", {
          invoiceId: invoice.id,
          status,
        });
        return invoiceTracking(invoice);
      });
    } catch (e: any) {
      if (e.code === "P2002")
        throw new ConflictException(
          "This invoice number is already used in this business.",
        );
      throw e;
    }
  }
  async updateInvoice(
    id: string,
    data: Partial<CreateInvoiceDto>,
    user: any,
    header?: string,
  ) {
    const previous = await this.invoiceAccess(id, user, header);
    if (data.invoiceNumber !== undefined && data.invoiceNumber.trim() !== previous.invoiceNumber) {
      throw new BadRequestException("Invoice numbers are assigned automatically and cannot be changed.");
    }
    if (
      (data as any).expectedUpdatedAt &&
      new Date((data as any).expectedUpdatedAt).getTime() !==
        previous.updatedAt.getTime()
    )
      throw new ConflictException(
        "Invoice changed since it was opened. Refresh before saving.",
      );
    if (
      previous.payments.some((p: any) => !p.voidedAt) ||
      previous.status === "PAID" ||
      ["VOID", "CANCELLED"].includes(previous.status)
    )
      throw new BadRequestException(
        "Paid, partially paid, and void invoices cannot be edited. Reverse incorrect payment records before editing.",
      );
    const nextStatus = this.status(data.status) || previous.status;
    const clientId = data.clientId || previous.clientId;
    const locationId =
      data.locationId !== undefined ? data.locationId : previous.locationId;
    await this.references(previous.businessId, clientId, locationId);
    const dates = this.dates(
      data.issueDate || previous.issueDate.toISOString(),
      data.dueDate || previous.dueDate.toISOString(),
    );
    let totals: any = {};
    let items: any = undefined;
    if (data.items || data.locationId !== undefined) {
      const tax =
        data.locationId !== undefined && locationId !== previous.locationId
          ? await resolveTaxContext(
              this.prisma,
              previous.businessId,
              locationId || undefined,
              true,
            )
          : {
              rate: previous.taxRate,
              inclusive:
                previous.taxInclusive ||
                (previous.taxAmount > 0 &&
                  cents(previous.total) === cents(previous.subtotal)),
            };
      const result = invoiceTotals(
        data.items || previous.items,
        tax.rate,
        tax.inclusive,
      );
      ({ items, ...totals } = result);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
        const current = await tx.invoice.findUnique({
          where: { id },
          include: { payments: true },
        });
        if (
          !current ||
          current.updatedAt.getTime() !== previous.updatedAt.getTime()
        )
          throw new ConflictException(
            "Invoice changed. Refresh before saving.",
          );
        if (
          current.payments.some((p) => !p.voidedAt) ||
          current.status === "PAID" ||
          ["VOID", "CANCELLED"].includes(current.status)
        )
          throw new ConflictException(
            "Invoice changed. Refresh before editing.",
          );
        const result = await tx.invoice.update({
          where: { id },
          data: {
            clientId,
            locationId,
            invoiceNumber: previous.invoiceNumber,
            ...dates,
            status: nextStatus,
            notes: data.notes,
            ...totals,
            ...(items ? { items: { deleteMany: {}, create: items } } : {}),
          },
          include,
        });
        await this.audit(tx, user, previous.businessId, "INVOICE_UPDATED", {
          invoiceId: id,
          status: nextStatus,
        });
        return invoiceTracking(result);
      });
    } catch (e: any) {
      if (e.code === "P2002")
        throw new ConflictException(
          "This invoice number is already used in this business.",
        );
      throw e;
    }
  }
  async findAllInvoices(user: any, header?: string) {
    const businessId = await this.businessContext(user, header);
    return (
      await this.prisma.invoice.findMany({
        where: { businessId },
        include,
        orderBy: { createdAt: "desc" },
      })
    ).map((i) => invoiceTracking(i));
  }
  async findAllByClient(clientId: string, user: any, header?: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException("Client not found.");
    if (header && header !== client.businessId)
      throw new ForbiddenException(
        "Client does not belong to the selected business.",
      );
    await this.validateBusinessAccess(client.businessId, user);
    return (
      await this.prisma.invoice.findMany({
        where: { clientId },
        include,
        orderBy: { createdAt: "desc" },
      })
    ).map((i) => invoiceTracking(i));
  }
  async findOneInvoice(id: string, user: any, header?: string) {
    return invoiceTracking(await this.invoiceAccess(id, user, header));
  }
  async invoiceBusiness(id: string, user: any, header?: string) {
    const invoice = await this.invoiceAccess(id, user, header);
    return this.prisma.business.findUniqueOrThrow({
      where: { id: invoice.businessId },
    });
  }
  async taxContext(
    user: any,
    header?: string,
    clientId?: string,
    locationId?: string,
  ) {
    const businessId = await this.businessContext(user, header);
    if (clientId) await this.references(businessId, clientId, locationId);
    else if (locationId)
      throw new BadRequestException("Select a client first.");
    return resolveTaxContext(this.prisma, businessId, locationId, true);
  }
  private async audit(
    tx: any,
    user: any,
    businessId: string,
    action: string,
    details: any,
  ) {
    await tx.auditLog.create({
      data: {
        businessId,
        userId: this.userId(user),
        action,
        resource: "INVOICE",
        resourceId: details.invoiceId,
        details: JSON.stringify(details),
      },
    });
  }
  async recordPayment(
    id: string,
    data: RecordPaymentDto,
    user: any,
    header?: string,
  ) {
    await this.invoiceAccess(id, user, header);
    const amountCents = cents(data.amount);
    if (
      amountCents <= 0 ||
      Math.abs(data.amount * 100 - amountCents) > 0.000001
    )
      throw new BadRequestException(
        "Payment must be a positive amount with at most two decimal places.",
      );
    const day = invoiceDay(data.paidAt, "Payment date");
    if (day > new Date().toISOString().slice(0, 10))
      throw new BadRequestException("Payment date cannot be in the future.");
    if (!PAYMENT_METHODS.includes(data.method))
      throw new BadRequestException("Select a payment method.");
    if (
      typeof data.idempotencyKey !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.idempotencyKey,
      )
    )
      throw new BadRequestException(
        "A unique payment request key is required.",
      );
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
        const current = await tx.invoice.findUnique({ where: { id }, include });
        if (!current) throw new NotFoundException("Invoice not found.");
        const duplicate = current.payments.find(
          (p) => p.idempotencyKey === data.idempotencyKey,
        );
        if (duplicate) {
          if (
            duplicate.amountCents !== amountCents ||
            duplicate.method !== data.method ||
            duplicate.paidAt.toISOString().slice(0, 10) !== day
          )
            throw new ConflictException(
              "This request key was already used for a different payment.",
            );
          return invoiceTracking(current);
        }
        const tracked = invoiceTracking(current);
        if (["DRAFT", "VOID", "PAID"].includes(tracked.status))
          throw new BadRequestException(
            "Payments can only be recorded against issued invoices with an outstanding balance.",
          );
        if (day < current.issueDate.toISOString().slice(0, 10))
          throw new BadRequestException(
            "Payment date cannot be before the service start date.",
          );
        if (amountCents > cents(tracked.balanceDue))
          throw new BadRequestException(
            "Payment exceeds the outstanding balance.",
          );
        await tx.invoicePayment.create({
          data: {
            invoiceId: id,
            amountCents,
            paidAt: new Date(day),
            method: data.method,
            reference: data.reference?.trim() || null,
            notes: data.notes?.trim() || null,
            idempotencyKey: data.idempotencyKey,
            recordedById: this.userId(user),
          },
        });
        await tx.invoice.update({
          where: { id },
          data: {
            status: amountCents === cents(tracked.balanceDue) ? "PAID" : "SENT",
          },
        });
        await this.audit(
          tx,
          user,
          current.businessId,
          "INVOICE_PAYMENT_RECORDED",
          { invoiceId: id, amountCents, method: data.method },
        );
        return invoiceTracking(
          await tx.invoice.findUnique({ where: { id }, include }),
        );
      },
      { timeout: 15000 },
    );
  }
  async voidPayment(
    id: string,
    paymentId: string,
    data: VoidPaymentDto,
    user: any,
    header?: string,
  ) {
    await this.invoiceAccess(id, user, header);
    if (
      typeof data.reason !== "string" ||
      !data.reason.trim() ||
      data.reason.length > 2000
    )
      throw new BadRequestException(
        "Enter a reason for reversing this payment record.",
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
      const payment = await tx.invoicePayment.findFirst({
        where: { id: paymentId, invoiceId: id },
      });
      if (!payment) throw new NotFoundException("Payment record not found.");
      if (!payment.voidedAt) {
        await tx.invoicePayment.update({
          where: { id: paymentId },
          data: {
            voidedAt: new Date(),
            voidedById: this.userId(user),
            voidReason: data.reason.trim(),
          },
        });
        await tx.invoice.update({ where: { id }, data: { status: "SENT" } });
        const invoice = await tx.invoice.findUniqueOrThrow({ where: { id } });
        await this.audit(
          tx,
          user,
          invoice.businessId,
          "INVOICE_PAYMENT_REVERSED",
          { invoiceId: id, paymentId, reason: data.reason.trim() },
        );
      }
      return invoiceTracking(
        await tx.invoice.findUnique({ where: { id }, include }),
      );
    });
  }
  async sendInvoice(id: string, user: any, businessIdHeader?: string) {
    const invoice = await this.invoiceAccess(id, user, businessIdHeader);
    if (["VOID", "CANCELLED"].includes(invoice.status))
      throw new BadRequestException("Void invoices cannot be sent.");
    (invoice as any).business = await this.prisma.business.findUnique({
      where: { id: invoice.businessId },
    });
    const { to: clientEmail, cc: ccFromClient } = invoiceRecipients(invoice.client);
    if (!clientEmail) throw new BadRequestException("Add a client billing email before sending.");
    if ([clientEmail, ...ccFromClient].some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new BadRequestException("Correct the client invoice email addresses before sending.");
    const extractEmail = (val: string) => {
      const v = String(val || "").trim();
      if (!v) return "";
      const m = v.match(/<([^>]+)>/);
      return (m?.[1] || v).trim();
    };

    const businessEmail =
      extractEmail(process.env.INVOICE_REPLY_TO || "") ||
      extractEmail(process.env.INVOICE_FROM || "") ||
      extractEmail(process.env.INVOICE_SMTP_USER || "") ||
      "";

    const logo = await loadInvoiceLogo(invoice.business?.logoUrl);
    const pdf = await generateInvoicePdf({
      logo,
      business: invoice.business,
      invoice: { ...invoice, status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status },
      businessEmail,
    });
    const invoiceNumber = invoice.invoiceNumber || "invoice";
    const subject = `Invoice ${invoiceNumber} from ${invoice.business?.name || "United Link Group"}`;

    const replyTo = process.env.INVOICE_REPLY_TO || process.env.INVOICE_FROM || process.env.INVOICE_SMTP_USER || undefined;
    const { html, text } = invoiceEmail({ business: invoice.business, invoice, balanceDue: invoiceTracking(invoice).balanceDue, hasLogo: !!logo });

    const cc = ccFromClient.length ? ccFromClient : undefined;

    const toErrorText = (val: any) => {
      if (!val) return "";
      if (typeof val === "string") return val;
      if (typeof val === "number" || typeof val === "boolean")
        return String(val);
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    };

    try {
      await this.mailer.send({
        to: clientEmail,
        cc,
        subject,
        html,
        text,
        replyTo,
        attachments: [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdf,
            contentType: "application/pdf",
          },
          ...(logo ? [{ filename: logo.format === 'PNG' ? 'business-logo.png' : 'business-logo.jpg', content: logo.bytes, contentType: logo.contentType, cid: 'business-logo@unitedlink-invoice', contentDisposition: 'inline' as const }] : []),
        ],
      });
    } catch (e: any) {
      console.error(
        "[Invoice Email] Send failed",
        e?.code || "",
        e?.response || "",
        e?.message || e,
      );
      const code = e?.code ? String(e.code) : "";
      const response = toErrorText(e?.response || e?.responseText || "");
      const msg = toErrorText(e?.message || "Unknown SMTP error");
      const responseCode = e?.responseCode
        ? ` responseCode=${e.responseCode}`
        : "";
      const command = e?.command ? ` command=${e.command}` : "";
      const detail = [response, msg].filter(Boolean)[0] || "Unknown SMTP error";
      throw new BadRequestException(
        `Failed to send invoice email${code ? ` (${code})` : ""}${responseCode}${command}: ${detail}`,
      );
    }

    await this.prisma.invoice.updateMany({
      where: { id, status: "DRAFT", updatedAt: invoice.updatedAt },
      data: { status: "SENT" },
    });
    return this.findOneInvoice(id, user, businessIdHeader);
  }
}
