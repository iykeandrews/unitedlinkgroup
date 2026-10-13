import { BadRequestException } from "@nestjs/common";

export const TAX_YEAR = 2026;
export const SOCIAL_SECURITY_CAPS: Record<number, number> = {
  2024: 168600,
  2025: 176100,
  2026: 184500,
};
export const PAY_PERIODS: Record<string, number> = {
  WEEKLY: 52,
  BI_WEEKLY: 26,
  SEMI_MONTHLY: 24,
  MONTHLY: 12,
};
export const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  );
export const money = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
export function amount(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1e9
  )
    throw new BadRequestException(
      `${label} must be a finite, non-negative number.`,
    );
  return value;
}
export function validDay(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function parseJson(value: string | null | undefined): any {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Expected an object");
    return parsed;
  } catch {
    throw new BadRequestException(
      "Stored payroll configuration is invalid. Please review tax setup.",
    );
  }
}
export interface TaxAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
  jurisdictionIds?: string[];
  localJurisdictionsReviewed?: boolean;
}
export interface PayrollTaxProfile {
  version: 1;
  residence: TaxAddress;
  workLocations: Array<
    TaxAddress & { locationId?: string; wagePercent: number }
  >;
  w4FormYear: number;
  federalExempt: boolean;
  federalExemptYear?: number;
  nonresidentAlien: boolean;
  elections: Array<{
    jurisdiction: string;
    form: string;
    effectiveDate: string;
    expiresOn?: string;
    exemption: boolean;
    reciprocity: boolean;
    parameters: Record<string, string | number | boolean>;
  }>;
  providerEmployeeId?: string;
}
function address(value: any): TaxAddress {
  if (
    !value ||
    typeof value.address !== "string" ||
    typeof value.city !== "string" ||
    typeof value.zip !== "string" ||
    !US_STATES.includes(value.state) ||
    !String(value.address || "").trim() ||
    !String(value.city || "").trim() ||
    !/^\d{5}(-\d{4})?$/.test(value.zip || "")
  )
    throw new BadRequestException(
      "A full US street address, city, state and ZIP code are required for tax jurisdiction lookup.",
    );
  if (
    !Array.isArray(value.jurisdictionIds || []) ||
    (value.jurisdictionIds || []).some(
      (v: any) => typeof v !== "string" || !v.trim(),
    )
  )
    throw new BadRequestException("Invalid local jurisdiction IDs.");
  return {
    address: value.address.trim(),
    city: value.city.trim(),
    state: value.state,
    zip: value.zip,
    jurisdictionIds: value.jurisdictionIds || [],
    localJurisdictionsReviewed: value.localJurisdictionsReviewed === true,
  };
}
export function validateTaxProfile(value: any): PayrollTaxProfile {
  if (
    !value ||
    !Array.isArray(value.workLocations) ||
    !value.workLocations.length ||
    value.workLocations.length > 50
  )
    throw new BadRequestException("At least one work location is required.");
  const workLocations = value.workLocations.map((w: any) => ({
    ...address(w),
    locationId: w.locationId || undefined,
    wagePercent: amount(w.wagePercent, "Work allocation"),
  }));
  if (
    Math.abs(
      workLocations.reduce((n: number, w: any) => n + w.wagePercent, 0) - 100,
    ) > 0.00001
  )
    throw new BadRequestException(
      "Work location wage allocations must total 100%.",
    );
  if (
    !Number.isInteger(value.w4FormYear) ||
    value.w4FormYear < 2019 ||
    value.w4FormYear > TAX_YEAR
  )
    throw new BadRequestException(
      "Choose the year of the employee’s signed W-4 (2019 represents legacy forms).",
    );
  if (
    typeof value.federalExempt !== "boolean" ||
    typeof value.nonresidentAlien !== "boolean"
  )
    throw new BadRequestException(
      "Tax exemption and residency elections must be explicit.",
    );
  if (
    value.federalExempt &&
    (!Number.isInteger(value.federalExemptYear) ||
      value.federalExemptYear < 2020 ||
      value.federalExemptYear > TAX_YEAR)
  )
    throw new BadRequestException("A valid exemption tax year is required.");
  const elections = value.elections || [];
  if (!Array.isArray(elections) || elections.length > 100)
    throw new BadRequestException("Invalid state/local elections.");
  for (const e of elections) {
    if (
      !e ||
      typeof e.jurisdiction !== "string" ||
      typeof e.form !== "string" ||
      !e.form.trim() ||
      !validDay(e.effectiveDate) ||
      typeof e.exemption !== "boolean" ||
      typeof e.reciprocity !== "boolean" ||
      !e.parameters ||
      typeof e.parameters !== "object" ||
      Array.isArray(e.parameters)
    )
      throw new BadRequestException(
        "Each state/local election needs a jurisdiction, signed form reference, effective date, and parameters.",
      );
    if (
      !e.jurisdiction.trim() ||
      Object.keys(e.parameters).some(
        (k) =>
          !["filingStatus", "allowances", "additionalWithholding"].includes(k),
      )
    )
      throw new BadRequestException(
        "Use a state/local jurisdiction and supported election fields.",
      );
    if (
      e.parameters.filingStatus &&
      ![
        "SINGLE",
        "MARRIED_JOINT",
        "MARRIED_SEPARATE",
        "HEAD_OF_HOUSEHOLD",
      ].includes(String(e.parameters.filingStatus))
    )
      throw new BadRequestException("Invalid election filing status.");
    for (const k of ["allowances", "additionalWithholding"])
      if (e.parameters[k] !== undefined) amount(e.parameters[k], k);
    if (
      e.parameters.allowances !== undefined &&
      !Number.isInteger(e.parameters.allowances)
    )
      throw new BadRequestException("State allowances must be whole numbers.");
    for (const other of elections)
      if (
        other !== e &&
        other.jurisdiction === e.jurisdiction &&
        e.effectiveDate <= (other.expiresOn || "9999-12-31") &&
        other.effectiveDate <= (e.expiresOn || "9999-12-31")
      )
        throw new BadRequestException(
          "Withholding elections for the same jurisdiction cannot overlap.",
        );
    if (
      e.expiresOn &&
      (!validDay(e.expiresOn) || e.expiresOn < e.effectiveDate)
    )
      throw new BadRequestException(
        "Election expiration must follow its effective date.",
      );
    if (
      Object.values(e.parameters).some(
        (v) =>
          !["string", "number", "boolean"].includes(typeof v) ||
          (typeof v === "number" && !Number.isFinite(v)),
      )
    )
      throw new BadRequestException("Invalid election parameters.");
  }
  if (
    value.providerEmployeeId &&
    (typeof value.providerEmployeeId !== "string" ||
      value.providerEmployeeId.length > 200)
  )
    throw new BadRequestException("Invalid provider employee reference.");
  return {
    version: 1,
    residence: address(value.residence),
    workLocations,
    w4FormYear: value.w4FormYear,
    federalExempt: value.federalExempt,
    federalExemptYear: value.federalExemptYear,
    nonresidentAlien: value.nonresidentAlien,
    elections,
    providerEmployeeId: value.providerEmployeeId || undefined,
  };
}

