import { calendarBoundary } from "../payroll/dates";
import { BadRequestException } from "@nestjs/common";
/** Allocate integer cents once across W2/1099 stubs; preserve any unpaid offset balance. */
export function allocateFlexPay(
  records: any[],
  availableNet: number,
  reserved: Map<string, number> = new Map(),
) {
  if (!Number.isFinite(availableNet))
    throw new BadRequestException("Invalid available net pay");
  let remaining = Math.max(0, Math.round(availableNet * 100));
  const entries: any[] = [];
  for (const r of records) {
    if (!Number.isSafeInteger(r.balanceCents) || r.balanceCents < 0)
      throw new BadRequestException("Invalid Flex Pay balance");
    const already = Math.round((reserved.get("flex:" + r.id) ?? 0) * 100);
    if (!Number.isSafeInteger(already) || already < 0)
      throw new BadRequestException("Invalid reserved Flex Pay offset");
    const cents = Math.min(remaining, Math.max(0, r.balanceCents - already));
    if (cents > 0) {
      entries.push({
        flexPayId: r.id,
        amount: cents / 100,
        amountCents: cents,
        paymentReference: r.paymentReference,
      });
      remaining -= cents;
    }
  }
  const totalCents = entries.reduce((n, e) => n + e.amountCents, 0);
  return { entries, totalDeductions: totalCents / 100 };
}

export const flexPayCutoff = (run: any) =>
  calendarBoundary(
    new Date(run.payDate).toISOString().slice(0, 10),
    run.calendarTimeZone || "America/New_York",
    true,
  );

export async function reconcileFlexPay(
  tx: any,
  payroll: any,
  stub: any,
  user: any,
) {
  const details = JSON.parse(stub.deductionDetails || "{}");
  const entries = details.flexPay || [];
  if (!Array.isArray(entries))
    throw new BadRequestException("Invalid Flex Pay deduction details");
  const offsetCents = entries.reduce(
    (sum: any, f: any) => sum + f.amountCents,
    0,
  );
  if (
    entries.length &&
    (!Number.isSafeInteger(offsetCents) ||
      !Number.isFinite(stub.deductions) ||
      offsetCents > Math.round(stub.deductions * 100))
  )
    throw new BadRequestException(
      "Flex Pay offsets exceed the deductions on this payslip. Recalculate payroll.",
    );
  const payrollId = payroll.id;
  const pendingFlex = await (tx as any).flexPay.findMany({
    where: {
      employeeId: stub.employeeId,
      status: "PAID",
      balanceCents: { gt: 0 },
      paidAt: { lte: flexPayCutoff(payroll) },
    },
  });
  const flexScheduled = new Set(
    (details.flexPay || []).map((f: any) => f.flexPayId),
  );
  if (
    stub.grossPay - stub.taxes > 0 &&
    pendingFlex.some((f: any) => !flexScheduled.has(f.id))
  )
    throw new BadRequestException(
      "A Flex Pay payment was recorded after payroll calculation. Recalculate payroll to avoid duplicate pay.",
    );
  for (const f of details.flexPay || []) {
    if (
      !Number.isSafeInteger(f.amountCents) ||
      f.amountCents <= 0 ||
      Math.round(f.amount * 100) !== f.amountCents
    )
      throw new BadRequestException("Invalid Flex Pay reconciliation amount");
    const changed = await (tx as any).flexPay.updateMany({
      where: {
        id: f.flexPayId,
        employeeId: stub.employeeId,
        businessId: payroll.businessId,
        status: "PAID",
        balanceCents: { gte: f.amountCents },
        paidAt: { lte: flexPayCutoff(payroll) },
      },
      data: { balanceCents: { decrement: f.amountCents } },
    });
    if (changed.count !== 1)
      throw new BadRequestException(
        "Flex Pay balance changed. Recalculate payroll before approval.",
      );
    await (tx as any).flexPayReconciliation.upsert({
      where: { flexPayId_payrollId: { flexPayId: f.flexPayId, payrollId } },
      create: { flexPayId: f.flexPayId, payrollId, amountCents: f.amountCents },
      update: { amountCents: { increment: f.amountCents } },
    });
    await (tx as any).flexPay.updateMany({
      where: { id: f.flexPayId, balanceCents: 0, status: "PAID" },
      data: { status: "RECONCILED" },
    });
    await tx.auditLog.create({
      data: {
        businessId: payroll.businessId,
        userId: user?.userId,
        action: "FLEX_PAY_RECONCILED",
        resource: "FLEX_PAY",
        resourceId: f.flexPayId,
        details: JSON.stringify({
          payrollId,
          employeeId: stub.employeeId,
          amountCents: f.amountCents,
        }),
      },
    });
  }
}
