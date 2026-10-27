export const invoiceStatusLabel = (status: string) =>
  ({
    DRAFT: "Draft",
    UNPAID: "Unpaid",
    SENT: "Unpaid",
    PARTIALLY_PAID: "Partially paid",
    PAID: "Paid",
    OVERDUE: "Overdue",
    VOID: "Void",
    CANCELLED: "Void",
  })[status] || status;
export function invoiceDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });
}
export function invoiceMetrics(invoices: any[]) {
  const issued = invoices.filter(
    (i) => !["DRAFT", "VOID", "CANCELLED"].includes(i.status),
  );
  const sum = (rows: any[], field: string) =>
    Math.round(
      rows.reduce((n, i) => n + Math.round((i[field] || 0) * 100), 0),
    ) / 100;
  const unpaid = issued.filter((i) => i.balanceDue > 0);
  return {
    outstanding: sum(unpaid, "balanceDue"),
    paid: sum(issued, "amountPaid"),
    overdue: sum(
      unpaid.filter((i) => i.isOverdue),
      "balanceDue",
    ),
    drafts: invoices.filter((i) => i.status === "DRAFT").length,
    unpaidCount: unpaid.length,
    aging: [
      {
        label: "Current",
        amount: sum(
          unpaid.filter((i) => !i.isOverdue),
          "balanceDue",
        ),
      },
      {
        label: "1–30 days",
        amount: sum(
          unpaid.filter((i) => i.daysOverdue > 0 && i.daysOverdue <= 30),
          "balanceDue",
        ),
      },
      {
        label: "31–60 days",
        amount: sum(
          unpaid.filter((i) => i.daysOverdue > 30 && i.daysOverdue <= 60),
          "balanceDue",
        ),
      },
      {
        label: "61–90 days",
        amount: sum(
          unpaid.filter((i) => i.daysOverdue > 60 && i.daysOverdue <= 90),
          "balanceDue",
        ),
      },
      {
        label: "90+ days",
        amount: sum(
          unpaid.filter((i) => i.daysOverdue > 90),
          "balanceDue",
        ),
      },
    ],
  };
}
export function invoiceMatches(invoice: any, status: string) {
  return (
    status === "ALL" ||
    (status === "WITH_PAYMENTS" &&
      invoice.amountPaid > 0 &&
      !["DRAFT", "VOID"].includes(invoice.status)) ||
    (status === "OPEN"
      ? invoice.balanceDue > 0 && !["DRAFT", "VOID"].includes(invoice.status)
      : status === "PARTIALLY_PAID"
        ? invoice.paymentStatus === "PARTIALLY_PAID"
        : invoice.status === status)
  );
}
export function exportInvoiceCsv(invoices: any[], currency: string) {
  const cell = (value: any) => {
    let s = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const rows = [
    [
      "Invoice",
      "Client",
      "Site",
      "Service start date",
      "Service end date",
      "Payment terms",
      "Payment due date",
      "Status",
      "Currency",
      "Total",
      "Paid",
      "Balance due",
      "Days overdue",
    ],
    ...invoices.map((i) => [
      i.invoiceNumber,
      i.client?.name,
      i.location?.name,
      invoiceDate(i.issueDate),
      invoiceDate(i.dueDate),
      i.paymentTerms || i.client?.paymentTerms || "",
      i.paymentDueDate
        ? invoiceDate(i.paymentDueDate)
        : i.paymentTermsFromEmail
          ? "Awaiting email"
          : invoiceDate(i.dueDate),
      invoiceStatusLabel(i.status),
      currency,
      i.total.toFixed(2),
      i.amountPaid.toFixed(2),
      i.balanceDue.toFixed(2),
      i.daysOverdue,
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
export function invoiceError(error: any) {
  const message = error?.response?.data?.message;
  return Array.isArray(message)
    ? message.join(", ")
    : typeof message === "string"
      ? message
      : "Something went wrong. Please try again.";
}

export function invoicePeriodRange(
  period: string,
  anchor: string,
): { start: string; end: string } | null {
  if (period === "ALL" || !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return null;
  const date = new Date(`${anchor}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== anchor
  )
    return null;
  const start = new Date(date),
    end = new Date(date);
  if (period === "WEEKLY") {
    start.setUTCDate(date.getUTCDate() - date.getUTCDay());
    end.setTime(start.getTime());
    end.setUTCDate(start.getUTCDate() + 6);
  } else if (
    period === "MONTHLY" ||
    period === "QUARTERLY" ||
    period === "YEARLY"
  ) {
    const month =
      period === "YEARLY"
        ? 0
        : period === "QUARTERLY"
          ? Math.floor(date.getUTCMonth() / 3) * 3
          : date.getUTCMonth();
    start.setUTCDate(1);
    start.setUTCMonth(month);
    end.setTime(start.getTime());
    end.setUTCMonth(
      month + (period === "YEARLY" ? 12 : period === "QUARTERLY" ? 3 : 1),
      0,
    );
  } else return null;
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
export function invoiceInPeriod(
  invoice: any,
  range: { start: string; end: string } | null,
): boolean {
  if (!range) return true;
  const status = invoice.documentStatus || invoice.status;
  if (["DRAFT", "VOID", "CANCELLED"].includes(status)) return false;
  const date = String(invoice.issueDate).slice(0, 10);
  return date >= range.start && date <= range.end;
}
