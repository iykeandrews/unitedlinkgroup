import assert from "node:assert/strict";
import {
  loadInvoiceLogo,
  publicLogoAddress,
} from "../src/invoices/invoice-logo";
import { generateInvoicePdf } from "../src/invoices/invoice-pdf";
import { PDFDocument } from "pdf-lib";
import { InvoicesService } from "../src/invoices/invoices.service";
import { SmtpMailerService } from "../src/common/email/smtp-mailer.service";
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADklEQVR4XmP4z8DwH4QBEfcD/Z5+9BgAAAAASUVORK5CYII=";
const secondLogo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADklEQVR4XmNgYPj/H4QBDfsD/frl1HAAAAAASUVORK5CYII=";
async function main() {
  assert.equal(await loadInvoiceLogo(null), null);
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(publicLogoAddress(ip), false, ip);
  assert.equal(publicLogoAddress("8.8.8.8"), true);
  await assert.rejects(
    () => loadInvoiceLogo("http://127.0.0.1/private"),
    /could not be loaded/,
  );
  await assert.rejects(
    () => loadInvoiceLogo("/uploads/../private"),
    /could not be loaded/,
  );
  await assert.rejects(
    () => loadInvoiceLogo("data:text/html;base64,PHNjcmlwdD4="),
    /could not be loaded/,
  );
  const logo = await loadInvoiceLogo(png);
  assert.equal(logo?.format, "PNG");
  const invoice = {
    invoiceNumber: "LOGO-TEST",
    issueDate: "2026-10-01",
    dueDate: "2026-10-15",
    client: { name: "Synthetic Client", email: "synthetic@example.test" },
    items: [
      { description: "Example service", quantity: 1, rate: 100, amount: 100 },
    ],
    subtotal: 100,
    total: 100,
    taxAmount: 0,
    taxRate: 0,
    status: "SENT",
    amountPaid: 0,
    balanceDue: 100,
  };
  const bytes = await generateInvoicePdf({
    business: { name: "Example Business", logoUrl: png, currencyCode: "USD" },
    invoice,
  });
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  const mailer: any = new SmtpMailerService();
  const oldFrom = process.env.INVOICE_FROM;
  process.env.INVOICE_FROM = "sender@example.test";
  mailer.verified = true;
  let email: any;
  mailer.transporter = {
    sendMail: async (payload: any) => {
      email = payload;
      return { rejected: [] };
    },
  };
  await mailer.send({
    to: "client@example.test",
    subject: "Test",
    text: "Test",
    html: '<img src="cid:business-logo@unitedlink-invoice">',
    attachments: [
      {
        filename: "logo.png",
        content: logo!.bytes,
        contentType: logo!.contentType,
        cid: "business-logo@unitedlink-invoice",
      },
    ],
  });
  assert.equal(email.attachments[0].cid, "business-logo@unitedlink-invoice");
  assert.equal(email.attachments[0].contentDisposition, "inline");
  if (oldFrom === undefined) delete process.env.INVOICE_FROM;
  else process.env.INVOICE_FROM = oldFrom;
  const sent: any[] = [];
  const businesses: any = {
    businessA: { name: "Business A", logoUrl: png, currencyCode: "USD" },
    businessB: { name: "Business B", logoUrl: secondLogo, currencyCode: "USD" },
  };
  const service: any = new InvoicesService(
    {
      business: { findUnique: async ({ where }: any) => businesses[where.id] },
      invoice: { updateMany: async () => ({ count: 0 }) },
    } as any,
    { send: async (payload: any) => sent.push(payload) } as any,
  );
  service.invoiceAccess = async (id: string) => ({
    ...invoice,
    id,
    businessId: id === "invoiceA" ? "businessA" : "businessB",
    updatedAt: new Date(),
    payments: [],
  });
  service.findOneInvoice = async () => invoice;
  await service.sendInvoice("invoiceA", {
    role: "SUPER_ADMIN",
    userId: "admin",
  });
  await service.sendInvoice("invoiceB", {
    role: "SUPER_ADMIN",
    userId: "admin",
  });
  assert(
    sent[0].attachments[1].content.equals((await loadInvoiceLogo(png))!.bytes),
  );
  assert(
    sent[1].attachments[1].content.equals(
      (await loadInvoiceLogo(secondLogo))!.bytes,
    ),
  );
  assert(
    !sent[0].attachments[1].content.equals(sent[1].attachments[1].content),
  );
  assert(
    sent.every((mail) =>
      mail.html.includes("cid:business-logo@unitedlink-invoice"),
    ),
  );
  console.log(
    "Invoice logo checks passed: PDF embedding, inline email image, absent-logo fallback, and unsafe URL rejection (no email sent).",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
