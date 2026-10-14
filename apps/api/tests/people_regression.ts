import {
  normalizeEmployment,
  effectivePay,
} from "../src/employees/employment.util";
import {
  employmentForm,
  employmentField,
  employmentPayload,
} from "../../web/src/components/people/employment";
import { calculateFederal } from "../src/payroll/us-tax";
import assert from "node:assert/strict";
import { EmployeesService } from "../src/employees/employees.service";
import {
  DirectoryEmployee,
  directoryCsv,
  matchesDirectory,
  roleLabel,
  savedPay,
  toggleVisibleSelection,
} from "../../web/src/components/people/directory";
const employee: DirectoryEmployee = {
  id: "person",
  firstName: "Ada",
  lastName: "Jones",
  email: "ada@example.test",
  role: "EMPLOYEE",
  status: "ACTIVE",
  type: "FULL_TIME",
  payType: "HOURLY",
  defaultLocationId: "site",
  defaultLocation: { id: "site", name: "North Gate" },
};
let checks = 0;
function check(actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected);
  checks++;
}
async function main() {
  const existing = {
    ...employee,
    hourlyRate: 19,
    workerType: "W2",
    paySchedule: "BI_WEEKLY",
    filingStatus: "SINGLE",
    w2Profile: {
      payType: "HOURLY",
      rate: 28,
      paySchedule: "BI_WEEKLY",
      filingStatus: "SINGLE",
      additionalWithholding: 0,
    },
  };
  check(employmentForm(existing).hourlyRate, 28);
  const edited = employmentField(
    employmentField(employmentForm(existing), "hourlyRate", 32.5),
    "additionalWithholding",
    25,
  );
  const payload = employmentPayload(edited);
  check(payload.w2Profile.rate, 32.5);
  check(payload.w2Profile.additionalWithholding, 25);
  check("id" in payload, false);
  check("payrollTaxProfile" in payload, false);
  const normalized = normalizeEmployment(payload, existing);
  check(normalized.hourlyRate, 32.5);
  check(normalized.w2Profile.rate, 32.5);
  check(normalized.additionalWithholding, 25);
  check(normalizeEmployment({ hourlyRate: 33 }, existing).w2Profile.rate, 33);
  check(
    normalizeEmployment({ additionalWithholding: 40 }, existing).w2Profile
      .additionalWithholding,
    40,
  );
  check(
    normalizeEmployment({ w2Profile: { rate: 34 } }, existing).hourlyRate,
    34,
  );
  const salary = normalizeEmployment(
    { payType: "SALARY", salary: 78000 },
    existing,
  );
  check(salary.w2Profile.rate, 78000);
  check(salary.hourlyRate, null);
  check(salary.salary, 78000);
  check(effectivePay({ ...existing, ...salary }).salary, 78000);
  const federalBefore = calculateFederal(
    1300,
    { ...existing, ...existing.w2Profile },
    0,
    2026,
  );
  const federalAfter = calculateFederal(
    1300,
    { ...existing, ...normalized, ...normalized.w2Profile },
    0,
    2026,
  );
  check(
    Math.round(
      (federalAfter.employeeTaxDetails.federalTax -
        federalBefore.employeeTaxDetails.federalTax) *
        100,
    ),
    2500,
  );
  const contractor = normalizeEmployment(
    { workerType: "CONTRACTOR_1099", hourlyRate: 40, w9Confirmed: true },
    existing,
  );
  check(contractor.contractorProfile.rate, 40);
  check(contractor.overtimeEligible, false);
  check(effectivePay({ ...existing, ...contractor }).hourlyRate, 40);
  const both = normalizeEmployment(
    {
      workerType: "BOTH",
      w2Profile: { rate: 30 },
      contractorProfile: { rate: 45, w9Confirmed: true },
    },
    existing,
  );
  check(both.w2Profile.rate, 30);
  check(both.contractorProfile.rate, 45);
  for (const bad of [
    { hourlyRate: -1 },
    { hourlyRate: NaN },
    { hourlyRate: 1.123 },
    { paySchedule: "YEARLY" },
    { taxState: "ZZ" },
    { stateAllowances: 1.5 },
    { multipleJobs: "yes" },
    { payType: "BAD" },
    { workerType: "BAD" },
  ]) {
    assert.throws(() => normalizeEmployment(bad, existing));
    checks++;
  }
  check(
    normalizeEmployment(
      { hireDate: "2026-01-05" },
      existing,
    ).hireDate.toISOString(),
    "2026-01-05T00:00:00.000Z",
  );
  assert.throws(() =>
    normalizeEmployment({ hireDate: "2026-02-30" }, existing),
  );
  checks++;
  assert.throws(() =>
    normalizeEmployment({ additionalWithholding: null }, existing),
  );
  checks++;
  check(savedPay({...employee,workerType:'CONTRACTOR_1099',hourlyRate:45,w2Profile:{rate:30,payType:'HOURLY'}}),{amount:45,unit:'hour'});
  check(savedPay({...employee,payType:'SALARIED',salary:60000}),{amount:60000,unit:'year'});
  check(effectivePay({...employee,payType:'SALARIED',salary:60000}).salary,60000);
  check(savedPay(employee), null);
  check(savedPay({ ...employee, hourlyRate: 0 }), { amount: 0, unit: "hour" });
  check(savedPay({ ...employee, payType: "SALARY", salary: 52000 }), {
    amount: 52000,
    unit: "year",
  });
  check(
    savedPay({
      ...employee,
      hourlyRate: 19,
      w2Profile: { rate: 28, payType: "HOURLY" },
    }),
    { amount: 28, unit: "hour" },
  );
  check(
    savedPay({
      ...employee,
      workerType: "CONTRACTOR_1099",
      contractorProfile: { rate: 35 },
    }),
    { amount: 35, unit: "hour" },
  );
  check(savedPay({ ...employee, hourlyRate: NaN }), null);
  check(matchesDirectory(employee, "Ada Jones"), true);
  check(matchesDirectory(employee, "north ada"), true);
  check(matchesDirectory(employee, "south"), false);
  check(
    roleLabel({ ...employee, role: "SECURITY_OFFICER" }),
    "Security Officer",
  );
  check(
    roleLabel({ ...employee, customRole: { name: "Site Supervisor" } }),
    "Site Supervisor",
  );
  check(
    Array.from(
      toggleVisibleSelection(new Set(["other", "person"]), ["person"]),
    ),
    ["other"],
  );
  check(Array.from(toggleVisibleSelection(new Set(["other"]), ["person"])), [
    "other",
    "person",
  ]);
  const csv = directoryCsv([
    { ...employee, firstName: "=2+2", lastName: 'Jones, "Ada"' },
  ]);
  check(csv.includes('"\'=2+2"'), true);
  check(csv.includes('"Jones, ""Ada"""'), true);
  check(csv.includes("SSN"), false);
  const user = { role: "SUPER_ADMIN", userId: "admin" };
  let written: any;
  const person = {
    ...employee,
    businessId: "business",
    ssn: "encrypted-tax-id",
  };
  const prisma: any = {
    employee: {
      findFirst: async ({ where }: any) => (where.email ? null : person),
      findMany: async () => [person],
      update: async ({ data }: any) => {
        written = data;
        return { ...person, ...data };
      },
      create: async ({ data }: any) => {
        written = data;
        return data;
      },
    },
    shift: { findFirst: async () => ({ id: "upcoming-shift" }) },
    timesheet: { findFirst: async () => null },
    location: { findFirst: async () => null },
  };
  const service = new EmployeesService(
    prisma,
    {
      decrypt: () => {
        throw new Error("Directory must not decrypt tax identifiers");
      },
    } as any,
    {} as any,
    {} as any,
  );
  const directory = await service.findAll(user, undefined, "business");
  check("ssn" in directory[0], false);
  await assert.rejects(
    () => service.update(user, "person", { status: "INACTIVE" }, "business"),
    /upcoming shifts and open timesheets/,
  );
  checks++;
  prisma.shift.findFirst = async () => null;
  prisma.timesheet.findFirst = async () => ({ id: "active-timesheet" });
  await assert.rejects(
    () => service.update(user, "person", { status: "INACTIVE" }, "business"),
    /open timesheets/,
  );
  checks++;
  prisma.timesheet.findFirst = async () => null;
  await service.update(user, "person", { status: "INACTIVE" }, "business");
  check(written.status, "INACTIVE");
  await service.update(user, "person", { status: "ACTIVE" }, "business");
  check(written.status, "ACTIVE");
  await service.update(
    user,
    "person",
    { hourlyRate: 36, additionalWithholding: 50, paySchedule: "WEEKLY" },
    "business",
  );
  check(written.hourlyRate, 36);
  check(written.w2Profile.upsert.create.rate, 36);
  check(written.w2Profile.upsert.update.additionalWithholding, 50);
  check(written.w2Profile.upsert.update.paySchedule, "WEEKLY");
  await assert.rejects(
    () => service.update(user, "person", { status: "UNKNOWN" }, "business"),
    /Invalid employee status/,
  );
  checks++;
  await assert.rejects(
    () =>
      service.update(
        user,
        "person",
        { defaultLocationId: "other-site" },
        "business",
      ),
    /from this business/,
  );
  checks++;
  await assert.rejects(
    () =>
      service.update(user, "person", { supervisorId: "person" }, "business"),
    /cannot supervise themselves/,
  );
  checks++;
  prisma.location.findFirst = async () => ({
    id: "site",
    businessId: "business",
    status: "ACTIVE",
  });
  await service.create(
    user,
    {
      ...employee,
      firstName: " Ada ",
      lastName: " Jones ",
      email: " ADA@EXAMPLE.TEST ",
    },
    "business",
  );
  check(written.email, "ada@example.test");
  check(written.firstName, "Ada");
  await assert.rejects(
    () => service.create(user, { ...employee, email: "invalid" }, "business"),
    /valid email/,
  );
  checks++;
  await assert.rejects(
    () => service.update(user, "person", { email: "bad" }, "business"),
    /valid email/,
  );
  checks++;
  console.log(`Passed ${checks} People regression checks`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
