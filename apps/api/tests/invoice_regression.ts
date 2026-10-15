import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@unitedlinkgroup/database";
import { InvoicesService } from "../src/invoices/invoices.service";
import {
  invoiceTotals,
  invoiceTracking,
  invoiceDay,
} from "../src/invoices/invoice-accounting";
import {
  invoiceDate,
  invoiceMetrics,
  invoiceMatches,
  invoicePeriodRange,
  invoiceInPeriod,
} from "../../web/src/components/invoices/accounting";
import { ReportsService } from "../src/reports/reports.service";
import { formatCurrency, formatDate } from "../../web/src/lib/localization";
import { generateInvoicePdf } from "../src/invoices/invoice-pdf";
import { PDFDocument } from "pdf-lib";
import * as bcrypt from "bcrypt";
let checks = 0;
function equal(a: any, b: any) {
  assert.deepEqual(a, b);
  checks++;
}
function fails(fn: () => any, pattern: RegExp) {
  assert.throws(fn, pattern);
  checks++;
}
async function rejects(fn: () => Promise<any>, pattern: RegExp) {
  await assert.rejects(fn, pattern);
  checks++;
}
async function main() {
  const url = process.env.INVOICE_TEST_DATABASE_URL;
  if (
    !url ||
    !/^invoice_verification_20261013(?:_run\d+)?$/.test(
      new URL(url).searchParams.get("schema") || "",
    )
  )
    throw Error("Use the dedicated invoice verification schema.");
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    equal(invoicePeriodRange("WEEKLY", "2026-01-01"), {
      start: "2025-12-28",
      end: "2026-01-03",
    });
    equal(invoicePeriodRange("MONTHLY", "2024-02-15"), {
      start: "2024-02-01",
      end: "2024-02-29",
    });
    equal(invoicePeriodRange("QUARTERLY", "2026-05-15"), {
      start: "2026-04-01",
      end: "2026-06-30",
    });
    equal(invoicePeriodRange("YEARLY", "2026-12-31"), {
      start: "2026-01-01",
      end: "2026-12-31",
    });
    equal(invoicePeriodRange("MONTHLY", "2026-02-30"), null);
    const period = invoicePeriodRange("MONTHLY", "2026-10-13");
    equal(
      invoiceInPeriod({ status: "SENT", issueDate: "2026-10-01" }, period),
      true,
    );
    equal(
      invoiceInPeriod({ status: "PAID", issueDate: "2026-10-31" }, period),
      true,
    );
    equal(
      invoiceInPeriod({ status: "DRAFT", issueDate: "2026-10-13" }, period),
      false,
    );
    equal(
      invoiceInPeriod({ status: "VOID", issueDate: "2026-10-13" }, period),
      false,
    );
    equal(
      invoiceInPeriod({ status: "SENT", issueDate: "2026-11-01" }, period),
      false,
    );
    equal(formatCurrency(12, null), "$12.00");
    equal(formatCurrency(12, ""), "$12.00");
    equal(invoiceDate("2026-01-05T00:00:00Z"), "01/05/2026");
    equal(formatDate("2026-01-05", "United States"), "01/05/2026");
    fails(() => invoiceDay("2026-02-30"), /valid calendar/);
    fails(() => invoiceTotals([], 0, false), /between/);
    fails(
      () =>
        invoiceTotals(
          [{ description: "Test", quantity: 0, rate: 1 }],
          0,
          false,
        ),
      /positive/,
    );
    fails(
      () =>
        invoiceTotals(
          [{ description: "Test", quantity: 1, rate: NaN }],
          0,
          false,
        ),
      /finite/,
    );
    fails(
      () =>
        invoiceTotals([{ description: " ", quantity: 1, rate: 1 }], 0, false),
      /description/,
    );
    equal(
      invoiceTotals(
        [{ description: "Test", quantity: 1.5, rate: 10.01 }],
        5,
        false,
      ).total,
      15.77,
    );
    equal(
      invoiceTotals([{ description: "Test", quantity: 1, rate: 105 }], 5, true)
        .taxAmount,
      5,
    );
    equal(
      invoiceTotals([{ description: "Test", quantity: 3, rate: 0.1 }], 0, false)
        .total,
      0.3,
    );
    const invoice = {
      status: "SENT",
      total: 100,
      dueDate: new Date("2026-10-13"),
      payments: [],
    };
    equal(invoiceTracking(invoice, "2026-10-13").status, "UNPAID");
    equal(invoiceTracking(invoice, "2026-10-14").status, "OVERDUE");
    equal(
      invoiceTracking({ ...invoice, status: "DRAFT" }, "2026-10-14").isOverdue,
      false,
    );
    equal(
      invoiceTracking({ ...invoice, status: "PAID" }, "2026-10-14").legacyPaid,
      true,
    );
    equal(
      invoiceTracking({ ...invoice, status: "CANCELLED" }, "2026-10-14")
        .balanceDue,
      0,
    );
    if (await db.user.count())
      throw Error(
        "Dedicated test schema must be empty before fixtures are created.",
      );
    const owner = await db.user.create({
      data: {
        email: "invoice-preview@example.test",
        password: await bcrypt.hash("PreviewInvoice!23", 10),
        firstName: "Preview",
        lastName: "Owner",
        role: "BUSINESS_ADMIN",
      },
    });
    const outsider = await db.user.create({
      data: {
        email: "outsider@example.test",
        password: "test-only",
        role: "BUSINESS_ADMIN",
      },
    });
    const business = await db.business.create({
      data: {
        ownerId: owner.id,
        name: "UnitedLinkGroup · Invoice preview",
        country: "United States",
        currencyCode: "USD",
        address: "100 Example Street",
        city: "Example City",
        state: "DC",
        zip: "20001",
        governmentInfo: JSON.stringify({
          defaultStandardRate: 5,
          inclusive: false,
        }),
      },
    });
    const otherOwned = await db.business.create({
      data: { ownerId: owner.id, name: "Second owned test business" },
    });
    const other = await db.business.create({
      data: { ownerId: outsider.id, name: "Unrelated test business" },
    });
    const client = await db.client.create({
      data: {
        businessId: business.id,
        name: "Capitol Office · Example",
        email: "billing@example.test",
        billingContactEmail: "billing@example.test",
        address: "200 Example Avenue",
      },
    });
    const secondClient = await db.client.create({
      data: { businessId: business.id, name: "Riverside Center · Example" },
    });
    const foreignClient = await db.client.create({
      data: { businessId: other.id, name: "Foreign example" },
    });
    const site = await db.location.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        name: "Capitol site · Example",
        address: "300 Example Street",
        taxOverrideInfo: JSON.stringify({ rate: 0, inclusive: false }),
      },
    });
    const inclusiveSite = await db.location.create({
      data: {
        businessId: business.id,
        clientId: client.id,
        name: "Inclusive example site",
        address: "400 Example Street",
        taxOverrideInfo: JSON.stringify({ rate: 5, inclusive: true }),
      },
    });
    const service = new InvoicesService(
      db as any,
      {
        send: async () => {
          throw Error("Tests must not send email.");
        },
      } as any,
    );
    const user = { userId: owner.id, role: "BUSINESS_ADMIN" };
    const base = {
      clientId: client.id,
      issueDate: "2026-10-01",
      dueDate: "2026-10-30",
      items: [{ description: "Security coverage", quantity: 40, rate: 25 }],
      status: "SENT",
    };
    await rejects(() => service.findAllInvoices(user), /Select a business/);
    equal((await service.findAllInvoices(user, otherOwned.id)).length, 0);
    await rejects(() => service.findAllInvoices(user, other.id), /permission/);
    await rejects(
      () =>
        service.createInvoice(
          { ...base, clientId: foreignClient.id },
          user,
          business.id,
        ),
      /client in this business/,
    );
    await rejects(
      () =>
        service.createInvoice(
          { ...base, clientId: secondClient.id, locationId: site.id },
          user,
          business.id,
        ),
      /site belonging/,
    );
    await rejects(
      () =>
        service.createInvoice({ ...base, status: "PAID" }, user, business.id),
      /calculated/,
    );
    await rejects(
      () =>
        service.createInvoice(
          { ...base, dueDate: "2026-09-30" },
          user,
          business.id,
        ),
      /before/,
    );
    await rejects(
      () =>
        service.createInvoice(
          { ...base, dueDate: "2026-02-30" },
          user,
          business.id,
        ),
      /valid calendar/,
    );
    const draft = await service.createInvoice(
      { ...base, status: "DRAFT", invoiceNumber: "INV-DRAFT" },
      user,
      business.id,
    );
    equal(draft.status, "DRAFT");
    equal(draft.total, 1050);
    equal(draft.taxRate, 5);
    const anotherDraft = await service.createInvoice({ ...base, invoiceNumber: draft.invoiceNumber }, user, business.id);
    equal(anotherDraft.invoiceNumber === draft.invoiceNumber, false);
    await rejects(() => service.updateInvoice(draft.id, { invoiceNumber: 'MANUAL-CHANGE' }, user, business.id), /cannot be changed/);
    const concurrentNumbers = await Promise.all(Array.from({ length: 6 }, () => service.createInvoice({ ...base, invoiceNumber: draft.invoiceNumber }, user, business.id)));
    equal(new Set(concurrentNumbers.map(invoice => invoice.invoiceNumber)).size, 6);
    equal(concurrentNumbers.every(invoice => /^INV-\d{4}-\d{6,}$/.test(invoice.invoiceNumber)), true);
    const disposable = concurrentNumbers[0];
    await db.invoiceItem.deleteMany({ where: { invoiceId: disposable.id } });
    await db.invoice.delete({ where: { id: disposable.id } });
    const afterDeletion = await service.createInvoice(base, user, business.id);
    equal(afterDeletion.invoiceNumber === disposable.invoiceNumber, false);
    equal(await db.invoiceNumberReservation.count({ where: { invoiceNumber: disposable.invoiceNumber } }), 1);
    const numberCheckIds = [anotherDraft.id, afterDeletion.id, ...concurrentNumbers.map(invoice => invoice.id)];
    await db.invoiceItem.deleteMany({ where: { invoiceId: { in: numberCheckIds } } });
    await db.invoice.deleteMany({ where: { id: { in: numberCheckIds } } });
    const payment = {
      amount: 250,
      paidAt: "2026-10-13",
      method: "BANK",
      reference: "TEST-RECEIPT",
      idempotencyKey: randomUUID(),
    };
    await rejects(
      () => service.recordPayment(draft.id, payment, user, business.id),
      /issued invoices/,
    );
    const issued = await service.updateInvoice(
      draft.id,
      { status: "SENT" },
      user,
      business.id,
    );
    equal(issued.status, "UNPAID");
    equal(issued.total, 1050);
    await rejects(
      () => service.findOneInvoice(draft.id, user, otherOwned.id),
      /selected business/,
    );
    await rejects(
      () =>
        service.recordPayment(
          draft.id,
          payment,
          { userId: outsider.id, role: "BUSINESS_ADMIN" },
          business.id,
        ),
      /permission/,
    );
    await rejects(
      () =>
        service.recordPayment(
          draft.id,
          { ...payment, paidAt: "2099-01-01" },
          user,
          business.id,
        ),
      /future/,
    );
    await rejects(
      () =>
        service.recordPayment(
          draft.id,
          { ...payment, paidAt: "2026-09-30" },
          user,
          business.id,
        ),
      /before/,
    );
    await rejects(
      () =>
        service.recordPayment(
          draft.id,
          { ...payment, amount: 1050.01 },
          user,
          business.id,
        ),
      /exceeds/,
    );
    await rejects(
      () =>
        service.recordPayment(
          draft.id,
          { ...payment, amount: 1.001 },
          user,
          business.id,
        ),
      /decimal places/,
    );
    await rejects(
      () =>
        service.recordPayment(
          draft.id,
          { ...payment, method: "INVALID" },
          user,
          business.id,
        ),
      /method/,
    );
    const partial = await service.recordPayment(
      draft.id,
      payment,
      user,
      business.id,
    );
    equal(partial.status, "PARTIALLY_PAID");
    equal(partial.amountPaid, 250);
    equal(partial.balanceDue, 800);
    const again = await service.recordPayment(
      draft.id,
      payment,
      user,
      business.id,
    );
    equal(again.payments.length, 1);
    equal(again.balanceDue, 800);
    await rejects(
      () =>
        service.recordPayment(
          draft.id,
          { ...payment, amount: 200 },
          user,
          business.id,
        ),
      /different payment/,
    );
    await rejects(
      () =>
        service.updateInvoice(
          draft.id,
          { items: [{ description: "Changed", quantity: 1, rate: 5 }] },
          user,
          business.id,
        ),
      /cannot be edited/,
    );
    const full = await service.recordPayment(
      draft.id,
      {
        ...payment,
        amount: 800,
        method: "CHECK",
        idempotencyKey: randomUUID(),
      },
      user,
      business.id,
    );
    equal(full.status, "PAID");
    equal(
      (await db.invoice.findUniqueOrThrow({ where: { id: draft.id } })).status,
      "PAID",
    );
    equal(full.amountPaid, 1050);
    equal(full.balanceDue, 0);
    equal(full.payments.length, 2);
    await rejects(
      () =>
        service.recordPayment(
          draft.id,
          { ...payment, amount: 1, idempotencyKey: randomUUID() },
          user,
          business.id,
        ),
      /outstanding balance/,
    );
    await rejects(
      () =>
        service.voidPayment(
          draft.id,
          full.payments[0].id,
          { reason: " " },
          user,
          business.id,
        ),
      /reason/,
    );
    const reversed = await service.voidPayment(
      draft.id,
      full.payments[0].id,
      { reason: "Duplicate receipt recorded incorrectly" },
      user,
      business.id,
    );
    equal(reversed.status, "PARTIALLY_PAID");
    equal(reversed.balanceDue, 800);
    equal(reversed.payments.filter((p: any) => p.voidedAt).length, 1);
    const repeated = await service.voidPayment(
      draft.id,
      full.payments[0].id,
      { reason: "Same correction" },
      user,
      business.id,
    );
    equal(repeated.balanceDue, 800);
    await service.recordPayment(
      draft.id,
      {
        ...payment,
        amount: 800,
        method: "CHECK",
        idempotencyKey: randomUUID(),
      },
      user,
      business.id,
    );
    const untaxed = await service.createInvoice(
      { ...base, locationId: site.id, invoiceNumber: "INV-ZERO-TAX" },
      user,
      business.id,
    );
    equal(untaxed.total, 1000);
    equal(untaxed.taxRate, 0);
    const incl = await service.createInvoice(
      {
        ...base,
        locationId: inclusiveSite.id,
        invoiceNumber: "INV-INCLUSIVE",
        items: [{ description: "Included tax", quantity: 1, rate: 105 }],
      },
      user,
      business.id,
    );
    equal(incl.total, 105);
    equal(incl.taxAmount, 5);
    equal(incl.taxInclusive, true);
    await db.business.update({
      where: { id: business.id },
      data: { governmentInfo: JSON.stringify({ defaultStandardRate: 10 }) },
    });
    const changed = await service.updateInvoice(
      untaxed.id,
      { items: [{ description: "More service", quantity: 2, rate: 100 }] },
      user,
      business.id,
    );
    equal(changed.total, 200);
    equal(changed.taxRate, 0);
    const changedInclusive = await service.updateInvoice(
      incl.id,
      { items: [{ description: "More included", quantity: 2, rate: 105 }] },
      user,
      business.id,
    );
    equal(changedInclusive.total, 210);
    equal(changedInclusive.taxAmount, 10);
    const clearSite = await service.updateInvoice(
      untaxed.id,
      { locationId: null } as any,
      user,
      business.id,
    );
    equal(clearSite.locationId, null);
    equal(clearSite.taxRate, 10);
    equal(clearSite.total, 220);
    const race = await service.createInvoice(
      {
        ...base,
        locationId: site.id,
        invoiceNumber: "INV-CONCURRENCY",
        items: [{ description: "Race test", quantity: 1, rate: 100 }],
      },
      user,
      business.id,
    );
    const simultaneous = await Promise.allSettled([
      service.recordPayment(
        race.id,
        { ...payment, amount: 75, idempotencyKey: randomUUID() },
        user,
        business.id,
      ),
      service.recordPayment(
        race.id,
        { ...payment, amount: 75, idempotencyKey: randomUUID() },
        user,
        business.id,
      ),
    ]);
    equal(simultaneous.filter((r) => r.status === "fulfilled").length, 1);
    equal(
      (await service.findOneInvoice(race.id, user, business.id)).amountPaid,
      75,
    );
    const idempotent = await service.createInvoice(
      {
        ...base,
        locationId: site.id,
        invoiceNumber: "INV-RETRY",
        items: [{ description: "Retry test", quantity: 1, rate: 100 }],
      },
      user,
      business.id,
    );
    const sameRequest = {
      ...payment,
      amount: 25,
      idempotencyKey: randomUUID(),
    };
    await Promise.all([
      service.recordPayment(idempotent.id, sameRequest, user, business.id),
      service.recordPayment(idempotent.id, sameRequest, user, business.id),
    ]);
    equal(
      (await service.findOneInvoice(idempotent.id, user, business.id)).payments
        .length,
      1,
    );
    const voidInvoice = await service.createInvoice(
      { ...base, invoiceNumber: "INV-VOID" },
      user,
      business.id,
    );
    equal(
      (
        await service.updateInvoice(
          voidInvoice.id,
          { status: "VOID" },
          user,
          business.id,
        )
      ).balanceDue,
      0,
    );
    await rejects(
      () => service.recordPayment(voidInvoice.id, payment, user, business.id),
      /issued invoices/,
    );
    const overdue = await service.createInvoice(
      {
        ...base,
        invoiceNumber: "INV-OVERDUE",
        dueDate: "2026-10-10",
        items: [{ description: "Past due example", quantity: 1, rate: 500 }],
      },
      user,
      business.id,
    );
    equal(overdue.status, "OVERDUE");
    equal(overdue.daysOverdue, Math.floor((Date.parse(new Date().toISOString().slice(0,10)) - Date.parse("2026-10-10")) / 86400000));
    const overduePartial = await service.recordPayment(
      overdue.id,
      { ...payment, amount: 200, idempotencyKey: randomUUID() },
      user,
      business.id,
    );
    equal(overduePartial.status, "OVERDUE");
    equal(overduePartial.paymentStatus, "PARTIALLY_PAID");
    equal(invoiceMatches(overduePartial, "PARTIALLY_PAID"), true);
    equal(invoiceMatches(overduePartial, "OPEN"), true);
    const all = await service.findAllInvoices(user, business.id);
    const metrics = invoiceMetrics(all);
    equal(metrics.outstanding, 880);
    const overview = await new ReportsService(db as any).getBusinessOverview(
      business.id,
    );
    equal(overview.kpis.outstandingTotal, 880);
    equal(overview.kpis.overdueTotal, 350);
    equal(overview.kpis.revenueLastTotal, 1350);
    equal(metrics.paid, 1350);
    equal(metrics.overdue, 350);
    equal(metrics.aging[1].amount, 350);
    equal(
      await db.auditLog.count({
        where: { businessId: business.id, action: "INVOICE_PAYMENT_RECORDED" },
      }),
      6,
    );
    await rejects(
      () =>
        service.createClient({ name: " ", email: "bad" }, user, business.id),
      /client name/,
    );
    await rejects(
      () =>
        service.updateInvoice(
          untaxed.id,
          {
            notes: "Stale update",
            expectedUpdatedAt: "2026-01-01T00:00:00Z",
          } as any,
          user,
          business.id,
        ),
      /changed since/,
    );
    await db.location.update({
      where: { id: site.id },
      data: { taxOverrideInfo: "not-json" },
    });
    await rejects(
      () => service.taxContext(user, business.id, client.id, site.id),
      /Tax settings are invalid/,
    );
    await db.location.update({
      where: { id: site.id },
      data: { taxOverrideInfo: JSON.stringify({ rate: 0, inclusive: false }) },
    });
    const newClient = await service.createClient(
      {
        name: "New billing client",
        email: "new@example.test",
        businessId: other.id,
      },
      user,
      business.id,
    );
    equal(newClient.businessId, business.id);
    equal(newClient.billingContactEmail, "new@example.test");
    const many = Array.from({ length: 90 }, (_, i) => ({
      description: `Line ${i + 1} — Detailed security coverage`,
      quantity: 1,
      rate: 10,
      amount: 10,
    }));
    const pdf = await generateInvoicePdf({
      business,
      invoice: { ...overduePartial, items: many, notes: "Terms ".repeat(300) },
    });
    equal((await PDFDocument.load(pdf)).getPageCount() > 1, true);
    equal(pdf.toString("latin1").includes("10/01/2026"), true);
    equal(pdf.toString("latin1").includes("10/10/2026"), true);
    console.log(
      `Passed ${checks} invoice checks against isolated PostgreSQL, including concurrent payments, balance reconciliation, tenant access, PDF pagination, and U.S. dates.`,
    );
    console.log(`Synthetic preview business: ${business.id}`);
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
