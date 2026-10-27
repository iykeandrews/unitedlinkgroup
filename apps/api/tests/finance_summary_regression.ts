import "reflect-metadata";
import assert from "node:assert/strict";
import {
  buildFinanceSummary,
  summaryOptions,
} from "../src/reports/finance-summary";
import { financeSummaryPdf } from "../src/reports/finance-summary-pdf";
import { ReportsService } from "../src/reports/reports.service";

async function main() {
  const employee = (id: string, rate: number) => ({
    id,
    firstName: id,
    lastName: "Worker",
    hourlyRate: rate,
    payType: "HOURLY",
    overtimeEligible: false,
    w2Profile: { payType: "HOURLY", rate, overtimeEligible: false },
    contractorProfile: { rate },
  });
  const w2 = employee("W2", 20),
    contractor = employee("1099", 25);
  const sheet = (
    id: string,
    person: any,
    date: string,
    end: string,
    workerType = "W2",
  ) => ({
    id,
    employeeId: person.id,
    employee: person,
    workerType,
    status: "APPROVED",
    startTime: new Date(date),
    endTime: new Date(end),
    locationId: "site",
    location: { name: "Test site", timeZone: "America/New_York" },
    breaks: [],
  });
  const prior = {
    ...sheet("prior", w2, "2026-09-01T10:00Z", "2026-09-01T11:00Z"),
    shiftHourlyRate: 6930,
  };
  const s1 = sheet("w2", w2, "2026-09-20T10:00Z", "2026-09-20T18:00Z"),
    s2 = sheet(
      "contractor",
      contractor,
      "2026-09-20T10:00Z",
      "2026-09-20T14:00Z",
      "CONTRACTOR_1099",
    );
  const invoice = {
    id: "inv",
    invoiceNumber: "INV-TEST",
    status: "SENT",
    locationId: "site",
    issueDate: new Date("2026-09-16"),
    dueDate: new Date("2026-09-30"),
    firstSentAt: new Date("2026-10-01T12:00Z"),
    subtotal: 1000,
    taxAmount: 50,
    total: 1050,
    payments: [],
  };
  const data: any = {
    business: { name: "Test business", currencyCode: "USD" },
    sheets: [prior, s1, s2],
    rateChanges: [],
    invoices: [
      invoice,
      { ...invoice, id: "draft", status: "DRAFT" },
      { ...invoice, id: "partial", issueDate: new Date("2026-09-01") },
    ],
    locations: [{ id: "site", name: "Test site" }],
    shifts: [
      { ...s1, id: "calendar", groupId: "group", breakMinutes: 0 },
      {
        ...s1,
        id: "draft-calendar",
        groupId: "group",
        status: "DRAFT",
        breakMinutes: 0,
      },
    ],
    stubs: [
      {
        employeeId: "W2",
        workerType: "W2",
        employee: w2,
        payrollId: "p",
        payroll: {
          periodStart: new Date("2026-09-16"),
          periodEnd: new Date("2026-09-30"),
        },
        deductions: 20,
        deductionDetails: JSON.stringify({
          loans: [{ loanId: "loan", amount: 20 }],
        }),
      },
    ],
    repayments: [
      {
        id: "repay",
        loanId: "loan",
        payrollId: "p",
        date: new Date("2026-09-30T12:00Z"),
        amount: 20,
        loan: { employeeId: "W2", employee: w2 },
      },
    ],
    loans: [
      {
        id: "loan",
        employeeId: "W2",
        employee: w2,
        createdAt: new Date("2026-09-01"),
        balance: 50,
        perPayPeriodDeduction: 15,
      },
    ],
  };
  const query = {
    from: "2026-09-16",
    to: "2026-09-30",
    basis: "SERVICE",
    extraRate: 0,
  };
  const report = buildFinanceSummary(data, query);
  assert.equal(report.totals.invoices, 1);
  assert.equal(report.totals.revenue, 1000);
  assert.equal(report.totals.invoicedTotal, 1050);
  assert.equal(report.totals.grossPay, 260);
  assert.equal(report.totals.approvedHours, 12);
  assert.equal(report.totals.scheduledHours, 8);
  assert.equal(report.totals.deductions, 20);
  const worker = report.workers.find((w) => w.employeeId === "W2");
  assert.equal(worker.taxParts.futa, 0.42);
  assert.equal(worker.employerTax, 12.66);
  assert.equal(worker.scheduledDeductions, 15);
  assert.equal(
    report.workers.find((w) => w.workerType === "CONTRACTOR_1099").employerTax,
    0,
  );
  assert.equal(report.totals.margin, 727.34);
  const orderedData = structuredClone(data);
  for (const s of orderedData.sheets) {
    s.employee.firstName = s.employeeId === "W2" ? "ZOE" : "AMY";
    s.employee.lastName = s.employeeId === "W2" ? "ADAMS" : "ZIMMERMAN";
  }
  assert.deepEqual(
    buildFinanceSummary(orderedData, query).workers.map((w) => w.employeeId),
    ["W2", "1099"],
  );
  const beforeManual = JSON.stringify(data);
  const manual = buildFinanceSummary(data, {
    ...query,
    manualAmounts: JSON.stringify({
      site: { amount: 1250, reason: "Verified client amount" },
    }),
  });
  assert.equal(manual.totals.revenue, 1250);
  assert.equal(manual.totals.invoicedTotal, 1050);
  assert.equal(manual.totals.margin, 977.34);
  assert.equal(manual.locations[0].originalRevenue, 1000);
  assert(manual.warnings.some((w) => w.includes("Verified client amount")));
  assert.equal(JSON.stringify(data), beforeManual);
  for (const value of [
    { site: { amount: -1, reason: "Invalid" } },
    { foreign: { amount: 1, reason: "Invalid" } },
    { site: { amount: 1, reason: "" } },
  ])
    assert.throws(() =>
      buildFinanceSummary(data, {
        ...query,
        manualAmounts: JSON.stringify(value),
      }),
    );
  assert(report.warnings.some((w) => w.includes("overlap")));
  assert.equal(
    buildFinanceSummary(data, { ...query, basis: "SENT" }).totals.invoices,
    0,
  );
  const optional = buildFinanceSummary(data, {
    ...query,
    extraRate: 2.7,
    extraCap: 9000,
  });
  assert.equal(
    optional.workers.find((w) => w.employeeId === "W2").taxParts.additional,
    4.32,
  );
  const missing = structuredClone(data);
  missing.sheets[1].employee.hourlyRate = null;
  missing.sheets[1].employee.w2Profile = null;
  assert(buildFinanceSummary(missing, query).totals.incomplete);
  assert.throws(() => summaryOptions({ ...query, extraRate: -1 }));
  assert.throws(() => summaryOptions({ ...query, to: "2027-01-01" }));
  const source = JSON.stringify(data);
  const pdf = financeSummaryPdf(report, null);
  assert(pdf.length > 1000);
  assert.equal(JSON.stringify(data), source);
  const service = new ReportsService({
    business: { findUnique: async () => ({ id: "b", ownerId: "owner" }) },
    employee: { findFirst: async () => null },
  } as any);
  await assert.rejects(
    () =>
      service.resolveBusiness(
        { userId: "outsider", role: "BUSINESS_ADMIN" },
        "b",
      ),
    /Access denied/,
  );
  console.log(
    "PASS: service-period revenue, draft exclusions, partial invoice warnings, approved hours, schedule deduplication, historical/shift pay, FUTA annual cap, optional tax, 1099 exclusion, deduction deduplication, incomplete wage warning, tenant access, read-only generation and PDF.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
