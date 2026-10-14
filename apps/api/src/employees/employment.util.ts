import { BadRequestException } from "@nestjs/common";
import { PAY_PERIODS, US_STATES, amount, validDay } from "../payroll/us-tax";

const has = (object: any, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);
export const W2_FIELDS = [
  "paySchedule",
  "payType",
  "overtimeEligible",
  "filingStatus",
  "taxState",
  "federalAllowances",
  "multipleJobs",
  "dependentsAmount",
  "otherIncome",
  "deductionsAmount",
  "additionalWithholding",
  "stateFilingStatus",
  "stateAllowances",
  "stateAdditionalWithholding",
] as const;
const NUMBERS = [
  "rate",
  "dependentsAmount",
  "otherIncome",
  "deductionsAmount",
  "additionalWithholding",
  "stateAdditionalWithholding",
  "federalAllowances",
  "stateAllowances",
];
const contractorFields = [
  "businessName",
  "type",
  "w9Confirmed",
  "rate",
  "paymentMethod",
];
function cleanProfile(input: any, fields: readonly string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new BadRequestException("Employment profile must be an object.");
  return Object.fromEntries(
    fields.filter((k) => has(input, k)).map((k) => [k, input[k]]),
  );
}
function validate(profile: any, contractor = false) {
  for (const key of NUMBERS)
    if (profile[key] !== undefined) {
      amount(profile[key], key);
      if (
        ["federalAllowances", "stateAllowances"].includes(key)
          ? !Number.isInteger(profile[key])
          : Math.abs(profile[key] * 100 - Math.round(profile[key] * 100)) > 1e-5
      )
        throw new BadRequestException(
          `${key} must use ${key.includes("Allowances") ? "whole numbers" : "at most two decimal places"}.`,
        );
    }
  for (const key of ["overtimeEligible", "multipleJobs", "w9Confirmed"])
    if (profile[key] !== undefined && typeof profile[key] !== "boolean")
      throw new BadRequestException(`${key} must be true or false.`);
  if (
    !contractor &&
    (!PAY_PERIODS[profile.paySchedule] ||
      !["HOURLY", "SALARY"].includes(profile.payType))
  )
    throw new BadRequestException(
      "Choose a valid pay schedule and hourly or annual salary pay type.",
    );
  for (const key of ["filingStatus", "stateFilingStatus"])
    if (
      profile[key] &&
      ![
        "SINGLE",
        "MARRIED_JOINT",
        "MARRIED_SEPARATE",
        "HEAD_OF_HOUSEHOLD",
      ].includes(profile[key])
    )
      throw new BadRequestException(`Choose a valid ${key}.`);
  if (profile.taxState && !US_STATES.includes(profile.taxState))
    throw new BadRequestException(
      "Choose a valid U.S. state or Washington, DC.",
    );
  if (profile.rate === null || profile.rate === undefined)
    throw new BadRequestException("A pay rate is required.");
}
/** Keep profile-backed payroll and legacy rate consumers consistent in one employee write. */
export function normalizeEmployment(input: any, current: any = {}): any {
  const out = { ...input };
  const classification = input.workerType ?? current.workerType ?? "W2";
  if (!["W2", "CONTRACTOR_1099", "BOTH"].includes(classification))
    throw new BadRequestException("Choose a valid worker classification.");
  if (input.workerType !== undefined) out.workerType = classification;
  const changed = ["workerType", "hourlyRate", "salary", ...W2_FIELDS].some(
    (k) => has(input, k),
  );
  if ((classification !== "CONTRACTOR_1099" && changed) || input.w2Profile) {
    const existing = current.w2Profile || {};
    const base: any = {
      paySchedule: current.paySchedule || "BI_WEEKLY",
      payType: current.payType || "HOURLY",
      overtimeEligible: current.overtimeEligible ?? true,
    };
    for (const k of W2_FIELDS)
      if (current[k] !== undefined) base[k] = current[k];
    Object.assign(base, existing);
    for (const k of W2_FIELDS) if (has(input, k)) base[k] = input[k];
    const nested = input.w2Profile
      ? cleanProfile(input.w2Profile, [...W2_FIELDS, "rate"])
      : {};
    Object.assign(base, nested);
    if (base.payType === "SALARIED") base.payType = "SALARY";
    const payType = base.payType;
    const key = payType === "SALARY" ? "salary" : "hourlyRate";
    base.rate = has(nested, "rate")
      ? nested.rate
      : has(input, key)
        ? input[key]
        : (existing.rate ?? current[key] ?? 0);
    if (base.taxState)
      base.taxState = String(base.taxState).trim().toUpperCase();
    validate(base);
    out.w2Profile = base;
    for (const k of W2_FIELDS) if (base[k] !== undefined) out[k] = base[k];
    out.hourlyRate = payType === "HOURLY" ? base.rate : null;
    out.salary = payType === "SALARY" ? base.rate : null;
  }
  const contractorChanged = [
    "contractorBusinessName",
    "contractorType",
    "w9Confirmed",
  ].some((k) => has(input, k));
  if (
    input.contractorProfile ||
    ((classification === "CONTRACTOR_1099" || classification === "BOTH") &&
      (changed || contractorChanged))
  ) {
    const base: any = { ...current.contractorProfile };
    for (const [legacy, key] of [
      ["contractorBusinessName", "businessName"],
      ["contractorType", "type"],
      ["w9Confirmed", "w9Confirmed"],
    ])
      if (has(input, legacy)) base[key] = input[legacy];
    if (classification === "CONTRACTOR_1099" && has(input, "hourlyRate"))
      base.rate = input.hourlyRate;
    Object.assign(
      base,
      input.contractorProfile
        ? cleanProfile(input.contractorProfile, contractorFields)
        : {},
    );
    base.rate ??= current.hourlyRate ?? 0;
    base.w9Confirmed ??= current.w9Confirmed ?? false;
    validate(base, true);
    out.contractorProfile = base;
    for (const [legacy, key] of [
      ["contractorBusinessName", "businessName"],
      ["contractorType", "type"],
      ["w9Confirmed", "w9Confirmed"],
    ])
      if (base[key] !== undefined) out[legacy] = base[key];
    if (classification === "CONTRACTOR_1099") {
      out.hourlyRate = base.rate;
      out.salary = null;
      out.payType = "HOURLY";
      out.overtimeEligible = false;
    }
  }
  for (const key of ["hoursPerPeriod", "daysPerPeriod"])
    if (out[key] !== undefined && out[key] !== null) {
      amount(out[key], key);
      if (key === "daysPerPeriod" && !Number.isInteger(out[key]))
        throw new BadRequestException(
          "Days per period must be a whole number.",
        );
    }
  if (out.hireDate === "") out.hireDate = null;
  if (
    out.hireDate &&
    (!validDay(String(out.hireDate).slice(0, 10)) ||
      Number.isNaN(new Date(out.hireDate).getTime()))
  )
    throw new BadRequestException("Enter a valid hire date.");
  if (out.hireDate) out.hireDate = new Date(out.hireDate);
  // Jurisdiction/exemption profiles use the dedicated validated payroll endpoint.
  delete out.payrollTaxProfile;
  return out;
}
export function effectivePay(employee: any) {
  const contractor = employee.workerType === "CONTRACTOR_1099";
  const profile = contractor ? employee.contractorProfile : employee.w2Profile;
  const rawPayType = contractor
    ? "HOURLY"
    : (profile?.payType ?? employee.payType);
  const payType = rawPayType === "SALARIED" ? "SALARY" : rawPayType;
  const rate =
    profile?.rate ??
    (payType === "SALARY" ? employee.salary : employee.hourlyRate) ??
    0;
  return {
    payType,
    hourlyRate: payType === "HOURLY" ? rate : null,
    salary: payType === "SALARY" ? rate : null,
    overtimeEligible:
      !contractor &&
      (profile?.overtimeEligible ?? employee.overtimeEligible ?? true),
  };
}
