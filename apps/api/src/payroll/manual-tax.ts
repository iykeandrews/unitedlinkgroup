import { BadRequestException } from "@nestjs/common";
import {
  amount,
  money,
  PayrollTaxProfile,
  US_STATES,
  validDay,
} from "./us-tax";

export interface ManualTaxRule {
  id: string;
  label: string;
  state: string;
  jurisdictionId?: string;
  category:
    | "STATE_INCOME"
    | "LOCAL"
    | "STATE_PAYROLL"
    | "UNEMPLOYMENT"
    | "FUTA";
  payer: "EMPLOYEE" | "EMPLOYER";
  basis: "RESIDENCE" | "WORK";
  method: "FLAT" | "ANNUAL_BRACKETS";
  ratePercent: number;
  brackets: Array<{ threshold: number; ratePercent: number }>;
  annualDeduction: number;
  allowanceValue: number;
  allowanceMethod?: "DEDUCTION" | "CREDIT";
  annualizeTotalWages?: boolean;
  annualCredit: number;
  wageCap: number | null;
  filingStatus?: string;
  reciprocityStates: string[];
  creditForWorkStates?: string[];
  sourceUrl?: string;
  effectiveFrom: string;
  effectiveTo: string;
}
export interface ManualTaxConfig {
  version: 1;
  rules: ManualTaxRule[];
  reviewedStates: string[];
  reviewedBy: string;
  reviewedAt: string;
  workweekAnchor: string;
  payrollTimeZone: string;
}
export function validateRules(value: any): ManualTaxConfig {
  if (
    !value ||
    !Array.isArray(value.rules) ||
    value.rules.length > 500 ||
    !Array.isArray(value.reviewedStates) ||
    value.reviewedStates.some((s: string) => !US_STATES.includes(s))
  )
    throw new BadRequestException("Invalid tax rule configuration.");
  if (
    !value.workweekAnchor ||
    !Number.isFinite(Date.parse(value.workweekAnchor))
  )
    throw new BadRequestException(
      "Enter a valid fixed workweek start timestamp, including its UTC offset.",
    );
  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: value.payrollTimeZone,
    }).format(new Date());
  } catch {
    throw new BadRequestException("Choose a valid payroll time zone.");
  }
  if (typeof value.payrollTimeZone !== "string" || !value.payrollTimeZone)
    throw new BadRequestException("A payroll time zone is required.");
  const ids = new Set();
  for (const r of value.rules) {
    if (
      !r ||
      typeof r.id !== "string" ||
      !r.id.trim() ||
      ids.has(r.id) ||
      typeof r.label !== "string" ||
      !r.label.trim() ||
      !US_STATES.includes(r.state) ||
      ![
        "STATE_INCOME",
        "LOCAL",
        "STATE_PAYROLL",
        "UNEMPLOYMENT",
        "FUTA",
      ].includes(r.category) ||
      !["EMPLOYEE", "EMPLOYER"].includes(r.payer) ||
      !["RESIDENCE", "WORK"].includes(r.basis) ||
      !["FLAT", "ANNUAL_BRACKETS"].includes(r.method)
    )
      throw new BadRequestException(
        "Each rule needs a unique ID, label, state, category, payer and calculation method.",
      );
    ids.add(r.id);
    if (r.category === "STATE_INCOME" && r.payer !== "EMPLOYEE")
      throw new BadRequestException(
        "State income withholding must be an employee deduction.",
      );
    if (
      r.allowanceMethod &&
      !["DEDUCTION", "CREDIT"].includes(r.allowanceMethod)
    )
      throw new BadRequestException("Invalid allowance treatment.");
    if (
      r.annualizeTotalWages !== undefined &&
      typeof r.annualizeTotalWages !== "boolean"
    )
      throw new BadRequestException("Invalid annual wage basis.");
    if (
      r.sourceUrl &&
      (typeof r.sourceUrl !== "string" || !/^https:\/\//.test(r.sourceUrl))
    )
      throw new BadRequestException("Source links must use HTTPS.");
    if (
      r.creditForWorkStates &&
      (!Array.isArray(r.creditForWorkStates) ||
        r.creditForWorkStates.some((s: string) => !US_STATES.includes(s)) ||
        (r.creditForWorkStates.length > 0 &&
          (r.category !== "STATE_INCOME" || r.basis !== "RESIDENCE")))
    )
      throw new BadRequestException(
        "Resident credits require a residence-based income rule and valid work states.",
      );
    for (const other of value.rules) {
      if (other === r || other.id === r.id) continue;
      if (
        r.state === other.state &&
        r.category === other.category &&
        r.payer === other.payer &&
        r.basis === other.basis &&
        (r.jurisdictionId || "") === (other.jurisdictionId || "") &&
        (!r.filingStatus ||
          !other.filingStatus ||
          r.filingStatus === other.filingStatus) &&
        r.effectiveFrom <= other.effectiveTo &&
        r.effectiveTo >= other.effectiveFrom
      )
        throw new BadRequestException(
          "Overlapping rules would deduct the same tax twice. Use distinct effective dates or filing statuses.",
        );
    }
    if (
      r.filingStatus &&
      ![
        "SINGLE",
        "MARRIED_JOINT",
        "MARRIED_SEPARATE",
        "HEAD_OF_HOUSEHOLD",
      ].includes(r.filingStatus)
    )
      throw new BadRequestException("Invalid rule filing status.");
    if (r.jurisdictionId && typeof r.jurisdictionId !== "string")
      throw new BadRequestException("Invalid local jurisdiction reference.");
    if (
      r.category === "FUTA" &&
      (r.wageCap !== 7000 ||
        r.ratePercent > 6 ||
        r.method !== "FLAT" ||
        r.payer !== "EMPLOYER" ||
        r.basis !== "WORK")
    )
      throw new BadRequestException(
        "FUTA rules require employer work wages, a $7,000 annual cap and a flat rate of 0–6% after applicable credits.",
      );
    if (r.category === "LOCAL" && !r.jurisdictionId)
      throw new BadRequestException(
        "Local rules require an explicit jurisdiction ID.",
      );
    for (const k of [
      "ratePercent",
      "annualDeduction",
      "allowanceValue",
      "annualCredit",
    ])
      amount(r[k], k);
    if (r.ratePercent > 100)
      throw new BadRequestException("Tax rates cannot exceed 100%.");
    if (r.wageCap !== null) amount(r.wageCap, "Annual wage cap");
    if (
      !Array.isArray(r.reciprocityStates) ||
      r.reciprocityStates.some((s: string) => !US_STATES.includes(s))
    )
      throw new BadRequestException("Invalid reciprocal states.");
    if (r.category !== "STATE_INCOME" && r.reciprocityStates.length)
      throw new BadRequestException(
        "Reciprocity applies only to state income withholding.",
      );
    if (
      !validDay(r.effectiveFrom) ||
      !validDay(r.effectiveTo) ||
      r.effectiveFrom > r.effectiveTo ||
      r.effectiveFrom.slice(0, 4) !== r.effectiveTo.slice(0, 4)
    )
      throw new BadRequestException(
        "Each rule must have valid start/end dates within one tax year.",
      );
    if (!Array.isArray(r.brackets) || r.brackets.length > 30)
      throw new BadRequestException("Invalid tax brackets.");
    if (
      r.method === "ANNUAL_BRACKETS" &&
      (!r.brackets.length || r.brackets[0].threshold !== 0)
    )
      throw new BadRequestException("Graduated brackets must start at zero.");
    r.brackets.forEach((b: any, i: number) => {
      amount(b.threshold, "Bracket threshold");
      amount(b.ratePercent, "Bracket rate");
      if (
        b.ratePercent > 100 ||
        (i && b.threshold <= r.brackets[i - 1].threshold)
      )
        throw new BadRequestException(
          "Bracket thresholds must increase and rates must be 0–100%.",
        );
    });
  }
  return {
    version: 1,
    rules: value.rules,
    reviewedStates: [...new Set<string>(value.reviewedStates)],
    reviewedBy: "",
    reviewedAt: "",
    workweekAnchor: new Date(value.workweekAnchor).toISOString(),
    payrollTimeZone: value.payrollTimeZone,
  };
}
export interface TaxLine {
  ruleId: string;
  label: string;
  state: string;
  category: string;
  payer: string;
  taxKey?: string;
  taxableWages: number;
  amount: number;
}
export function manualTaxes(
  config: ManualTaxConfig | undefined,
  profile: PayrollTaxProfile | undefined,
  gross: number,
  periods: number,
  payDate: Date,
  priorLines: TaxLine[],
  employee: any,
) {
  const issues: string[] = [];
  const lines: TaxLine[] = [];
  if (!profile)
    return {
      issues: [
        "Complete the employee residence, work locations and signed tax elections in Tax setup.",
      ],
      lines,
    };
  if (!config)
    return {
      issues: [
        "Enter and review state, local and employer tax rules in Tax setup.",
      ],
      lines,
    };
  if (
    !profile.residence.localJurisdictionsReviewed ||
    profile.workLocations.some((w) => !w.localJurisdictionsReviewed)
  )
    issues.push(
      "Review local tax jurisdictions for every residence and work address (including addresses with no local tax).",
    );
  const date = payDate.toISOString().slice(0, 10);
  const states = [
    ...new Set([
      profile.residence.state,
      ...profile.workLocations.map((w) => w.state),
    ]),
  ];
  states.forEach((s) => {
    if (!config.reviewedStates.includes(s))
      issues.push(
        `Review all applicable income, local, payroll and employer taxes for ${s}.`,
      );
  });
  const active = config.rules
    .filter((r) => r.effectiveFrom <= date && r.effectiveTo >= date)
    .sort(
      (a, b) => (a.basis === "WORK" ? 0 : 1) - (b.basis === "WORK" ? 0 : 1),
    );
  const elections = profile.elections.filter(
    (e) => e.effectiveDate <= date && (!e.expiresOn || e.expiresOn >= date),
  );
  // Exact jurisdiction selections avoid guessing city, county, school district or ZIP boundaries.
  const jurisdictionIds = (a: any): string[] => a.jurisdictionIds || [];
  const allocatedWages = (total: number) => {
    let remaining = Math.round(total * 100);
    return profile.workLocations.map((a, i) => {
      const cents =
        i === profile.workLocations.length - 1
          ? remaining
          : Math.floor((Math.round(total * 100) * a.wagePercent) / 100);
      remaining -= cents;
      return { ...a, wages: cents / 100 };
    });
  };
  for (const state of states) {
    if (
      !active.some(
        (r) =>
          r.state === state &&
          r.category === "STATE_INCOME" &&
          r.payer === "EMPLOYEE" &&
          ((r.basis === "RESIDENCE" && profile.residence.state === state) ||
            (r.basis === "WORK" &&
              profile.workLocations.some((w) => w.state === state))) &&
          (!r.filingStatus ||
            r.filingStatus ===
              (elections.find((e) => e.jurisdiction === state)?.parameters
                .filingStatus ||
                employee.stateFilingStatus ||
                employee.filingStatus ||
                "SINGLE")),
      )
    )
      issues.push(
        `Add an effective state income rule for ${state}, including an explicit 0% rule where appropriate.`,
      );
  }
  for (const state of new Set(profile.workLocations.map((w) => w.state))) {
    if (
      !active.some(
        (r) =>
          r.state === state &&
          r.category === "UNEMPLOYMENT" &&
          r.payer === "EMPLOYER" &&
          r.basis === "WORK",
      )
    )
      issues.push(
        `Add the employer unemployment rate and wage cap for ${state}.`,
      );
    if (
      !active.some(
        (r) =>
          r.state === state &&
          r.category === "FUTA" &&
          r.payer === "EMPLOYER" &&
          r.basis === "WORK",
      )
    )
      issues.push(`Add the applicable FUTA rate and wage cap for ${state}.`);
  }
  for (const state of states)
    if (
      state === profile.residence.state &&
      profile.workLocations.some((w) => w.state === state) &&
      active.some(
        (r) =>
          r.state === state &&
          r.category === "STATE_INCOME" &&
          r.basis === "RESIDENCE",
      ) &&
      active.some(
        (r) =>
          r.state === state &&
          r.category === "STATE_INCOME" &&
          r.basis === "WORK",
      )
    )
      issues.push(
        `Use one residence or work income rule for ${state} to prevent duplicate withholding.`,
      );
  const selectedJurisdictions = new Set([
    ...jurisdictionIds(profile.residence),
    ...profile.workLocations.flatMap(jurisdictionIds),
  ]);
  selectedJurisdictions.forEach((id) => {
    if (!active.some((r) => r.jurisdictionId === id))
      issues.push(`No effective local rule for jurisdiction ${id}.`);
  });
  for (const r of active) {
    const addresses =
      r.basis === "RESIDENCE"
        ? [{ ...profile.residence, wagePercent: 100, wages: gross }]
        : allocatedWages(gross);
    const allocation =
      addresses
        .filter(
          (a) =>
            a.state === r.state &&
            (r.category !== "LOCAL" ||
              jurisdictionIds(a).includes(r.jurisdictionId!)),
        )
        .reduce((n, a) => n + a.wagePercent, 0) / 100;
    const election = elections.find(
      (e) => e.jurisdiction === (r.jurisdictionId || r.state),
    );
    const filingStatus =
      election?.parameters.filingStatus ||
      employee.stateFilingStatus ||
      employee.filingStatus ||
      "SINGLE";
    if (!allocation || (r.filingStatus && r.filingStatus !== filingStatus))
      continue;
    // A signed exemption/reciprocity election is necessary; crossing a state line alone is insufficient.
    if (
      r.payer === "EMPLOYEE" &&
      ["STATE_INCOME", "LOCAL"].includes(r.category) &&
      (election?.exemption ||
        (r.category === "STATE_INCOME" &&
          r.basis === "WORK" &&
          election?.reciprocity &&
          r.reciprocityStates.includes(profile.residence.state)))
    ) {
      lines.push({
        ruleId: r.id,
        label: r.label,
        state: r.state,
        category: r.category,
        payer: r.payer,
        taxableWages: 0,
        amount: 0,
      });
      continue;
    }
    const taxKey = `${r.payer}:${r.category}:${r.category === "FUTA" ? "US" : r.state}:${r.category === "FUTA" ? "" : r.jurisdictionId || ""}`;
    const prior = priorLines
      .filter(
        (l) =>
          (l.taxKey ||
            `${l.payer}:${l.category}:${l.category === "FUTA" ? "US" : l.state}:`) ===
          taxKey,
      )
      .reduce((n, l) => n + l.taxableWages, 0);
    const allocated = addresses
      .filter(
        (a) =>
          a.state === r.state &&
          (r.category !== "LOCAL" ||
            jurisdictionIds(a).includes(r.jurisdictionId!)),
      )
      .reduce((n, a) => n + a.wages, 0);
    const taxable =
      r.category === "FUTA"
        ? money(
            allocatedWages(Math.min(gross, Math.max(0, 7000 - prior)))
              .filter((a) => a.state === r.state)
              .reduce((n, a) => n + a.wages, 0),
          )
        : r.wageCap === null
          ? money(allocated)
          : money(Math.min(allocated, Math.max(0, r.wageCap - prior)));
    let tax = 0;
    if (r.method === "FLAT") tax = (taxable * r.ratePercent) / 100;
    else {
      const allowances = Number(
        election?.parameters.allowances ??
          (employee.taxState === r.state ? employee.stateAllowances : 0) ??
          0,
      );
      amount(allowances, "State allowances");
      const annual = Math.max(
        0,
        (r.annualizeTotalWages && r.basis === "WORK" ? gross : taxable) *
          periods -
          r.annualDeduction -
          (r.allowanceMethod === "CREDIT" ? 0 : allowances * r.allowanceValue),
      );
      r.brackets.forEach((b, i) => {
        const upper = r.brackets[i + 1]?.threshold ?? Infinity;
        tax +=
          (Math.max(0, Math.min(annual, upper) - b.threshold) * b.ratePercent) /
          100;
      });
      tax =
        Math.max(
          0,
          tax -
            r.annualCredit -
            (r.allowanceMethod === "CREDIT"
              ? allowances * r.allowanceValue
              : 0),
        ) / periods;
      if (r.annualizeTotalWages && r.basis === "WORK") tax *= allocation;
    }
    const extra =
      r.payer === "EMPLOYEE" && r.category === "STATE_INCOME"
        ? Number(
            election?.parameters.additionalWithholding ??
              (employee.taxState === r.state
                ? employee.stateAdditionalWithholding
                : 0) ??
              0,
          )
        : 0;
    amount(extra, "State additional withholding");
    if (
      r.basis === "RESIDENCE" &&
      r.category === "STATE_INCOME" &&
      r.creditForWorkStates?.length
    ) {
      const credit = lines
        .filter(
          (l) =>
            l.category === "STATE_INCOME" &&
            l.payer === "EMPLOYEE" &&
            l.state !== r.state &&
            r.creditForWorkStates!.includes(l.state),
        )
        .reduce((n, l) => n + l.amount, 0);
      tax = Math.max(0, tax - credit);
    }
    lines.push({
      ruleId: r.id,
      taxKey,
      label: r.label,
      state: r.state,
      category: r.category,
      payer: r.payer,
      taxableWages: taxable,
      amount: money(tax + extra),
    });
  }
  return { issues: [...new Set(issues)], lines };
}
