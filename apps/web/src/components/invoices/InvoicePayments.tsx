"use client";
import AmericanDateInput from "./AmericanDateInput";
import { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/localization";
import { invoiceDate, invoiceError } from "./accounting";
export default function InvoicePayments({
  invoice,
  currency,
  onChange,
}: {
  invoice: any;
  currency?: string;
  onChange: (invoice: any) => void;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [key, setKey] = useState("");
  const [form, setForm] = useState({
    amount: "",
    paidAt: "",
    method: "BANK",
    reference: "",
    notes: "",
  });
  const [reverse, setReverse] = useState<string | null>(null),
    [reason, setReason] = useState("");
  const money = (n: number) => formatCurrency(n, currency);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > invoice.balanceDue
    ) {
      toast.error("Enter an amount within the outstanding balance.");
      return;
    }
    setBusy(true);
    try {
      const response = await api.post(`/invoices/${invoice.id}/payments`, {
        ...form,
        amount,
        idempotencyKey: key,
      });
      onChange(response.data);
      setOpen(false);
      toast.success("Payment recorded. Invoice balance updated.");
    } catch (e) {
      toast.error(invoiceError(e));
    } finally {
      setBusy(false);
    }
  }
  async function undo(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const response = await api.post(
        `/invoices/${invoice.id}/payments/${reverse}/reverse`,
        { reason },
      );
      onChange(response.data);
      setReverse(null);
      setReason("");
      toast.success("Payment record reversed. History retained.");
    } catch (e) {
      toast.error(invoiceError(e));
    } finally {
      setBusy(false);
    }
  }
  const input =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white";
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Payment history
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Record payments already received and reconcile the balance.
          </p>
        </div>
        {invoice.balanceDue > 0 &&
          !["DRAFT", "VOID"].includes(invoice.status) && (
            <button
              disabled={busy}
              onClick={() => {
                setKey(crypto.randomUUID());
                setForm({
                  amount: invoice.balanceDue.toFixed(2),
                  paidAt: new Date().toLocaleDateString("en-CA"),
                  method: "BANK",
                  reference: "",
                  notes: "",
                });
                setOpen(true);
              }}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Record payment
            </button>
          )}
      </div>
      <div className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Invoice total", invoice.total],
          ["Paid", invoice.amountPaid],
          ["Balance due", invoice.balanceDue],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {money(Number(value))}
            </p>
          </div>
        ))}
      </div>
      {invoice.legacyPaid && (
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Previously marked paid. No historical payment breakdown was recorded.
        </p>
      )}
      {open && (
        <form
          onSubmit={save}
          className="mb-5 space-y-4 rounded-xl bg-teal-50 p-4 dark:bg-teal-950/30"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This records an existing receipt. It does not charge a card or
            transfer funds.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Amount received
              <input
                aria-label="Amount received"
                className={input}
                required
                type="number"
                min="0.01"
                max={invoice.balanceDue}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Payment date
              <AmericanDateInput
                aria-label="Payment date"
                className={input}
                required
                min={invoice.issueDate.slice(0, 10)}
                max={new Date().toLocaleDateString("en-CA")}
                value={form.paidAt}
                onChange={(value) => setForm({ ...form, paidAt: value })}
              />
            </label>
            <label className="text-sm">
              Method
              <select
                aria-label="Payment method"
                className={input}
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                {["BANK", "CARD", "CASH", "CHECK", "WIRE", "OTHER"].map((m) => (
                  <option key={m} value={m}>
                    {m.charAt(0) + m.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Reference
              <input
                aria-label="Payment reference"
                className={input}
                maxLength={120}
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
                placeholder="Receipt or bank reference"
              />
            </label>
          </div>
          <label className="block text-sm">
            Notes
            <textarea
              aria-label="Payment notes"
              className={input}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save payment record"}
            </button>
          </div>
        </form>
      )}
      {reverse && (
        <form
          onSubmit={undo}
          className="mb-5 space-y-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-950/20"
        >
          <p className="text-sm">
            Reverse an incorrect record. This does not refund money; the
            original receipt remains visible.
          </p>
          <label className="block text-sm">
            Reason for reversal
            <textarea
              aria-label="Reason for reversal"
              required
              maxLength={2000}
              className={input}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setReverse(null)}
            >
              Cancel
            </button>
            <button
              disabled={busy || !reason.trim()}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Reverse payment record"}
            </button>
          </div>
        </form>
      )}
      <div className="space-y-3">
        {!invoice.payments?.length ? (
          <p className="text-sm text-slate-500">
            No payment records yet.
            {invoice.status === "DRAFT"
              ? " Issue this invoice before recording a payment."
              : ""}
          </p>
        ) : (
          invoice.payments.map((p: any) => (
            <div
              key={p.id}
              className={`rounded-lg border border-slate-200 p-3 dark:border-slate-700 ${p.voidedAt ? "opacity-70" : ""}`}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <span
                    className={`font-semibold ${p.voidedAt ? "line-through" : ""}`}
                  >
                    {money(p.amountCents / 100)}
                  </span>
                  <span className="ml-3 text-sm text-slate-500">
                    {invoiceDate(p.paidAt)} · {p.method}
                  </span>
                </div>
                {p.voidedAt ? (
                  <span className="text-xs font-semibold text-amber-700">
                    Reversed
                  </span>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => {
                      setReverse(p.id);
                      setReason("");
                      setOpen(false);
                    }}
                    className="text-xs font-medium text-rose-700 hover:underline"
                  >
                    Correct record
                  </button>
                )}
              </div>
              {p.reference && (
                <p className="mt-1 text-sm text-slate-500">
                  Reference: {p.reference}
                </p>
              )}
              {p.notes && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">
                  {p.notes}
                </p>
              )}
              {p.voidedAt && (
                <p className="mt-1 text-sm text-amber-700">
                  {invoiceDate(p.voidedAt)} · {p.voidReason}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
