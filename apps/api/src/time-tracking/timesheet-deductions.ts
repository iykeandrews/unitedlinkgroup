// Period-specific advances are ordinary loan-ledger entries, recovered once by payroll.
// The period marker also makes historical timesheet exports stable after repayment.
export function timesheetDeductions(loans: any[], stubs: any[], from: string, to: string) {
  const totals: Record<string, number> = {};
  const applied = new Set<string>();
  for (const stub of stubs) {
    totals[stub.employeeId] = (totals[stub.employeeId] || 0) + (stub.deductions || 0);
    try {
      for (const entry of JSON.parse(stub.deductionDetails || "{}").loans || [])
        applied.add(entry.loanId);
    } catch {}
  }
  for (const loan of loans) {
    const period = /\[(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})\]/.exec(loan.reason || "");
    if (!period || period[1] < from || period[2] > to || applied.has(loan.id) ||
        !["APPROVED", "PAID"].includes(loan.status)) continue;
    totals[loan.employeeId] = (totals[loan.employeeId] || 0) + loan.amount;
  }
  return totals;
}
