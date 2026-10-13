import { invoiceStatusLabel } from "./accounting";
export default function StatusBadge({ status }: { status: string }) {
  const color =
    status === "PAID"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : status === "OVERDUE"
        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
        : status === "PARTIALLY_PAID"
          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
          : status === "UNPAID" || status === "SENT"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200";
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      {invoiceStatusLabel(status)}
    </span>
  );
}
