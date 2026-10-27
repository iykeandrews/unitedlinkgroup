import { BadRequestException } from "@nestjs/common";
export const PAYMENT_METHODS = [
  "BANK",
  "CARD",
  "CASH",
  "CHECK",
  "WIRE",
  "OTHER",
];
export function cents(value: unknown, label = "Amount"): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 20000000
  )
    throw new BadRequestException(
      `${label} must be a finite amount between zero and 20,000,000.`,
    );
  return Math.round((value + Number.EPSILON) * 100);
}
export const money = (value: number) => cents(value) / 100;
export function invoiceDay(value: unknown, label = "Date"): string {
  const day = typeof value === "string" ? value.slice(0, 10) : "";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(day)) ||
    new Date(day).toISOString().slice(0, 10) !== day
  )
    throw new BadRequestException(`${label} must be a valid calendar date.`);
  return day;
}
export function invoiceTotals(items: any[], rate: number, inclusive: boolean) {
  if (!Array.isArray(items) || !items.length || items.length > 500)
    throw new BadRequestException("Add between 1 and 500 invoice items.");
  if (!Number.isFinite(rate) || rate < 0 || rate > 100)
    throw new BadRequestException(
      "Configured tax rate must be between 0 and 100.",
    );
  const rows = items.map((item) => {
    if (
      typeof item.description !== "string" ||
      !item.description.trim() ||
      item.description.length > 2000
    )
      throw new BadRequestException(
        "Each item needs a description of up to 2,000 characters.",
      );
    if (
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > 1000000
    )
      throw new BadRequestException("Item quantity must be positive.");
    cents(item.rate, "Item rate");
    return {
      description: item.description.trim(),
      quantity: item.quantity,
      rate: money(item.rate),
      amount: money(item.quantity * money(item.rate)),
    };
  });
  const subtotal =
    rows.reduce((sum, item) => sum + cents(item.amount), 0) / 100;
  cents(subtotal, "Subtotal");
  const taxAmount = money(
    inclusive ? (subtotal * rate) / (100 + rate) : (subtotal * rate) / 100,
  );
  const total = money(inclusive ? subtotal : subtotal + taxAmount);
  if (total <= 0)
    throw new BadRequestException("Invoice total must be greater than zero.");
  return {
    items: rows,
    subtotal,
    taxRate: rate,
    taxAmount,
    taxInclusive: inclusive,
    total,
  };
}
export function invoiceTracking(
  invoice: any,
  today = new Date().toISOString().slice(0, 10),
) {
  const payments = invoice.payments || [];
  const active = payments.filter((p: any) => !p.voidedAt);
  const legacyPaid = invoice.status === "PAID" && payments.length === 0;
  const amountPaidCents = legacyPaid
    ? cents(invoice.total)
    : active.reduce((sum: number, p: any) => sum + p.amountCents, 0);
  const documentStatus = ["CANCELLED", "VOID"].includes(invoice.status)
    ? "VOID"
    : invoice.status;
  const balanceCents =
    documentStatus === "VOID"
      ? 0
      : Math.max(0, cents(invoice.total) - amountPaidCents);
  const paymentDeadline =
    invoice.paymentDueDate ||
    (!invoice.paymentTermsFromEmail ? invoice.dueDate : null);
  const dueDay = paymentDeadline
    ? new Date(paymentDeadline).toISOString().slice(0, 10)
    : null;
  const daysOverdue = Math.max(
    0,
    dueDay
      ? Math.floor((Date.parse(today) - Date.parse(dueDay)) / 86400000)
      : 0,
  );
  const isOverdue =
    documentStatus !== "DRAFT" &&
    documentStatus !== "VOID" &&
    balanceCents > 0 &&
    daysOverdue > 0;
  const status =
    documentStatus === "VOID"
      ? "VOID"
      : documentStatus === "DRAFT"
        ? "DRAFT"
        : balanceCents === 0
          ? "PAID"
          : isOverdue
            ? "OVERDUE"
            : amountPaidCents > 0
              ? "PARTIALLY_PAID"
              : "UNPAID";
  return {
    ...invoice,
    taxInclusive:
      invoice.taxInclusive ||
      (invoice.taxAmount > 0 &&
        cents(invoice.total) === cents(invoice.subtotal)),
    documentStatus,
    status,
    amountPaid: amountPaidCents / 100,
    balanceDue: balanceCents / 100,
    legacyPaid,
    isOverdue,
    daysOverdue: isOverdue ? daysOverdue : 0,
    paymentStatus:
      balanceCents === 0
        ? "PAID"
        : amountPaidCents > 0
          ? "PARTIALLY_PAID"
          : "UNPAID",
    lastPaidAt:
      active.sort(
        (a: any, b: any) =>
          new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      )[0]?.paidAt || null,
  };
}
