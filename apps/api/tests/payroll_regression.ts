import assert from "node:assert/strict";
import {
  calculateFederal,
  validateTaxProfile,
  money,
  validDay,
} from "../src/payroll/us-tax";
import { manualTaxes, validateRules } from "../src/payroll/manual-tax";
import { calculateHours, paidIntervals } from "../src/payroll/hours";
import { calendarBoundary, fullSalaryPeriod } from "../src/payroll/dates";
import { PayrollService } from "../src/payroll/payroll.service";
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
const employee: any = {
  id: "e1",
  businessId: "b",
  firstName: "Ada",
  lastName: "Jones",
  workerType: "W2",
  payType: "HOURLY",
  hourlyRate: 25,
  paySchedule: "BI_WEEKLY",
  filingStatus: "SINGLE",
  federalAllowances: 0,
  multipleJobs: false,
  dependentsAmount: 0,
  otherIncome: 0,
  deductionsAmount: 0,
  additionalWithholding: 0,
  stateAdditionalWithholding: 0,
  stateAllowances: 0,
  taxState: "VA",
  overtimeEligible: true,
};
const address = (state: string) => ({
  address: "1 Example Street",
  city: "Example City",
  state,
  zip: "20001",
  jurisdictionIds: [],
  localJurisdictionsReviewed: true,
});
const profile: any = {
  version: 1,
  residence: address("MD"),
  workLocations: [
    { ...address("VA"), wagePercent: 60 },
    { ...address("MD"), wagePercent: 40 },
  ],
  w4FormYear: 2026,
  federalExempt: false,
  nonresidentAlien: false,
  elections: [],
};
const rule = (
  id: string,
  state: string,
  category = "STATE_INCOME",
  payer = "EMPLOYEE",
  basis = "WORK",
  ratePercent = 3,
  wageCap: number | null = null,
): any => ({
  id,
  label: id,
  state,
  category,
  payer,
  basis,
  method: "FLAT",
  ratePercent,
  wageCap,
  brackets: [],
  annualDeduction: 0,
  allowanceValue: 0,
  annualCredit: 0,
  reciprocityStates: [],
  creditForWorkStates: [],
  effectiveFrom: "2026-01-01",
  effectiveTo: "2026-12-31",
});
// Synthetic state rules exercise configurable arithmetic; these are not legal state rates.
const config: any = {
  version: 1,
  reviewedStates: ["MD", "VA"],
  reviewedBy: "admin",
  reviewedAt: "2026-01-01",
  workweekAnchor: "2026-01-04T00:00:00Z",
  payrollTimeZone: "America/New_York",
  rules: [
    rule("VA-income", "VA"),
    {
      ...rule("MD-income", "MD", "STATE_INCOME", "EMPLOYEE", "RESIDENCE", 5),
      creditForWorkStates: ["VA"],
    },
    rule("VA-ui", "VA", "UNEMPLOYMENT", "EMPLOYER", "WORK", 2, 10000),
    rule("MD-ui", "MD", "UNEMPLOYMENT", "EMPLOYER", "WORK", 2, 10000),
    rule("VA-futa", "VA", "FUTA", "EMPLOYER", "WORK", 0.6, 7000),
    rule("MD-futa", "MD", "FUTA", "EMPLOYER", "WORK", 0.6, 7000),
  ],
};
const date = new Date("2026-10-15T00:00:00Z");
const shift = (start: string, end: string, breaks: any[] = []) => ({
  startTime: new Date(start),
  endTime: new Date(end),
  breaks,
});
async function main() {
  // Independent hand-worked Worksheet 1A vectors: $52,000 annual wages, 26 pay periods.
  equal(
    calculateFederal(2000, employee, 0, 2026).employeeTaxDetails.federalTax,
    156.15,
  );
  equal(
    calculateFederal(
      2000,
      { ...employee, filingStatus: "MARRIED_JOINT" },
      0,
      2026,
    ).employeeTaxDetails.federalTax,
    76.15,
  );
  equal(
    calculateFederal(
      2000,
      { ...employee, filingStatus: "HEAD_OF_HOUSEHOLD" },
      0,
      2026,
    ).employeeTaxDetails.federalTax,
    114.92,
  );
  equal(
    calculateFederal(
      2000,
      { ...employee, filingStatus: "MARRIED_SEPARATE" },
      0,
      2026,
    ).employeeTaxDetails.federalTax,
    156.15,
  );
  equal(
    calculateFederal(2000, { ...employee, multipleJobs: true }, 0, 2026)
      .employeeTaxDetails.federalTax,
    270.19,
  );
  equal(
    calculateFederal(
      2000,
      { ...employee, dependentsAmount: 2000, additionalWithholding: 10 },
      0,
      2026,
    ).employeeTaxDetails.federalTax,
    89.23,
  );
  equal(
    calculateFederal(
      2000,
      { ...employee, otherIncome: 10000, deductionsAmount: 10000 },
      0,
      2026,
    ).employeeTaxDetails.federalTax,
    156.15,
  );
  equal(
    calculateFederal(2000, { ...employee, federalAllowances: 2 }, 0, 2026, {
      ...profile,
      w4FormYear: 2019,
    }).employeeTaxDetails.federalTax,
    156.15,
  );
  equal(
    calculateFederal(2000, employee, 0, 2026).employeeTaxDetails.socialSecurity,
    124,
  );
  equal(
    calculateFederal(2000, employee, 183500, 2026).employeeTaxDetails
      .socialSecurity,
    62,
  );
  equal(
    calculateFederal(2000, employee, 184500, 2026).employeeTaxDetails
      .socialSecurity,
    0,
  );
  equal(
    calculateFederal(2000, employee, 199000, 2026).employeeTaxDetails
      .additionalMedicare,
    9,
  );
  equal(
    calculateFederal(2000, employee, 201000, 2026).employeeTaxDetails
      .additionalMedicare,
    18,
  );
  equal(
    calculateFederal(2000, employee, 201000, 2026).employerTaxDetails.medicare,
    29,
  );
  equal(
    calculateFederal(2000, employee, 0, 2026, {
      ...profile,
      federalExempt: true,
      federalExemptYear: 2026,
    }).employeeTaxDetails.federalTax,
    0,
  );
  equal(
    calculateFederal(2000, employee, 0, 2026, {
      ...profile,
      federalExempt: true,
      federalExemptYear: 2026,
    }).employeeTaxDetails.socialSecurity,
    124,
  );
  equal(
    calculateFederal(10, { ...employee, dependentsAmount: 5000 }, 0, 2026)
      .employeeTaxDetails.federalTax,
    0,
  );
  equal(
    calculateFederal(
      1000000,
      { ...employee, paySchedule: "MONTHLY", multipleJobs: true },
      0,
      2026,
    ).employeeTaxDetails.federalTax,
    367916.68,
  );
  fails(() => calculateFederal(2000, employee, 0, 2027), /tables/);
  fails(() => calculateFederal(NaN, employee, 0, 2026), /finite/);
  fails(
    () => calculateFederal(2000, { ...employee, paySchedule: "BAD" }, 0, 2026),
    /frequency/,
  );
  fails(
    () =>
      calculateFederal(2000, { ...employee, federalAllowances: 2 }, 0, 2026),
    /form year/,
  );
  fails(
    () =>
      calculateFederal(2000, employee, 0, 2026, {
        ...profile,
        federalExempt: true,
        federalExemptYear: 2025,
      }),
    /renewed/,
  );
  fails(
    () =>
      calculateFederal(2000, employee, 0, 2026, {
        ...profile,
        nonresidentAlien: true,
      }),
    /provider/,
  );
  equal(validateTaxProfile(profile).workLocations.length, 2);
  fails(
    () =>
      validateTaxProfile({
        ...profile,
        workLocations: [{ ...address("VA"), wagePercent: 90 }],
      }),
    /total 100/,
  );
  fails(
    () => validateTaxProfile({ ...profile, residence: address("ZZ") }),
    /US street/,
  );
  equal(validateRules(config).rules.length, 6);
  fails(
    () =>
      validateRules({
        ...config,
        rules: [{ ...config.rules[0], ratePercent: 101 }],
      }),
    /100/,
  );
  fails(
    () =>
      validateRules({
        ...config,
        rules: [config.rules[0], { ...config.rules[0], id: "duplicate" }],
      }),
    /Overlapping/,
  );
  fails(
    () =>
      validateRules({
        ...config,
        rules: [{ ...config.rules[4], wageCap: 10000 }],
      }),
    /7,000/,
  );
  fails(
    () =>
      validateRules({
        ...config,
        rules: [{ ...config.rules[0], effectiveTo: "2027-01-01" }],
      }),
    /within one tax year/,
  );
  fails(
    () => validateRules({ ...config, payrollTimeZone: "Invalid" }),
    /time zone/,
  );
  equal(validDay("2026-02-30"), false);
  equal(validDay("2026-02-28"), true);
  fails(
    () =>
      validateRules({
        ...config,
        rules: [{ ...config.rules[0], effectiveFrom: "2026-02-30" }],
      }),
    /start\/end dates/,
  );
  const creditBrackets = {
    ...config.rules[0],
    method: "ANNUAL_BRACKETS",
    brackets: [
      { threshold: 0, ratePercent: 10 },
      { threshold: 26000, ratePercent: 20 },
    ],
    annualDeduction: 0,
    annualCredit: 0,
    allowanceValue: 260,
    allowanceMethod: "CREDIT",
    annualizeTotalWages: true,
  } as any;
  const allowanceProfile = {
    ...profile,
    elections: [
      {
        jurisdiction: "VA",
        form: "Signed example",
        effectiveDate: "2026-01-01",
        parameters: { allowances: 1 },
      },
    ],
  };
  equal(
    manualTaxes(
      {
        ...config,
        rules: config.rules.map((r: any) => (r.id === creditBrackets.id ? creditBrackets : r)),
      },
      allowanceProfile,
      2000,
      26,
      date,
      [],
      employee,
    ).lines.find((l) => l.ruleId === creditBrackets.id)!.amount,
    174,
  );
  equal(
    fullSalaryPeriod(
      new Date("2026-10-01"),
      new Date("2026-10-14"),
      "BIWEEKLY",
      "UTC",
    ),
    true,
  );
  equal(
    fullSalaryPeriod(
      new Date("2026-10-01"),
      new Date("2026-10-07"),
      "BIWEEKLY",
      "UTC",
    ),
    false,
  );
  equal(
    fullSalaryPeriod(
      new Date("2026-02-16"),
      new Date("2026-02-28"),
      "SEMIMONTHLY",
      "UTC",
    ),
    true,
  );
  equal(
    fullSalaryPeriod(
      new Date("2026-02-01"),
      new Date("2026-02-28"),
      "MONTHLY",
      "UTC",
    ),
    true,
  );
  const result = manualTaxes(config, profile, 2000, 26, date, [], employee);
  equal(result.issues, []);
  equal(result.lines.find((l) => l.ruleId === "VA-income")!.amount, 36);
  equal(result.lines.find((l) => l.ruleId === "MD-income")!.amount, 64);
  const reciprocal = {
    ...config,
    rules: config.rules.map((r: any) =>
      r.id === "VA-income" ? { ...r, reciprocityStates: ["MD"] } : r,
    ),
  };
  const signed = {
    ...profile,
    elections: [
      {
        jurisdiction: "VA",
        form: "Signed example certificate",
        effectiveDate: "2026-01-01",
        exemption: false,
        reciprocity: true,
        parameters: {},
      },
    ],
  };
  equal(
    manualTaxes(reciprocal, signed, 2000, 26, date, [], employee).lines.find(
      (l) => l.ruleId === "VA-income",
    )!.amount,
    0,
  );
  equal(
    manualTaxes(reciprocal, profile, 2000, 26, date, [], employee).lines.find(
      (l) => l.ruleId === "VA-income",
    )!.amount,
    36,
  );
  const expired = {
    ...signed,
    elections: [{ ...signed.elections[0], expiresOn: "2026-02-01" }],
  };
  equal(
    manualTaxes(reciprocal, expired, 2000, 26, date, [], employee).lines.find(
      (l) => l.ruleId === "VA-income",
    )!.amount,
    36,
  );
  const prior: any = [
    {
      ruleId: "old-id",
      taxKey: "EMPLOYER:FUTA:US:",
      state: "VA",
      category: "FUTA",
      payer: "EMPLOYER",
      taxableWages: 6800,
      amount: 40.8,
    },
  ];
  equal(
    money(
      manualTaxes(config, profile, 2000, 26, date, prior, employee)
        .lines.filter((l) => l.category === "FUTA")
        .reduce((n, l) => n + l.amount, 0),
    ),
    1.2,
  );
  equal(
    manualTaxes(
      config,
      profile,
      2000,
      26,
      date,
      [{ ...prior[0], taxableWages: 7000 }],
      employee,
    )
      .lines.filter((l) => l.category === "FUTA")
      .reduce((n, l) => n + l.amount, 0),
    0,
  );
  const graduated = {
    ...rule("MD-grad", "MD", "STATE_INCOME", "EMPLOYEE", "RESIDENCE", 0),
    method: "ANNUAL_BRACKETS",
    brackets: [
      { threshold: 0, ratePercent: 2 },
      { threshold: 10000, ratePercent: 4 },
    ],
    annualDeduction: 2000,
    allowanceValue: 1000,
    annualCredit: 100,
  };
  // 52k annual - 2k deduction = 50k; tax 200+1600-100=1700 /26 =65.38.
  equal(
    manualTaxes(
      { ...config, rules: [graduated] },
      profile,
      2000,
      26,
      date,
      [],
      employee,
    ).lines[0].amount,
    65.38,
  );
  equal(
    manualTaxes(undefined, profile, 2000, 26, date, [], employee).issues.length,
    1,
  );
  equal(
    manualTaxes(config, undefined, 2000, 26, date, [], employee).issues.length,
    1,
  );
  equal(
    manualTaxes(
      config,
      {
        ...profile,
        residence: { ...profile.residence, localJurisdictionsReviewed: false },
      },
      2000,
      26,
      date,
      [],
      employee,
    ).issues.length > 0,
    true,
  );
  equal(
    manualTaxes(config, profile, 2000, 26, new Date("2027-01-01"), [], employee)
      .issues.length > 0,
    true,
  );
  const local = rule("school", "MD", "LOCAL", "EMPLOYEE", "RESIDENCE", 1);
  local.jurisdictionId = "school-district";
  equal(
    manualTaxes(
      { ...config, rules: [...config.rules, local] },
      {
        ...profile,
        residence: {
          ...profile.residence,
          jurisdictionIds: ["school-district"],
        },
      },
      2000,
      26,
      date,
      [],
      employee,
    ).lines.find((l) => l.ruleId === "school")!.amount,
    20,
  );
  equal(
    paidIntervals(
      shift("2026-01-05T09:00Z", "2026-01-05T17:00Z", [
        {
          startTime: "2026-01-05T12:00Z",
          endTime: "2026-01-05T13:00Z",
          type: "UNPAID",
        },
        {
          startTime: "2026-01-05T12:30Z",
          endTime: "2026-01-05T13:30Z",
          type: "UNPAID",
        },
      ]),
    ).reduce((n, [a, z]) => n + (z - a) / 3600000, 0),
    6.5,
  );
  equal(
    paidIntervals(
      shift("2026-01-05T09:00Z", "2026-01-05T17:00Z", [
        {
          startTime: "2026-01-05T12:00Z",
          endTime: "2026-01-05T13:00Z",
          type: "PAID",
        },
      ]),
    ).reduce((n, [a, z]) => n + (z - a) / 3600000, 0),
    8,
  );
  const sheets = [
    shift("2026-01-05T00:00Z", "2026-01-06T12:00Z"),
    shift("2026-01-07T00:00Z", "2026-01-07T08:00Z"),
  ];
  const hours = calculateHours(
    sheets,
    new Date("2026-01-07T00:00Z"),
    new Date("2026-01-07T23:59:59.999Z"),
    25,
    true,
    new Date("2026-01-04T00:00Z"),
  );
  equal(hours.regularHours, 4);
  equal(hours.overtimeHours, 4);
  equal(hours.grossPay, 250);
  equal(
    calculateHours(
      [shift("2026-01-05T22:00Z", "2026-01-06T06:00Z")],
      new Date("2026-01-06"),
      new Date("2026-01-06T23:59:59.999Z"),
      25,
      false,
      new Date("2026-01-04"),
    ).regularHours,
    6,
  );
  fails(
    () =>
      calculateHours(
        [sheets[0], sheets[0]],
        new Date("2026-01-05"),
        new Date("2026-01-08"),
        25,
        true,
        new Date("2026-01-04"),
      ),
    /overlap/,
  );
  equal(
    calendarBoundary("2026-03-08", "America/New_York").toISOString(),
    "2026-03-08T05:00:00.000Z",
  );
  equal(
    calendarBoundary("2026-03-08", "America/New_York", true).toISOString(),
    "2026-03-09T03:59:59.999Z",
  );
  equal(
    calendarBoundary("2026-11-01", "America/New_York", true).toISOString(),
    "2026-11-02T04:59:59.999Z",
  );
  // Service-level behavior: preserve drafts on failures, scoped access, immutable payroll and guards.
  let deleted = 0,
    created = 0;
  const payroll: any = {
    id: "p",
    businessId: "b",
    status: "DRAFT",
    type: "REGULAR",
    paySchedule: "BI_WEEKLY",
    calendarTimeZone: "America/New_York",
    periodStart: new Date("2026-10-01T04:00Z"),
    periodEnd: new Date("2026-10-15T03:59:59.999Z"),
    payDate: date,
    updatedAt: new Date("2026-10-01"),
    business: { id: "b", settings: JSON.stringify({ payrollTaxes: config }) },
  };
  const person = {
    ...employee,
    payrollTaxProfile: JSON.stringify(profile),
    w2Profile: null,
    contractorProfile: null,
  };
  let saved: any[] = [];
  const db: any = {
    business: {
      findFirst: async () => ({ id: "b" }),
      findUnique: async () => payroll.business,
      findUniqueOrThrow: async () => payroll.business,
      update: async () => payroll.business,
    },
    employee: {
      findMany: async () => [person],
      update: async () => person,
      findUniqueOrThrow: async () => person,
    },
    timesheet: {
      findMany: async () => [shift("2026-10-05T09:00Z", "2026-10-05T17:00Z")],
    },
    payroll: {
      findUnique: async (q: any) =>
        q.include?.payStubs
          ? {
              ...payroll,
              payStubs: saved.map((s) => ({ ...s, employee: person })),
            }
          : payroll,
      updateMany: async () => ({ count: 1 }),
      update: async (q: any) => Object.assign(payroll, q.data),
    },
    payStub: {
      findMany: async (q: any) => (q.where.payrollId ? saved : []),
      createMany: async (q: any) => {
        created++;
        saved = q.data.map((s: any, i: number) => ({ ...s, id: `s${i}` }));
      },
      deleteMany: async () => {
        deleted++;
      },
      findUnique: async () => ({
        id: "s",
        employeeId: "e1",
        workerType: "W2",
        payrollId: "p",
        regularHours: 8,
        overtimeHours: 0,
        regularPay: 200,
        bonus: 0,
        commission: 0,
        reimbursement: 0,
        grossPay: 200,
        deductions: 0,
        employee: person,
        payroll,
      }),
    },
    loan: { findMany: async () => [] },
    auditLog: { create: async () => {} },
    leaveType: { findMany: async () => [] },
    $transaction: async (fn: any) => fn(db),
  };
  const service = new PayrollService(db, {} as any);
  const user = { userId: "owner", role: "SUPER_ADMIN" };
  const calculated = await service.runPayrollCalculation("p", user);
  equal(calculated.id, "p");
  equal(calculated.totalGross, 200);
  equal(calculated.payStubs[0].employee.firstName, "Ada");
  equal(calculated.taxReadiness.complete, true);
  equal(created, 1);
  // A calculation failure occurs before destructive draft replacement.
  person.hourlyRate = 0;
  await rejects(
    () => service.runPayrollCalculation("p", user),
    /greater than zero/,
  );
  equal(deleted, 1);
  person.hourlyRate = 25;
  payroll.status = "PAID";
  await rejects(() => service.runPayrollCalculation("p", user), /Only draft/);
  await rejects(
    () => service.updatePayStub("s", { regularHours: 9 }, user),
    /cannot be edited/,
  );
  payroll.status = "DRAFT";
  await rejects(
    () => service.updatePayStub("s", { federalTax: 0 }, user),
    /cannot be manually overwritten/,
  );
  await rejects(
    () => service.updatePayStub("s", { regularHours: -1 }, user),
    /non-negative/,
  );
  await rejects(
    () => service.updatePayStub("s", { regularHours: Infinity }, user),
    /finite/,
  );
  saved = [];
  await rejects(() => service.finalizePayroll("p", user), /Calculate payroll/);
  saved = [
    {
      ...calculated.payStubs[0],
      taxDetails: JSON.stringify({ calculation: { complete: false } }),
    },
  ];
  await rejects(() => service.finalizePayroll("p", user), /missing state/);
  saved = calculated.payStubs;
  person.additionalWithholding = 10;
  await rejects(() => service.finalizePayroll("p", user), /settings changed/);
  equal(deleted, 1);
  console.log(`Passed ${checks} payroll regression checks`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
