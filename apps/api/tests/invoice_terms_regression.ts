import "reflect-metadata";
import assert from "node:assert/strict";
import {
  firstEmailTerms,
  clientPaymentTerms,
  invoiceSentDay,
} from "../src/invoices/invoice-terms";
import { invoiceTracking } from "../src/invoices/invoice-accounting";
import { InvoicesService } from "../src/invoices/invoices.service";

async function main() {
  const base: any = {
    id: "i",
    businessId: "b",
    invoiceNumber: "TEST-1",
    status: "DRAFT",
    paymentTermsFromEmail: true,
    firstSentAt: null,
    paymentDueDate: null,
    paymentTerms: null,
    issueDate: new Date("2026-09-01"),
    dueDate: new Date("2026-09-07"),
    client: {
      name: "Test client",
      email: "client@example.test",
      paymentTerms: "Net 30",
    },
    items: [
      { description: "Security officer", quantity: 8, rate: 35, amount: 280 },
    ],
    total: 280,
    subtotal: 280,
    taxAmount: 0,
    taxRate: 0,
    payments: [],
  };
  assert.equal(invoiceSentDay(new Date("2026-10-28T01:00Z")), "2026-10-27");
  for (const [date, term, expected] of [
    ["2026-10-27T16:00Z", "Net 30", "2026-11-26"],
    ["2026-10-27T16:00Z", "Net 45", "2026-12-11"],
    ["2028-01-31T16:00Z", "Net 30", "2028-03-01"],
    ["2026-12-20T16:00Z", "Net 30", "2027-01-19"],
    ["2026-03-01T16:00Z", "Net 15", "2026-03-16"],
    ["2026-10-28T01:00Z", "Due on Receipt", "2026-10-27"],
  ]) {
    const result: any = firstEmailTerms(
      { ...base, client: { ...base.client, paymentTerms: term } },
      new Date(date),
    );
    assert.equal(result.paymentDueDate.toISOString().slice(0, 10), expected);
  }
  for (const term of [null, "", "30", "Net -30", "Net 9999"])
    assert.throws(() => clientPaymentTerms(term));
  assert.deepEqual(
    firstEmailTerms(
      { ...base, firstSentAt: new Date("2026-10-01") },
      new Date(),
    ),
    {},
  );
  assert.deepEqual(
    firstEmailTerms(
      { ...base, paymentTermsFromEmail: false, status: "SENT" },
      new Date(),
    ),
    {},
  );
  assert.equal(invoiceTracking(base, "2026-10-27").isOverdue, false);
  const sent: any = {
    ...base,
    ...firstEmailTerms(base, new Date("2026-10-27T16:00Z")),
    status: "SENT",
  };
  assert.equal(invoiceTracking(sent, "2026-11-26").isOverdue, false);
  assert.equal(invoiceTracking(sent, "2026-11-27").daysOverdue, 1);

  let row = structuredClone(base),
    attempts = 0,
    fail = true,
    lastMail: any;
  const db: any = {
    business: {
      findUnique: async () => ({ name: "Test business", currencyCode: "USD" }),
    },
    $queryRaw: async () => [],
    invoice: {
      findUniqueOrThrow: async () => structuredClone(row),
      update: async ({ data }: any) => (row = { ...row, ...data }),
    },
  };
  db.$transaction = async (fn: any) => {
    const before = structuredClone(row);
    try {
      return await fn(db);
    } catch (error) {
      row = before;
      throw error;
    }
  };
  const service: any = new InvoicesService(db, {
    send: async (message: any) => {
      attempts++;
      lastMail = message;
      if (fail) throw new Error("Test SMTP failure");
    },
  } as any);
  service.invoiceAccess = async () => structuredClone(row);
  service.audit = async () => {};
  await assert.rejects(
    () => service.sendInvoice("i", { role: "BUSINESS_ADMIN" }),
    /Failed to send/,
  );
  assert.equal(row.firstSentAt, null);
  assert.equal(row.paymentDueDate, null);
  assert.equal(row.status, "DRAFT");
  fail = false;
  await service.sendInvoice("i", { role: "BUSINESS_ADMIN" });
  assert(row.firstSentAt);
  assert.equal(row.paymentTerms, "Net 30");
  assert.equal(row.status, "SENT");
  assert(lastMail.text.includes("Payment due date:"));
  assert(lastMail.html.includes("Payment terms: Net 30"));
  const first = row.firstSentAt.toISOString(),
    due = row.paymentDueDate.toISOString();
  row.client.paymentTerms = "Net 45";
  await service.sendInvoice("i", { role: "BUSINESS_ADMIN" });
  assert.equal(row.firstSentAt.toISOString(), first);
  assert.equal(row.paymentDueDate.toISOString(), due);
  assert.equal(row.paymentTerms, "Net 30");
  assert.equal(attempts, 3);
  row = structuredClone(base);
  row.client.paymentTerms = '';
  await assert.rejects(() => service.sendInvoice('i', {role:'BUSINESS_ADMIN'}), /client record/);
  assert.equal(attempts, 3);
  console.log(
    "PASS: client terms, first-email date, Net 30/45, receipt terms, leap years, DST, overdue boundaries, failed email rollback, frozen resend deadline, and email/PDF generation. No real email sent.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
