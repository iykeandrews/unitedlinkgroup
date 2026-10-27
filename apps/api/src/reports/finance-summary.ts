import { BadRequestException } from "@nestjs/common";
import {
  buildTimesheetReport,
  reportDay,
  displayReportDate,
  validateReportPeriod,
} from "../time-tracking/timesheet-report";
import { invoiceTracking } from "../invoices/invoice-accounting";
import { money, SOCIAL_SECURITY_CAPS } from "../payroll/us-tax";

export function summaryOptions(query: any) {
  validateReportPeriod(query.from, query.to);
  if (query.from.slice(0, 4) !== query.to.slice(0, 4))
    throw new BadRequestException("Choose a period within one calendar year.");
  const year = Number(query.from.slice(0, 4));
  if (!SOCIAL_SECURITY_CAPS[year])
    throw new BadRequestException(
      "Employer tax estimates currently support 2024–2026.",
    );
  const extraRate = Number(query.extraRate ?? 0),
    extraCap = Number(query.extraCap ?? 9000);
  if (
    !Number.isFinite(extraRate) ||
    extraRate < 0 ||
    extraRate > 20 ||
    !Number.isFinite(extraCap) ||
    extraCap < 0 ||
    extraCap > 1000000
  )
    throw new BadRequestException(
      "Enter a valid optional employer tax rate and wage base.",
    );
  const basis = query.basis || "SERVICE";
  if (!["SERVICE", "SENT"].includes(basis))
    throw new BadRequestException("Invalid invoice date basis.");
  return {
    from: query.from as string,
    to: query.to as string,
    year,
    extraRate,
    extraCap,
    basis,
  };
}
export function buildFinanceSummary(data: any, query: any) {
  const options = summaryOptions(query),
    { from, to, year, extraRate, extraCap, basis } = options;
  const warnings: string[] = [];
  const annual = buildTimesheetReport(
    data.business,
    data.sheets,
    data.rateChanges,
    { from: year + "-01-01", to, status: "APPROVED" },
  );
  const iso = (date: string) =>
    date.slice(6, 10) + "-" + date.slice(0, 2) + "-" + date.slice(3, 5);
  const periodRows = annual.rows.filter(
    (r) => iso(r.date) >= from && iso(r.date) <= to,
  );
  const selectedInvoices: any[] = [];
  let partialInvoices = 0;
  for (const invoice of data.invoices) {
    if (["DRAFT", "VOID", "CANCELLED"].includes(invoice.status)) continue;
    const a = new Date(invoice.issueDate).toISOString().slice(0, 10),
      z = new Date(invoice.dueDate).toISOString().slice(0, 10);
    if (basis === "SERVICE") {
      if (a >= from && z <= to) selectedInvoices.push(invoice);
      else if (a <= to && z >= from) partialInvoices++;
    } else if (invoice.firstSentAt) {
      const day = reportDay(invoice.firstSentAt);
      if (day >= from && day <= to) selectedInvoices.push(invoice);
    }
  }
  if (partialInvoices)
    warnings.push(
      partialInvoices +
        " sent invoices overlap the selection but extend outside it. They are excluded; expand the period to include their full service dates. No revenue is prorated.",
    );
  const workers: any[] = [];
  for (const row of periodRows) {
    const key = row.employeeId + "|" + row.workerType;
    let w = workers.find((w) => w.key === key);
    if (!w) {
      w = {
        key,
        employeeId: row.employeeId,
        name: row.name.toUpperCase(),
        workerType: row.workerType,
        hours: 0,
        overtimeHours: 0,
        gross: 0,
        missing: 0,
        rates: [],
        deductions: 0,
        scheduledDeductions: 0,
        employerTax: 0,
        taxParts: { socialSecurity: 0, medicare: 0, futa: 0, additional: 0 },
        locations: {},
      };
      workers.push(w);
    }
    w.hours += row.hours || 0;
    w.overtimeHours += row.overtimeHours || 0;
    w.gross += row.gross || 0;
    if (row.gross === null) w.missing++;
    if (row.rate !== null && !w.rates.includes(row.rate))
      w.rates.push(row.rate);
    const sheet = data.sheets.find((s: any) => s.id === row.id),
      id = sheet?.locationId || "unassigned";
    if (!w.locations[id]) w.locations[id] = { hours: 0, gross: 0 };
    w.locations[id].hours += row.hours || 0;
    w.locations[id].gross += row.gross || 0;
  }
  const deductionRows: any[] = [];
  const stubLoanIds = new Set<string>();
  const payrollDeductions = new Set<string>();
  for (const stub of data.stubs) {
    const start = new Date(stub.payroll.periodStart).toISOString().slice(0, 10),
      end = new Date(stub.payroll.periodEnd).toISOString().slice(0, 10);
    if (start < from || end > to) {
      if (start <= to && end >= from)
        warnings.push(
          "Payroll " +
            stub.payrollId +
            " partially overlaps this period; its deductions are excluded to prevent partial-period double counting.",
        );
      continue;
    }
    const w = workers.find(
      (w) =>
        w.employeeId === stub.employeeId && w.workerType === stub.workerType,
    );
    let details: any = {};
    try {
      details = JSON.parse(stub.deductionDetails || "{}");
    } catch {
      warnings.push(
        "Review unreadable deduction details for " + stub.employeeId,
      );
    }
    for (const loan of details.loans || [])
      stubLoanIds.add(stub.payrollId + "|" + loan.loanId);
    if (stub.deductions > 0)
      payrollDeductions.add(stub.payrollId + "|" + stub.employeeId);
    if (stub.deductions > 0) {
      if (w) w.deductions += stub.deductions;
      deductionRows.push({
        employeeId: stub.employeeId,
        name: stub.employee.firstName + " " + stub.employee.lastName,
        type: "Recorded payroll deductions",
        amount: stub.deductions,
        status: "RECORDED",
        reference: stub.payrollId,
      });
    }
  }
  for (const repayment of data.repayments) {
    if (
      repayment.payrollId &&
      (stubLoanIds.has(repayment.payrollId + "|" + repayment.loanId) ||
        payrollDeductions.has(
          repayment.payrollId + "|" + repayment.loan.employeeId,
        ))
    )
      continue;
    const day = reportDay(repayment.date);
    if (day < from || day > to) continue;
    const w = workers.find((w) => w.employeeId === repayment.loan.employeeId);
    if (w) w.deductions += repayment.amount;
    deductionRows.push({
      employeeId: repayment.loan.employeeId,
      name:
        repayment.loan.employee.firstName +
        " " +
        repayment.loan.employee.lastName,
      type: "Recorded loan repayment",
      amount: repayment.amount,
      status: "RECORDED",
      reference: repayment.id,
    });
  }
  for (const loan of data.loans) {
    if (reportDay(loan.createdAt) > to || !(loan.balance > 0)) continue;
    const amount = money(Math.min(loan.balance, loan.perPayPeriodDeduction));
    const w = workers.find((w) => w.employeeId === loan.employeeId);
    if (w) w.scheduledDeductions += amount;
    deductionRows.push({
      employeeId: loan.employeeId,
      name: loan.employee.firstName + " " + loan.employee.lastName,
      type: "Scheduled loan deduction per pay period",
      amount,
      status: "SCHEDULED",
      reference: loan.id,
    });
  }
  const taxCap = SOCIAL_SECURITY_CAPS[year];
  for (const w of workers) {
    w.hours = money(w.hours);
    w.overtimeHours = money(w.overtimeHours);
    w.gross = money(w.gross);
    w.deductions = money(w.deductions);
    w.scheduledDeductions = money(w.scheduledDeductions);
    if (w.workerType !== "W2") continue;
    const prior = annual.rows.filter(
      (r) =>
        r.employeeId === w.employeeId &&
        r.workerType === "W2" &&
        iso(r.date) < from,
    );
    const priorWages = prior.reduce((n, r) => n + (r.gross || 0), 0);
    w.priorWageHistoryIncomplete = prior.some((r) => r.gross === null);
    const taxable = (cap: number) =>
      Math.min(w.gross, Math.max(0, cap - priorWages));
    w.taxParts = {
      socialSecurity: money(taxable(taxCap) * 0.062),
      medicare: money(w.gross * 0.0145),
      futa: money(taxable(7000) * 0.006),
      additional: money(
        ((extraCap ? taxable(extraCap) : w.gross) * extraRate) / 100,
      ),
    };
    w.employerTax = money(
      Object.values(w.taxParts).reduce((n: number, v: any) => n + v, 0),
    );
  }
  const incompletePrior = workers.filter(
    (w) => w.priorWageHistoryIncomplete,
  ).length;
  if (incompletePrior)
    warnings.push(
      incompletePrior +
        " W-2 workers have incomplete prior approved wage history. Annual wage caps and employer tax estimates may be overstated. Review prior/off-platform wages before relying on this estimate.",
    );
  const locations: any[] = [];
  const location = (id: string) => {
    let l = locations.find((l) => l.id === id);
    if (!l) {
      l = {
        id,
        name:
          data.locations.find((p: any) => p.id === id)?.name ||
          "Unassigned location",
        invoiceCount: 0,
        revenue: 0,
        salesTax: 0,
        invoicedTotal: 0,
        balance: 0,
        scheduledHours: 0,
        approvedHours: 0,
        gross: 0,
        employerTax: 0,
        margin: 0,
      };
      locations.push(l);
    }
    return l;
  };
  const invoices = selectedInvoices.map((i) => {
    const tracked = invoiceTracking(i),
      l = location(i.locationId || "unassigned");
    l.invoiceCount++;
    l.revenue += i.subtotal;
    l.salesTax += i.taxAmount;
    l.invoicedTotal += i.total;
    l.balance += tracked.balanceDue;
    return {
      id: i.id,
      number: i.invoiceNumber,
      location: l.name,
      serviceFrom: new Date(i.issueDate).toISOString().slice(0, 10),
      serviceTo: new Date(i.dueDate).toISOString().slice(0, 10),
      revenue: i.subtotal,
      salesTax: i.taxAmount,
      total: i.total,
      balance: tracked.balanceDue,
    };
  });
  const seen = new Set<string>();
  for (const s of [...data.shifts].sort(
    (a: any, b: any) =>
      (({ COMPLETED: 4, PUBLISHED: 3, OPEN: 2, DRAFT: 1 }) as any)[b.status] -
      ({ COMPLETED: 4, PUBLISHED: 3, OPEN: 2, DRAFT: 1 } as any)[a.status],
  )) {
    const day = reportDay(s.startTime, s.timeZone || "America/New_York");
    if (day < from || day > to) continue;
    const key = s.groupId || s.id;
    if (seen.has(key)) continue;
    seen.add(key);
    location(s.locationId || "unassigned").scheduledHours += Math.max(
      0,
      (+new Date(s.endTime) - +new Date(s.startTime)) / 3600000 -
        (s.breakMinutes || 0) / 60,
    );
  }
  for (const w of workers) {
    let allocated = 0;
    const ids = Object.keys(w.locations);
    ids.forEach((id, index) => {
      const l = location(id),
        part = w.locations[id];
      const tax =
        index === ids.length - 1
          ? money(w.employerTax - allocated)
          : money(w.gross ? (w.employerTax * part.gross) / w.gross : 0);
      allocated += tax;
      l.approvedHours += part.hours;
      l.gross += part.gross;
      l.employerTax += tax;
    });
  }
  for (const l of locations) {
    l.originalRevenue = l.revenue;
  }
  let overrides: any;
  try {
    overrides = JSON.parse(query.manualAmounts || "{}");
  } catch {
    throw new BadRequestException("Invalid manual invoice amounts.");
  }
  if (
    !overrides ||
    Array.isArray(overrides) ||
    typeof overrides !== "object" ||
    Object.keys(overrides).length > 100
  )
    throw new BadRequestException("Invalid manual invoice amounts.");
  for (const [id, input] of Object.entries(overrides) as [string, any][]) {
    if (
      !data.locations.some((l: any) => l.id === id) ||
      !input ||
      typeof input.amount !== "number" ||
      !Number.isFinite(input.amount) ||
      input.amount < 0 ||
      input.amount > 100000000 ||
      typeof input.reason !== "string" ||
      !input.reason.trim() ||
      input.reason.length > 300
    )
      throw new BadRequestException(
        "Choose a valid location, non-negative amount and adjustment reason.",
      );
    const l = location(id);
    l.originalRevenue = l.originalRevenue ?? l.revenue;
    l.revenue = money(input.amount);
    l.manualReason = input.reason.trim();
    warnings.push(
      "Manual revenue: " +
        l.name +
        "; original " +
        money(l.originalRevenue).toFixed(2) +
        "; adjusted " +
        l.revenue.toFixed(2) +
        ". Reason: " +
        l.manualReason +
        ". This replaces report revenue only; invoice totals, tax and balances remain unchanged.",
    );
  }
  for (const l of locations) {
    l.manualInvoiceRequired = /\bprotos\b/i.test(
      data.locations.find((p: any) => p.id === l.id)?.client?.name || "",
    );
    if (l.manualInvoiceRequired && !l.manualReason) {
      l.revenue = 0;
      warnings.push(
        "Manual invoice amount required for Protos location " +
          l.name +
          ". Revenue is excluded until you enter an amount (including zero where appropriate).",
      );
    }
    for (const key of [
      "revenue",
      "salesTax",
      "invoicedTotal",
      "balance",
      "scheduledHours",
      "approvedHours",
      "gross",
      "employerTax",
    ])
      l[key] = money(l[key]);
    l.margin = money(l.revenue - l.gross - l.employerTax);
  }
  const workerNames = new Map(
    data.sheets.map((s: any) => [
      s.employeeId,
      `${s.employee.lastName || ""} ${s.employee.firstName || ""}`
        .trim()
        .toUpperCase(),
    ]),
  );
  workers.sort(
    (a, b) =>
      String(workerNames.get(a.employeeId) || a.name).localeCompare(
        String(workerNames.get(b.employeeId) || b.name),
      ) || a.employeeId.localeCompare(b.employeeId),
  );
  locations.sort((a, b) => a.name.localeCompare(b.name));
  const sum = (key: string) => money(locations.reduce((n, l) => n + l[key], 0));
  const missing = workers.reduce((n, w) => n + w.missing, 0);
  const missingLabor = locations.filter(
    (l) => l.revenue > 0 && l.approvedHours === 0,
  ).length;
  if (missingLabor)
    warnings.push(
      missingLabor +
        " invoiced locations have no approved worker hours in this period. Review attendance before relying on the contribution calculation.",
    );
  if (missing)
    warnings.push(
      missing +
        " approved attendance rows have missing rates, salary pay, invalid ranges, or overlap. Wage totals and margin are incomplete.",
    );
  const totals = {
    invoices: invoices.length,
    workers: new Set(workers.map((w) => w.employeeId)).size,
    scheduledHours: sum("scheduledHours"),
    approvedHours: sum("approvedHours"),
    revenue: sum("revenue"),
    salesTax: sum("salesTax"),
    invoicedTotal: sum("invoicedTotal"),
    outstanding: sum("balance"),
    grossPay: sum("gross"),
    employerTaxes: sum("employerTax"),
    deductions: money(
      deductionRows
        .filter((r) => r.status === "RECORDED")
        .reduce((n, r) => n + r.amount, 0),
    ),
    margin: sum("margin"),
    incomplete:
      missing > 0 ||
      partialInvoices > 0 ||
      missingLabor > 0 ||
      locations.some((l) => l.manualInvoiceRequired && !l.manualReason),
  };
  return {
    title: "Revenue & Payroll Summary",
    from,
    to,
    basis,
    generatedAt: new Date().toISOString(),
    business: {
      name: data.business.name,
      currency: data.business.currencyCode || "USD",
      address: [
        data.business.address,
        [data.business.city, data.business.state, data.business.zip]
          .filter(Boolean)
          .join(", "),
      ]
        .filter(Boolean)
        .join(" | "),
    },
    options,
    totals,
    locations,
    availableLocations: data.locations.map((l: any) => ({
      ...l,
      manualInvoiceRequired: /\bprotos\b/i.test(l.client?.name || ""),
    })),
    workers,
    invoices,
    deductions: deductionRows,
    warnings: [...new Set(warnings)],
    notes: [
      basis === "SERVICE"
        ? "Service-period revenue includes only sent/paid invoices fully contained in the selected service dates. Unsent drafts and void invoices are excluded. Revenue excludes invoice sales tax. Outstanding balance is current, not a historical balance."
        : "Email-date revenue includes invoices first emailed in the selected period. Legacy records without a recovered first-send date are excluded. Revenue excludes sales tax; outstanding balance is current.",
      "Approved hours are grouped by the work-location clock-in date, after unpaid breaks. Gross pay uses saved historical/shift rates and weekly overtime. Historical paid attendance is included as a cost, not paid again.",
      "Recorded deductions come from processed/paid payroll and recorded loan repayments. Scheduled loan amounts mirror the Deductions page and are per pay period, not applied or prorated here. Employee deductions do not reduce gross wage expense.",
      "Employer taxes are planning estimates for W-2 wages only: Social Security 6.2% up to the annual wage base; Medicare 1.45% without a cap; FUTA 0.6% on the first $7,000, assuming full credit. Optional additional employer tax is a user-entered assumption.",
      "Annual caps use prior approved attendance wages available in this app, not certified payroll taxable wages. Missing/off-platform wage history, benefits and tax exemptions can change the result. State/local taxes, paid-leave levies and workers compensation are excluded unless supplied in the optional estimate.",
      "Contribution margin = invoiced revenue before sales tax minus approved gross pay minus estimated employer taxes. This is not net profit: overhead, insurance, rent and other expenses are not included. This report does not change payroll, deductions, invoices or payments.",
      "Federal tax source: https://www.irs.gov/publications/p15",
    ],
  };
}
export type FinanceSummary = ReturnType<typeof buildFinanceSummary>;
