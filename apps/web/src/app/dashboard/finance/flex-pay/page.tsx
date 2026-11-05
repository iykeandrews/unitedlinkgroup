"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Wallet,
  Zap,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  ArrowRight,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import { useBusiness } from "@/context/business-context";
import { toast } from "sonner";
import { recordInputDate } from "@/lib/time/record-zone";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n || 0,
  );
const stamp = (s: string) =>
  s
    ? new Date(s).toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
const day = (s: string) =>
  s ? new Date(s).toLocaleDateString("en-US", { timeZone: "UTC" }) : "—";
const person = (e: any) =>
  [e?.firstName, e?.lastName].filter(Boolean).join(" ");
const badge = (status: string) =>
  ["PAID", "RECONCILED"].includes(status)
    ? "bg-emerald-100 text-emerald-800"
    : status === "ACCEPTED"
      ? "bg-blue-100 text-blue-800"
      : status === "OFFERED"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-600";
export default function FlexPayPage() {
  const { selectedBusiness } = useBusiness();
  const [selfId, setSelfId] = useState(""),
    [rows, setRows] = useState<any[]>([]),
    [manage, setManage] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("ALL"),
    [selected, setSelected] = useState<any>(null),
    [offer, setOffer] = useState<any>(null),
    [shifts, setShifts] = useState<any[]>([]),
    [shiftSearch, setShiftSearch] = useState(""),
    [payment, setPayment] = useState<any>(null),
    [attendance, setAttendance] = useState<any[]>([]),
    [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const version = useRef(0),
    lock = useRef(false);
  const load = useCallback(async () => {
    const v = ++version.current;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/flex-pay");
      if (v !== version.current) return;
      setRows(data.rows);
      setSummary(data.summary);
      setSelfId(data.employeeId || "");
      setManage(data.canManage);
      setSelected((r: any) =>
        r ? data.rows.find((x: any) => x.id === r.id) || null : null,
      );
    } catch (e: any) {
      if (v === version.current)
        setError(e.response?.data?.message || "Unable to load Flex Pay");
    } finally {
      if (v === version.current) setLoading(false);
    }
  }, [selectedBusiness?.id]);
  useEffect(() => {
    setRows([]);
    setSummary(null);
    setManage(false);
    setSelected(null);
    setOffer(null);
    setPayment(null);
    void load();
    return () => {
      version.current++;
    };
  }, [load]);
  const action = async (path: string, body: any) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.patch(path, body);
      toast.success("Flex Pay record updated");
      setPayment(null);
      await load();
    } catch (e: any) {
      toast.error(
        e.response?.data?.message ||
          "Unable to save. Please refresh and retry.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const newOffer = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const { data } = await api.get("/flex-pay/options");
      setShifts(data.shifts);
      setShiftSearch("");
      setOffer({
        submissionId: crypto.randomUUID(),
        shiftId: "",
        amount: "",
        reason: "",
      });
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || "Unable to load emergency assignments",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.post("/flex-pay", { ...offer, amount: Number(offer.amount) });
      setOffer(null);
      toast.success("Offer sent to the assigned officer");
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Unable to create offer");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const record = async (r: any) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const { data } = await api.get("/flex-pay/" + r.id + "/attendance");
      setAttendance(data);
      setPayment({
        id: r.id,
        timesheetId: data.length === 1 ? data[0].id : "",
        paymentMethod: "BANK_TRANSFER",
        paymentReference: "",
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Unable to load attendance");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const visible = rows.filter(
    (r) =>
      (status === "ALL" || r.status === status) &&
      [
        person(r.employee),
        r.shift?.location?.name,
        r.paymentReference,
        r.reason,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const paid =
      summary?.paidAmount ??
      rows
        .filter((r) => ["PAID", "RECONCILED"].includes(r.status))
        .reduce((n, r) => n + r.amount, 0),
    balance = summary?.balance ?? rows.reduce((n, r) => n + r.balance, 0);
  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:bg-slate-900 dark:border-slate-600 dark:text-white";
  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-900 dark:text-slate-100">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link><span>/</span><span>Finance</span><span>/</span><span aria-current="page" className="font-medium text-slate-900 dark:text-white">Flex Pay</span>
      </nav>
      <header className="border-b border-slate-200 pb-6 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Zap size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">
                Emergency shift coverage
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Flex Pay</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Manage emergency-shift agreements, record payments and track payroll offsets.
            </p>
          </div>
          {manage && (
            <button
              disabled={busy}
              onClick={newOffer}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={18} />
              New Flex Pay offer
            </button>
          )}
        </div>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            "Awaiting agreement",
            summary?.offered ??
              rows.filter((r) => r.status === "OFFERED").length,
            Clock,
          ],
          [
            "Accepted offers",
            summary?.accepted ??
              rows.filter((r) => r.status === "ACCEPTED").length,
            CheckCircle2,
          ],
          ["Payments recorded", money(paid), Wallet],
          ["Awaiting payroll offset", money(balance), ReceiptText],
        ].map(([title, value, Icon]: any) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-700"
          >
            <div className="mb-4 inline-flex rounded-lg bg-slate-50 p-2.5 text-indigo-600 dark:bg-slate-800 dark:text-indigo-400"><Icon size={20} /></div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>
      <section aria-label="Flex Pay workflow" className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:grid-cols-3">
        {[["01", "Offer & agreement", "Link the assignment and receive the officer’s acceptance."], ["02", "Complete & record", "Approve completed attendance, then record the external payment."], ["03", "Payroll reconciliation", "Keep earnings in gross pay; offset the advance from net pay."]].map(([step, title, description]) => <div key={step} className="flex gap-3 p-5 md:border-r last:border-0 border-slate-100 dark:border-slate-800"><span className="pt-1 text-xs font-bold text-indigo-500">{step}</span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p></div></div>)}
      </section>
      <details className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">How Flex Pay affects regular payroll</summary>
        <p className="mt-3 max-w-4xl leading-6 text-slate-500 dark:text-slate-400">
          Flex Pay records money paid outside the app. It does not send money or
          create extra hours. Emergency-shift wages remain in taxable gross pay;
          the amount already received is offset from net pay. Any balance not
          covered by available net pay carries forward.
        </p>
      </details>
      {!!error && (
        <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">
          {error}
          <button onClick={load} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}
      {offer && (
        <form
          onSubmit={submitOffer}
          className="space-y-5 rounded-2xl border border-indigo-200 bg-white p-6 dark:bg-slate-900"
        >
          <h2 className="text-xl font-bold">Offer emergency-shift Flex Pay</h2>
          <p className="text-sm text-slate-500">
            Select the published calendar assignment. Create or correct the
            assignment on Schedule first; this form never duplicates a calendar
            shift.
          </p>
          <label className="block text-sm font-semibold">
            Find assignment
            <input
              className={input + " mt-2"}
              value={shiftSearch}
              onChange={(e) => setShiftSearch(e.target.value)}
              placeholder="Officer or location"
            />
          </label>
          <label className="block text-sm font-semibold">
            Assigned emergency shift
            <select
              required
              className={input + " mt-2"}
              value={offer.shiftId}
              onChange={(e) => setOffer({ ...offer, shiftId: e.target.value })}
            >
              <option value="">Select an assignment</option>
              {shifts
                .filter((s) =>
                  [person(s.employee), s.location?.name]
                    .join(" ")
                    .toLowerCase()
                    .includes(shiftSearch.toLowerCase()),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {person(s.employee)} · {s.location?.name || "No site"} ·{" "}
                    {stamp(s.startTime)} – {stamp(s.endTime)}
                  </option>
                ))}
            </select>
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Agreed immediate payout ($)
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className={input + " mt-2"}
                value={offer.amount}
                onChange={(e) => setOffer({ ...offer, amount: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold">
              Emergency coverage reason
              <textarea
                minLength={10}
                maxLength={2000}
                required
                className={input + " mt-2"}
                value={offer.reason}
                onChange={(e) => setOffer({ ...offer, reason: e.target.value })}
              />
            </label>
          </div>
          <p className="text-sm text-slate-500">
            The officer must accept. Payment can be recorded after completed,
            approved attendance, and cannot exceed its approved gross wages. Set
            the agreed shift pay rate in Time & Attendance if needed.
          </p>
          <div className="flex gap-3">
            <button
              disabled={busy}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Send offer"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOffer(null)}
              className="rounded-xl border px-5 py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {payment && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const paidAt = payment.paidAtLocal
              ? recordInputDate(payment.paidAtLocal, "America/New_York")
              : null;
            if (paidAt && !Number.isFinite(+paidAt)) {
              toast.error("Choose a valid payment time in America/New_York.");
              return;
            }
            if (
              window.confirm(
                "Confirm this external payment has already been made. This records it for payroll offset; no money will be sent.",
              )
            )
              void action("/flex-pay/" + payment.id + "/paid", {
                ...payment,
                paidAt: paidAt?.toISOString(),
              });
          }}
          className="space-y-5 rounded-2xl border border-emerald-200 bg-white p-6 dark:bg-slate-900"
        >
          <h2 className="text-xl font-bold">
            Record payment already made ·{" "}
            {money(rows.find((r) => r.id === payment.id)?.amount || 0)}
          </h2>
          <p className="text-sm text-slate-500">
            Verify the bank, cash or check transaction before confirming.
            Records are retained and cannot be paid again.
          </p>
          <label className="block text-sm font-semibold">
            Actual payment time (America/New_York, optional)
            <input
              type="datetime-local"
              className={input + " mt-2"}
              value={payment.paidAtLocal || ""}
              onChange={(e) =>
                setPayment({ ...payment, paidAtLocal: e.target.value })
              }
            />
            <span className="mt-2 block text-xs font-normal text-slate-500">
              Leave blank to record the current time.
            </span>
          </label>
          <label className="block text-sm font-semibold">
            Completed approved attendance
            <select
              required
              className={input + " mt-2"}
              value={payment.timesheetId}
              onChange={(e) =>
                setPayment({ ...payment, timesheetId: e.target.value })
              }
            >
              <option value="">Select attendance</option>
              {attendance.map((t) => (
                <option key={t.id} value={t.id}>
                  {stamp(t.startTime)} – {stamp(t.endTime)} · {t.workerType}
                </option>
              ))}
            </select>
          </label>
          {!attendance.length && (
            <p role="alert" className="text-sm text-amber-700">
              No eligible attendance found. Complete and approve the officer’s
              attendance on the Time page first.
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Payment method
              <select
                className={input + " mt-2"}
                value={payment.paymentMethod}
                onChange={(e) =>
                  setPayment({ ...payment, paymentMethod: e.target.value })
                }
              >
                {[
                  "BANK_TRANSFER",
                  "CASH",
                  "CHECK",
                  "ZELLE",
                  "CASH_APP",
                  "OTHER",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Unique transaction / receipt reference
              <input
                required
                minLength={3}
                maxLength={120}
                className={input + " mt-2"}
                value={payment.paymentReference}
                onChange={(e) =>
                  setPayment({ ...payment, paymentReference: e.target.value })
                }
              />
            </label>
          </div>
          <div className="flex gap-3">
            <button
              disabled={busy || !attendance.length}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Recording…" : "Confirm external payment recorded"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPayment(null)}
              className="rounded-xl border px-5 py-3"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold">Payment & agreement ledger</h2>
            <p className="text-xs text-slate-500">
              Most recent 500 records · {visible.length} shown
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              aria-label="Search Flex Pay"
              className={input + " max-w-xs md:w-64"}
              placeholder="Officer, site or reference"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filter Flex Pay status"
              className={input + " max-w-xs md:w-48"}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                "ALL",
                "OFFERED",
                "ACCEPTED",
                "PAID",
                "RECONCILED",
                "DECLINED",
                "CANCELLED",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800">
              <tr>
                {[
                  "Officer / site",
                  "Emergency shift",
                  "Agreed payout",
                  "To reconcile",
                  "Status",
                  "",
                ].map((h) => (
                  <th key={h} className="px-5 py-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className={"border-t transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 " + (selected?.id === r.id ? "bg-indigo-50/50 dark:bg-indigo-950/30" : "")}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{person(r.employee)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.shift?.location?.name || "No location"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {stamp(r.shiftStart)}
                    <br />
                    {stamp(r.shiftEnd)}
                  </td>
                  <td className="px-5 py-4 font-semibold">{money(r.amount)}</td>
                  <td className="px-5 py-4">{money(r.balance)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-bold " +
                        badge(r.status)
                      }
                    >
                      {r.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() =>
                        setSelected(selected?.id === r.id ? null : r)
                      }
                      aria-expanded={selected?.id === r.id}
                      className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <p className="p-6 text-slate-500">Loading agreements…</p>}
        {!loading && !visible.length && (
          <div className="p-12 text-center text-slate-500">
            <Zap className="mx-auto mb-3" size={30} />
            <p>No Flex Pay agreements match this view.</p>
          </div>
        )}
      </section>
      {selected && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                Agreement & reconciliation
              </p>
              <h2 className="mt-2 text-xl font-bold">
                {person(selected.employee)} · {money(selected.amount)}
              </h2>
              <p className="mt-2 text-sm text-slate-500">{selected.reason}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-slate-500"
            >
              Close details
            </button>
          </div>
          <div className="grid gap-4 text-sm md:grid-cols-3">
            {[
              ["Offered", stamp(selected.createdAt)],
              ["Accepted", stamp(selected.acceptedAt)],
              ["Paid externally", stamp(selected.paidAt)],
              [
                "Payment method",
                selected.paymentMethod?.replaceAll("_", " ") || "Not recorded",
              ],
              [
                "Transaction reference",
                selected.paymentReference || "Not recorded",
              ],
              ["Awaiting payroll offset", money(selected.balance)],
            ].map(([k, v]) => (
              <div
                key={k}
                className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"
              >
                <p className="text-xs text-slate-500">{k}</p>
                <p className="mt-2 break-all font-semibold">{v}</p>
              </div>
            ))}
          </div>
          {selected.employeeId === selfId && selected.status === "OFFERED" && (
            <div className="rounded-xl bg-indigo-50 p-5 dark:bg-indigo-950">
              <p className="text-sm leading-6">
                By accepting, I agree to cover this emergency assignment and
                receive {money(selected.amount)} after completion and approved
                attendance. The payment is an advance credited against net
                regular payroll, while these earnings remain in gross wages.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  disabled={busy}
                  onClick={() =>
                    action("/flex-pay/" + selected.id + "/respond", {
                      decision: "ACCEPT",
                    })
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
                >
                  Accept terms
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    action("/flex-pay/" + selected.id + "/respond", {
                      decision: "DECLINE",
                    })
                  }
                  className="rounded-xl border px-5 py-3"
                >
                  Decline
                </button>
              </div>
            </div>
          )}
          {manage && (
            <div className="flex flex-wrap gap-3">
              {selected.status === "ACCEPTED" && (
                <button
                  disabled={busy}
                  onClick={() => record(selected)}
                  className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white"
                >
                  Record external payment
                </button>
              )}
              {["OFFERED", "ACCEPTED"].includes(selected.status) && (
                <button
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt(
                      "Reason for cancelling this unpaid offer (at least 5 characters)",
                    );
                    if (reason)
                      void action("/flex-pay/" + selected.id + "/cancel", {
                        reason,
                      });
                  }}
                  className="rounded-xl border px-5 py-3"
                >
                  Cancel unpaid offer
                </button>
              )}
            </div>
          )}
          <h3 className="font-bold">Payroll offset history</h3>
          {selected.reconciliations?.length ? (
            selected.reconciliations.map((x: any) => (
              <div
                key={x.id}
                className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800"
              >
                <span>
                  Payroll {x.payroll.id.slice(0, 8)} · {day(x.payroll.payDate)}{" "}
                  · {x.payroll.status}
                </span>
                <strong>{money(x.amount)} deducted from net pay</strong>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No finalized payroll offsets yet. Recording a payment does not
              deduct it until regular payroll is finalized.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
