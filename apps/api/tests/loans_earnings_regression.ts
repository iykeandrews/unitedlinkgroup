import assert from "node:assert/strict";
import { LoansService } from "../src/loans/loans.service";
import { PayrollService } from "../src/payroll/payroll.service";
async function main() {
  const realDate = Date;
  const fixed = Date.parse("2026-11-05T16:00:00Z");
  class FixedDate extends Date {
    constructor(v?: any) {
      super(v === undefined ? fixed : v);
    }
    static now() {
      return fixed;
    }
  }
  global.Date = FixedDate as any;
  let sheets: any[] = [
    {
      id: "t",
      employeeId: "e",
      workerType: "W2",
      status: "APPROVED",
      startTime: new Date("2026-11-02T11:00:00Z"),
      endTime: new Date("2026-11-02T19:00:00Z"),
      breaks: [
        {
          type: "UNPAID",
          startTime: new Date("2026-11-02T15:00:00Z"),
          endTime: new Date("2026-11-02T15:30:00Z"),
        },
      ],
      shiftHourlyRate: 22,
    },
  ];
  let paid: any[] = [],
    loans: any[] = [],
    created: any;
  const employee: any = {
    id: "e",
    businessId: "b",
    userId: "u",
    status: "ACTIVE",
    workerType: "W2",
    payType: "HOURLY",
    hourlyRate: 20,
    overtimeEligible: true,
    business: { settings: "{}" },
  };
  const db: any = {
    business: { findFirst: async () => ({ id: "b" }) },
    employee: {
      findUnique: async () => employee,
      findFirst: async ({ where }: any) =>
        where.id === "foreign" ? null : employee,
    },
    timesheet: { findMany: async () => sheets },
    payStub: { findMany: async () => paid },
    flexPay: { findMany: async () => [] },
    loan: {
      findMany: async ({ where }: any) =>
        loans.filter((l) => l.id !== where.id?.not),
      create: async ({ data }: any) => {
        created = { ...data, id: "l" };
        return created;
      },
      findUnique: async () => ({ ...created, employee }),
      updateMany: async () => ({ count: 1 }),
    },
    $transaction: async (fn: any, opts: any) => {
      assert.equal(opts.isolationLevel, "Serializable");
      return fn(db);
    },
  };
  const svc: any = new LoansService(db),
    actor: any = { userId: "u", businessId: "b", role: "EMPLOYEE" };
  let limit = await svc.eligibility(actor);
  assert.equal(limit.approvedUnpaidHours, 7.5);
  assert.equal(limit.maximumAmount, 165);
  loans = [{ id: "prior", balance: 50 }];
  assert.equal((await svc.eligibility(actor)).maximumAmount, 115);
  await assert.rejects(
    () => svc.requestLoan("u", 116, 0, undefined, "b", "NEXT_PAY"),
    /exceeds/,
  );
  const loan = await svc.requestLoan("u", 115, 0, undefined, "b", "NEXT_PAY");
  assert.equal(loan.perPayPeriodDeduction, 115);
  assert.equal(loan.termMonths, 0);
  await assert.rejects(() => svc.requestLoan("u", NaN), /positive/);
  await assert.rejects(() => svc.requestLoan("u", -10), /positive/);
  await assert.rejects(() => svc.requestLoan("u", 10.001), /decimal/);
  await assert.rejects(
    () =>
      svc.requestLoanByEmployeeId(
        "foreign",
        1,
        1,
        undefined,
        { ...actor, role: "BUSINESS_ADMIN" },
        "b",
      ),
    /not found/,
  );
  const installment = await svc.requestLoan(
    "u",
    10,
    2,
    undefined,
    "b",
    "INSTALLMENTS",
  );
  assert.equal(installment.perPayPeriodDeduction, 2.5);
  loans = [];
  paid = [
    {
      workerType: "W2",
      payroll: {
        periodStart: new Date("2026-11-01T00:00Z"),
        periodEnd: new Date("2026-11-15T23:59Z"),
      },
    },
  ];
  assert.equal((await svc.eligibility(actor)).maximumAmount, 0);
  paid = [];
  sheets[0].paidExternally = true;
  assert.equal((await svc.eligibility(actor)).maximumAmount, 0);
  sheets[0].paidExternally = false;
  // Approval rechecks earnings rather than trusting the previously shown limit.
  created = { id: "l", employeeId: "e", amount: 200, status: "PENDING" };
  await assert.rejects(
    () => svc.approveLoan("l", { ...actor, role: "BUSINESS_ADMIN" }, "b"),
    /no longer cover/,
  );
  const payroll: any = new PayrollService(
    {
      payroll: {
        findUnique: async () => ({ payDate: new Date("2026-11-15T00:00Z") }),
      },
      flexPay: { findMany: async () => [] },
      loan: {
        findMany: async () => [
          { id: "l", balance: 115, termMonths: 0, perPayPeriodDeduction: 0 },
        ],
      },
    } as any,
    {} as any,
  );
  let d = await payroll.calculateDeductions("e", "p", 200);
  assert.equal(d.totalDeductions, 115);
  d = await payroll.calculateDeductions("e", "p", 80);
  assert.equal(d.totalDeductions, 80);
  d = await payroll.calculateDeductions("e", "p", 0);
  assert.equal(d.totalDeductions, 0);
  d = await payroll.calculateDeductions("e", "p", 200, new Map([["l", 80]]));
  assert.equal(d.totalDeductions, 35);
  global.Date = realDate;
  console.log(
    "Loan eligibility, paid-work exclusion, reservations, tenancy, approval and next-pay deduction checks passed",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