// IRS Publication 15-T (2026), Worksheet 1A and annual automated percentage tables.
// Rows contain the lower bound, tax at that bound, and marginal withholding rate.
type Row = [number, number, number];
const standard: Record<string, Row[]> = {
  MARRIED_JOINT: [
    [0, 0, 0],
    [19300, 0, 0.1],
    [44100, 2480, 0.12],
    [120100, 11600, 0.22],
    [230700, 35932, 0.24],
    [422850, 82048, 0.32],
    [531750, 116896, 0.35],
    [788000, 206583.5, 0.37],
  ],
  SINGLE: [
    [0, 0, 0],
    [7500, 0, 0.1],
    [19900, 1240, 0.12],
    [57900, 5800, 0.22],
    [113200, 17966, 0.24],
    [209275, 41024, 0.32],
    [263725, 58448, 0.35],
    [648100, 192979.25, 0.37],
  ],
  HEAD_OF_HOUSEHOLD: [
    [0, 0, 0],
    [15550, 0, 0.1],
    [33250, 1770, 0.12],
    [83000, 7740, 0.22],
    [121250, 16155, 0.24],
    [217300, 39207, 0.32],
    [271750, 56631, 0.35],
    [656150, 191171, 0.37],
  ],
};
const multiple: Record<string, Row[]> = {
  MARRIED_JOINT: [
    [0, 0, 0],
    [16100, 0, 0.1],
    [28500, 1240, 0.12],
    [66500, 5800, 0.22],
    [121800, 17966, 0.24],
    [217875, 41024, 0.32],
    [272325, 58448, 0.35],
    [400450, 103291.75, 0.37],
  ],
  SINGLE: [
    [0, 0, 0],
    [8050, 0, 0.1],
    [14250, 620, 0.12],
    [33250, 2900, 0.22],
    [60900, 8983, 0.24],
    [108938, 20512, 0.32],
    [136163, 29224, 0.35],
    [328350, 96489.63, 0.37],
  ],
  HEAD_OF_HOUSEHOLD: [
    [0, 0, 0],
    [12075, 0, 0.1],
    [20925, 885, 0.12],
    [45800, 3870, 0.22],
    [64925, 8077.5, 0.24],
    [112950, 19603.5, 0.32],
    [140175, 28315.5, 0.35],
    [332375, 95585.5, 0.37],
  ],
};
export function calculateFederal(
  gross: number,
  employee: any,
  ytd: number,
  year: number,
  profile?: PayrollTaxProfile,
) {
  amount(gross, "Taxable wages");
  amount(ytd, "Year-to-date taxable wages");
  if (year !== TAX_YEAR)
    throw new BadRequestException(
      `Federal withholding tables for ${year} are not configured. Use a maintained tax provider for that year.`,
    );
  const periods = PAY_PERIODS[employee.paySchedule];
  if (!periods)
    throw new BadRequestException(
      "A valid employee pay frequency is required.",
    );
  const rawStatus = employee.filingStatus || "SINGLE";
  const status = rawStatus === "MARRIED_SEPARATE" ? "SINGLE" : rawStatus;
  if (!standard[status])
    throw new BadRequestException("Unsupported W-4 filing status.");
  for (const k of [
    "dependentsAmount",
    "otherIncome",
    "deductionsAmount",
    "additionalWithholding",
    "federalAllowances",
  ])
    amount(employee[k] ?? 0, k);
  if (!Number.isInteger(employee.federalAllowances ?? 0))
    throw new BadRequestException("Legacy allowances must be whole numbers.");
  if (profile?.nonresidentAlien)
    throw new BadRequestException(
      "Nonresident alien federal withholding requires the maintained tax provider.",
    );
  if (profile?.federalExempt && profile.federalExemptYear !== year)
    throw new BadRequestException(
      "The federal withholding exemption must be renewed for this tax year.",
    );
  const legacy = profile?.w4FormYear === 2019;
  if (!legacy && employee.federalAllowances > 0)
    throw new BadRequestException(
      "Confirm the signed W-4 form year before applying legacy allowances.",
    );
  if (legacy && status === "HEAD_OF_HOUSEHOLD")
    throw new BadRequestException(
      "Legacy W-4 does not support head of household.",
    );
  const checked = !legacy && !!employee.multipleJobs;
  let adjusted = gross * periods;
  if (legacy) adjusted -= (employee.federalAllowances || 0) * 4300;
  else
    adjusted +=
      (employee.otherIncome || 0) -
      (employee.deductionsAmount || 0) -
      (checked ? 0 : status === "MARRIED_JOINT" ? 12900 : 8600);
  adjusted = Math.max(0, adjusted);
  const rows = (checked ? multiple : standard)[status];
  const row = [...rows].reverse().find((r) => adjusted >= r[0])!;
  const tentative = row[1] + (adjusted - row[0]) * row[2];
  const federalTax = profile?.federalExempt
    ? 0
    : money(
        Math.max(
          0,
          tentative / periods -
            (legacy ? 0 : (employee.dependentsAmount || 0) / periods),
        ) + (employee.additionalWithholding || 0),
      );
  const socialSecurity = money(
    Math.min(gross, Math.max(0, SOCIAL_SECURITY_CAPS[year] - ytd)) * 0.062,
  );
  const medicare = money(gross * 0.0145);
  const additionalMedicare = money(
    Math.max(0, ytd + gross - Math.max(ytd, 200000)) * 0.009,
  );
  const employeeTaxDetails = {
    federalTax,
    socialSecurity,
    medicare,
    additionalMedicare,
    stateTax: 0,
    localTax: 0,
    otherTax: 0,
    calculation: {
      status: "FEDERAL_ONLY",
      complete: false,
      taxYear: year,
      engine: "IRS-15T-2026-v1",
      sources: [
        "https://www.irs.gov/publications/p15t",
        "https://www.irs.gov/taxtopics/tc751",
      ],
      issues: [
        "State/local withholding and employer unemployment taxes are pending a maintained tax provider.",
      ],
      profileSnapshot: profile || null,
    },
  };
  const employerTaxDetails = {
    socialSecurity,
    medicare,
    calculation: { complete: false, taxYear: year },
  };
  return {
    employeeTaxes: money(
      federalTax + socialSecurity + medicare + additionalMedicare,
    ),
    employerTaxes: money(socialSecurity + medicare),
    employeeTaxDetails,
    employerTaxDetails,
  };
}
