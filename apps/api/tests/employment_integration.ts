import * as bcrypt from "bcrypt";
import assert from "node:assert/strict";
import { PayrollService } from "../src/payroll/payroll.service";

import { PrismaClient } from "@unitedlinkgroup/database";
import { EmployeesService } from "../src/employees/employees.service";
const url = process.env.EMPLOYMENT_TEST_DATABASE_URL;
if (
  !url ||
  !/^employment_verification_20261014(?:_run\d+)?$/.test(
    new URL(url).searchParams.get("schema") || "",
  )
)
  throw new Error("Use an isolated employment verification schema.");
const db: any = new PrismaClient({ datasources: { db: { url } } });
const peopleService = new EmployeesService(
  db as any,
  {} as any,
  {} as any,
  {} as any,
);
const service = new PayrollService(db, {} as any);
let checks = 0;
function equal(a: any, b: any) {
  assert.deepEqual(a, b);
  checks++;
}
async function rejects(fn: () => Promise<any>, pattern: RegExp) {
  await assert.rejects(fn, pattern);
  checks++;
}
const address = {
  address: "12 Synthetic Street",
  city: "Example City",
  state: "DC",
  zip: "20001",
  jurisdictionIds: [],
  localJurisdictionsReviewed: true,
};
const profile = {
  version: 1,
  residence: address,
  workLocations: [{ ...address, wagePercent: 100 }],
  w4FormYear: 2026,
  federalExempt: false,
  nonresidentAlien: false,
  elections: [],
};
function rule(
  id: string,
  category: string,
  payer: string,
  rate: number,
  cap: number | null,
) {
  return {
    id,
    label: `Synthetic ${id} (not statutory)`,
    state: "DC",
    category,
    payer,
    basis: "WORK",
    method: "FLAT",
    ratePercent: rate,
    brackets: [],
    annualDeduction: 0,
    allowanceValue: 0,
    annualCredit: 0,
    wageCap: cap,
    reciprocityStates: [],
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
  };
}
const config: any = {
  rules: [
    rule("dc-income", "STATE_INCOME", "EMPLOYEE", 2, null),
    rule("dc-ui", "UNEMPLOYMENT", "EMPLOYER", 2, 10000),
    rule("futa", "FUTA", "EMPLOYER", 0.6, 7000),
  ],
  reviewedStates: ["DC"],
  workweekAnchor: "2026-01-04T00:00:00-05:00",
  payrollTimeZone: "America/New_York",
};
async function main() {
  if (await db.user.count())
    throw new Error("Verification schema must be empty.");
  if (await db.business.count())
    throw new Error("Use a fresh empty verification database.");
  const owner = await db.user.create({
    data: {
      email: "payroll-verification@example.test",
      password: await bcrypt.hash("EmploymentPreview!23", 10),
      role: "BUSINESS_ADMIN",
    },
  });
  const user = { userId: owner.id, role: "BUSINESS_ADMIN" };
  const business = await db.business.create({
    data: {
      name: "Synthetic payroll verification",
      ownerId: owner.id,
      country: "US",
      currencyCode: "USD",
      settings: JSON.stringify({ unrelatedPreference: "preserved" }),
    },
  });
  const employee = await db.employee.create({
    data: {
      businessId: business.id,
      firstName: "Example",
      lastName: "Worker",
      email: "worker@example.test",
      type: "FULL_TIME",
      payType: "HOURLY",
      hourlyRate: 25,
      paySchedule: "BI_WEEKLY",
      filingStatus: "SINGLE",
      state: "DC",
      taxState: "DC",
    },
  });
  await db.w2Profile.create({
    data: {
      employeeId: employee.id,
      rate: 30,
      payType: "HOURLY",
      filingStatus: "SINGLE",
      taxState: "DC",
      paySchedule: "BI_WEEKLY",
    },
  });
  await service.saveTaxRules(business.id, config, user);
  equal(
    JSON.parse(
      (await db.business.findUnique({ where: { id: business.id } })).settings,
    ).unrelatedPreference,
    "preserved",
  );
  await service.saveEmployeeTaxProfile(business.id, employee.id, profile, user);
  const loan = await db.loan.create({
    data: {
      employeeId: employee.id,
      amount: 300,
      balance: 300,
      termMonths: 3,
      perPayPeriodDeduction: 100,
      status: "APPROVED",
    },
  });
  const policy = await db.leaveType.create({
    data: {
      businessId: business.id,
      name: "Synthetic leave policy",
      accrualFrequency: "MONTHLY",
      accrualRate: 2,
      maxBalance: 20,
    },
  });
  const days = [
    "01",
    "02",
    "05",
    "06",
    "07",
    "08",
    "09",
    "12",
    "13",
    "14",
    "15",
    "16",
    "19",
    "20",
    "21",
    "22",
    "23",
    "26",
    "27",
    "28",
  ];
  for (const d of days)
    await db.timesheet.create({
      data: {
        employeeId: employee.id,
        workerType: "W2",
        status: "APPROVED",
        startTime: new Date(`2026-10-${d}T13:00:00Z`),
        endTime: new Date(`2026-10-${d}T21:00:00Z`),
      },
    });
  const payroll = await service.createPayroll(
    business.id,
    new Date("2026-10-01"),
    new Date("2026-10-14"),
    new Date("2026-10-16"),
    "REGULAR",
    user,
    "BI_WEEKLY",
  );
  equal(payroll.calendarTimeZone, "America/New_York");
  equal(payroll.periodStart.toISOString(), "2026-10-01T04:00:00.000Z");
  equal(payroll.periodEnd.toISOString(), "2026-10-15T03:59:59.999Z");
  equal(
    (
      await service.createPayroll(
        business.id,
        new Date("2026-10-01"),
        new Date("2026-10-14"),
        new Date("2026-10-16"),
        "REGULAR",
        user,
        "BI_WEEKLY",
      )
    ).id,
    payroll.id,
  );
  await rejects(
    () =>
      service.createPayroll(
        business.id,
        new Date("2026-10-10"),
        new Date("2026-10-20"),
        new Date("2026-10-22"),
        "REGULAR",
        user,
        "BI_WEEKLY",
      ),
    /overlaps/,
  );
  let draft = await service.runPayrollCalculation(payroll.id, user);
  equal(draft.totalGross, 2400);
  equal(draft.totalEmployeeTaxes, 435.75);
  equal(draft.totalEmployerTaxes, 246);
  equal(draft.totalDeductions, 100);
  equal(draft.totalNet, 1864.25);
  equal(draft.payStubs[0].regularHours, 80);
  equal(draft.taxReadiness.complete, true);
  equal(await db.leaveBalance.count(), 0);
  equal((await db.loan.findUnique({ where: { id: loan.id } })).balance, 300);
  draft = await service.runPayrollCalculation(payroll.id, user);
  equal(await db.payStub.count({ where: { payrollId: payroll.id } }), 1);
  equal(await db.leaveBalance.count(), 0);
  await rejects(
    () => service.updatePayStub(draft.payStubs[0].id, { stateTax: 0 }, user),
    /cannot be manually overwritten/,
  );
  const before = await db.payStub.findUnique({
    where: { id: draft.payStubs[0].id },
  });
  await rejects(
    () => service.updatePayStub(before.id, { deductions: 99999 }, user),
    /available wages/,
  );
  equal(
    (await db.payStub.findUnique({ where: { id: before.id } })).netPay,
    before.netPay,
  );
  const changed = {
    ...config,
    rules: config.rules.map((r: any) =>
      r.category === "STATE_INCOME" ? { ...r, ratePercent: 3 } : r,
    ),
  };
  await service.saveTaxRules(business.id, changed, user);
  equal(
    (await service.getPayrollById(payroll.id, user)).taxReadiness.complete,
    false,
  );
  await rejects(
    () => service.finalizePayroll(payroll.id, user),
    /settings changed/,
  );
  equal(
    (await db.payroll.findUnique({ where: { id: payroll.id } })).status,
    "DRAFT",
  );
  equal(await db.loanRepayment.count(), 0);
  draft = await service.runPayrollCalculation(payroll.id, user);
  equal(draft.totalNet, 1840.25);
  const paid = await service.finalizePayroll(payroll.id, user);
  equal(paid.status, "PAID");
  equal((await db.loan.findUnique({ where: { id: loan.id } })).balance, 200);
  equal(
    (
      await db.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: employee.id,
            leaveTypeId: policy.id,
          },
        },
      })
    ).balanceHours,
    2,
  );
  equal(await db.loanRepayment.count(), 1);
  await rejects(
    () => service.finalizePayroll(payroll.id, user),
    /already finalized/,
  );
  await rejects(
    () => service.runPayrollCalculation(payroll.id, user),
    /Only draft/,
  );
  await rejects(
    () =>
      service.updatePayStub(draft.payStubs[0].id, { regularHours: 80 }, user),
    /cannot be edited/,
  );
  await rejects(() => service.deletePayroll(payroll.id, user), /Only draft/);
  equal(
    (
      await db.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: employee.id,
            leaveTypeId: policy.id,
          },
        },
      })
    ).balanceHours,
    2,
  );
  const second = await service.createPayroll(
    business.id,
    new Date("2026-10-15"),
    new Date("2026-10-28"),
    new Date("2026-10-30"),
    "REGULAR",
    user,
    "BI_WEEKLY",
  );
  draft = await service.runPayrollCalculation(second.id, user);
  equal(draft.payStubs[0].ytdGross, 4800);
  const paidBefore = await db.payStub.findFirst({
    where: { payrollId: payroll.id },
  });
  await peopleService.update(
    user,
    employee.id,
    {
      hourlyRate: 35,
      additionalWithholding: 25,
      stateAdditionalWithholding: 10,
    },
    business.id,
  );
  const saved = await db.employee.findUnique({
    where: { id: employee.id },
    include: { w2Profile: true },
  });
  equal(saved.hourlyRate, 35);
  equal(saved.w2Profile.rate, 35);
  equal(saved.w2Profile.additionalWithholding, 25);
  equal(saved.w2Profile.stateAdditionalWithholding, 10);
  await rejects(
    () => service.finalizePayroll(second.id, user),
    /Recalculate|changed|recalculated/,
  );
  draft = await service.runPayrollCalculation(second.id, user);
  equal(draft.payStubs[0].grossPay, 2800);
  const detail = JSON.parse(draft.payStubs[0].taxDetails);
  equal(detail.stateTax, 94);
  const paidAfter = await db.payStub.findFirst({
    where: { payrollId: payroll.id },
  });
  equal(paidAfter.grossPay, paidBefore.grossPay);
  equal(paidAfter.netPay, paidBefore.netPay);
  const directory = await peopleService.findAll(user, undefined, business.id);
  equal(directory.find((e: any) => e.id === employee.id)?.hourlyRate, 35);
  await peopleService.update(
    user,
    employee.id,
    { hourlyRate: 30, additionalWithholding: 0, stateAdditionalWithholding: 0 },
    business.id,
  );
  draft = await service.runPayrollCalculation(second.id, user);

  // Simulate another approved loan adjustment after draft calculation. Approval must roll back.
  await db.loan.update({ where: { id: loan.id }, data: { balance: 50 } });
  await rejects(
    () => service.finalizePayroll(second.id, user),
    /Loan balance changed/,
  );
  equal(
    (await db.payroll.findUnique({ where: { id: second.id } })).status,
    "DRAFT",
  );
  equal(await db.loanRepayment.count(), 1);
  equal(
    (
      await db.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: employee.id,
            leaveTypeId: policy.id,
          },
        },
      })
    ).balanceHours,
    2,
  );
  draft = await service.runPayrollCalculation(second.id, user);
  equal(draft.totalDeductions, 50);
  await service.finalizePayroll(second.id, user);
  equal((await db.loan.findUnique({ where: { id: loan.id } })).status, "PAID");
  equal((await db.loan.findUnique({ where: { id: loan.id } })).balance, 0);
  equal(await db.loanRepayment.count(), 2);
  const report = await service.getAnnualTaxReport(business.id, 2026, user);
  equal(report.summary.totalW2Gross, 4800);
  equal(report.summary.totalTaxesWithheld, 919.5);
  equal(report.w2Employees[0].breakdown.stateTax, 144);
  const forms = await service.getYearEndForms(business.id, 2026, user);
  equal(forms.filingStatus, "PREPARATION_SUMMARY");
  equal(forms.w2s[0].medicareTax, 69.6);
  console.log(
    `Passed ${checks} isolated employment/payroll database integration checks`,
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
