"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { useBusiness } from "@/context/business-context";
import { useAuth } from "@/context/auth-context";
import ServiceDatePicker from "@/components/invoices/ServiceDatePicker";
import { formatCurrency } from "@/lib/localization";

export default function FinanceSummaryPage() {
  const { selectedBusiness } = useBusiness(),
    { user } = useAuth();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  const [from, setFrom] = useState(today.slice(0, 8) + "01"),
    [to, setTo] = useState(today),
    [basis, setBasis] = useState("SERVICE");
  const [extraRate, setExtraRate] = useState("0"),
    [extraCap, setExtraCap] = useState("9000");
  const [manualDraft, setManualDraft] = useState<
    Record<string, { amount: string; reason: string }>
  >({});
  const [manualAmounts, setManualAmounts] = useState("{}");
  const [report, setReport] = useState<any>(null),
    [loading, setLoading] = useState(false),
    [downloading, setDownloading] = useState(false),
    [error, setError] = useState("");
  const version = useRef(0);
  const admin = ["BUSINESS_ADMIN", "SUPER_ADMIN"].includes(user?.role || "");
  const field =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white";
  const params = { from, to, basis, extraRate, extraCap, manualAmounts };
  const valid =
    !!from && !!to && from <= to && from.slice(0, 4) === to.slice(0, 4);
  const key = JSON.stringify({ business: selectedBusiness?.id, ...params }),
    [loadedKey, setLoadedKey] = useState("");
  const current = !!report && loadedKey === key;
  useEffect(() => {
    version.current++;
    setReport(null);
    setManualDraft({});
    setManualAmounts("{}");
    setLoadedKey("");
    setError("");
    setLoading(false);
  }, [selectedBusiness?.id]);
  useEffect(() => {
    setManualDraft({});
    setManualAmounts("{}");
  }, [from, to, basis]);
  const message = (e: any) => {
    const m =
      e?.response?.data?.message || e?.message || "Unable to load the summary.";
    return Array.isArray(m) ? m.join(", ") : m;
  };
  const load = async () => {
    if (!valid) {
      toast.error("Select a valid period within one calendar year.");
      return;
    }
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/reports/finance-summary", {
        params,
        headers: { "x-business-id": selectedBusiness?.id || "" },
      });
      if (request !== version.current) return;
      setReport(response.data);
      setLoadedKey(key);
    } catch (e) {
      if (request === version.current) setError(message(e));
    } finally {
      if (request === version.current) setLoading(false);
    }
  };
  const download = async () => {
    if (!current || downloading) return;
    setDownloading(true);
    try {
      const response = await api.get("/reports/finance-summary", {
        params: { ...params, format: "pdf" },
        headers: { "x-business-id": selectedBusiness?.id || "" },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data),
        a = document.createElement("a");
      a.href = url;
      a.download = "revenue-payroll-summary-" + from + "-" + to + ".pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      if (e.response?.data instanceof Blob) {
        try {
          toast.error(JSON.parse(await e.response.data.text()).message);
          return;
        } catch {}
      }
      toast.error(message(e));
    } finally {
      setDownloading(false);
    }
  };
  const cash = (n: number) =>
    formatCurrency(
      n,
      report?.business?.currency || selectedBusiness?.currencyCode || "USD",
    );
  const table = (heads: string[], rows: any[][]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-800">
            {heads.map((h) => (
              <th key={h} className="text-left px-4 py-3 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={i} className="border-t dark:border-slate-700">
                {row.map((cell, n) => (
                  <td key={n} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={heads.length} className="p-5 text-slate-500">
                No records in this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
  if (!admin)
    return (
      <p className="p-8">
        This financial report is available to business administrators.
      </p>
    );
  if (!selectedBusiness)
    return <p className="p-8">Select a business to view the report.</p>;
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-screen-2xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Revenue &amp; Payroll Summary</h1>
        <p className="mt-2 text-slate-500">
          Sent invoices, approved worker hours and pay, deductions, and
          estimated employer taxes for your selected period.
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="text-sm">
            Period from
            <ServiceDatePicker
              label="Summary period from"
              className={field}
              value={from}
              onChange={setFrom}
            />
          </label>
          <label className="text-sm">
            Period to
            <ServiceDatePicker
              label="Summary period to"
              className={field}
              value={to}
              onChange={setTo}
            />
          </label>
          <label className="text-sm">
            Invoice revenue basis
            <select
              className={field}
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
            >
              <option value="SERVICE">
                Service period (matches statement)
              </option>
              <option value="SENT">First invoice email date</option>
            </select>
          </label>
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            Employer-tax assumptions
          </summary>
          <p className="text-sm text-slate-500 my-3">
            Federal estimate: employer Social Security 6.2%, Medicare 1.45%, and
            FUTA 0.6% assuming full credit, with annual wage caps. No employer
            payroll taxes are estimated for 1099 contractors. Prior approved
            wages in this app are used for cap estimates.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm">
              Optional additional employer tax (%)
              <input
                className={field}
                type="number"
                min="0"
                max="20"
                step="0.01"
                value={extraRate}
                onChange={(e) => setExtraRate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Annual wage base for optional tax (0 = uncapped)
              <input
                className={field}
                type="number"
                min="0"
                max="1000000"
                value={extraCap}
                onChange={(e) => setExtraCap(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            State unemployment, paid leave and other local charges vary by
            employer. Enter an agreed assumption here if needed. This estimate
            does not change payroll settings.{" "}
            <a
              className="underline"
              target="_blank"
              rel="noreferrer"
              href="https://www.irs.gov/publications/p15"
            >
              IRS employer tax guide
            </a>
          </p>
        </details>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={load}
            disabled={loading || !valid}
            className="inline-flex gap-2 items-center bg-teal-700 text-white rounded-lg px-5 py-2.5 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            {loading ? "Preparing…" : "Prepare summary"}
          </button>
          <button
            onClick={download}
            disabled={!current || downloading || loading}
            className="inline-flex gap-2 items-center border rounded-lg px-5 py-2.5 disabled:opacity-50"
          >
            <Download size={17} />
            {downloading ? "Creating PDF…" : "Download PDF"}
          </button>
        </div>
        {report && !current && (
          <p className="text-sm text-amber-700">
            Filters changed. Prepare the summary again before downloading.
          </p>
        )}
        {error && (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        )}
      </section>
      {report && (
        <section className="rounded-xl border p-5 dark:border-slate-700">
          <h2 className="font-bold">Manual invoice amounts</h2>
          <p className="text-sm text-slate-500 mt-2">
            Optional: replace a location’s revenue before sales tax for this
            report. Leave blank to use invoices. Add a reason for each
            adjustment. These amounts are included in the PDF and do not edit
            invoices. Recheck them when changing the reporting period.
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer font-medium">
              Enter amounts by location
            </summary>
            <div className="space-y-3 mt-4">
              {report.availableLocations.map((l: any) => (
                <div
                  key={l.id}
                  className="grid md:grid-cols-3 gap-3 items-center"
                >
                  <label htmlFor={"manual-" + l.id}>
                    {l.name}
                    {l.manualInvoiceRequired && (
                      <small className="block text-amber-700">
                        Protos · manual amount required
                      </small>
                    )}
                  </label>
                  <input
                    id={"manual-" + l.id}
                    aria-label={l.name + " manual revenue"}
                    className={field}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={
                      l.manualInvoiceRequired
                        ? "Enter Protos amount"
                        : "Use invoice amount"
                    }
                    value={manualDraft[l.id]?.amount || ""}
                    onChange={(e) =>
                      setManualDraft({
                        ...manualDraft,
                        [l.id]: {
                          amount: e.target.value,
                          reason: manualDraft[l.id]?.reason || "",
                        },
                      })
                    }
                  />
                  <input
                    aria-label={l.name + " adjustment reason"}
                    className={field}
                    maxLength={300}
                    placeholder="Reason for adjustment"
                    value={manualDraft[l.id]?.reason || ""}
                    onChange={(e) =>
                      setManualDraft({
                        ...manualDraft,
                        [l.id]: {
                          amount: manualDraft[l.id]?.amount || "",
                          reason: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <button
              className="mt-4 rounded-lg bg-slate-800 text-white px-4 py-2"
              onClick={() => {
                const values: any = {};
                for (const [id, v] of Object.entries(manualDraft)) {
                  if (v.amount === "") continue;
                  if (
                    !Number.isFinite(Number(v.amount)) ||
                    Number(v.amount) < 0 ||
                    !v.reason.trim()
                  ) {
                    toast.error(
                      "Enter a valid amount and reason for each adjustment.",
                    );
                    return;
                  }
                  values[id] = {
                    amount: Number(v.amount),
                    reason: v.reason.trim(),
                  };
                }
                setManualAmounts(JSON.stringify(values));
                toast.success(
                  "Amounts applied. Select Prepare summary to refresh the report.",
                );
              }}
            >
              Apply amounts
            </button>
          </details>
        </section>
      )}
      {current && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Revenue before sales tax", cash(report.totals.revenue)],
              ["Approved gross pay", cash(report.totals.grossPay)],
              ["Employer taxes — estimate", cash(report.totals.employerTaxes)],
              [
                "Contribution before overhead",
                report.totals.incomplete
                  ? "Incomplete — review data"
                  : cash(report.totals.margin),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border p-5 dark:border-slate-700"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold mt-2">{value}</p>
              </div>
            ))}
          </div>
          {report.warnings.length > 0 && (
            <div
              role="status"
              className="bg-amber-50 text-amber-900 rounded-xl p-5 space-y-2"
            >
              {report.warnings.map((w: string) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}
          <section className="rounded-xl border dark:border-slate-700 overflow-hidden">
            <h2 className="font-bold p-5">Revenue and labor by location</h2>
            {table(
              [
                "Location",
                "Invoices",
                "Scheduled hours",
                "Approved hours",
                "Revenue",
                "Gross pay",
                "Employer tax est.",
                "Contribution",
              ],
              report.locations.map((l: any) => [
                l.name,
                l.invoiceCount,
                l.scheduledHours.toFixed(2),
                l.approvedHours.toFixed(2),
                l.manualInvoiceRequired && !l.manualReason ? (
                  <span className="text-amber-700">Enter manually</span>
                ) : l.manualReason ? (
                  <span>
                    {cash(l.revenue)}
                    <small className="block text-amber-700">
                      Manual · original {cash(l.originalRevenue)}
                    </small>
                  </span>
                ) : (
                  cash(l.revenue)
                ),
                cash(l.gross),
                cash(l.employerTax),
                report.totals.incomplete ? "Review" : cash(l.margin),
              ]),
            )}
          </section>
          {["W2", "CONTRACTOR_1099"].map((type) => (
            <section
              key={type}
              className="rounded-xl border dark:border-slate-700 overflow-hidden"
            >
              <h2 className="font-bold p-5">
                {type === "W2" ? "W-2 employees" : "1099 contractors"}
              </h2>
              {table(
                [
                  "Worker",
                  "Hourly rates",
                  "Approved hours",
                  "OT hours",
                  "Gross pay",
                  "Recorded deductions",
                  "Scheduled / pay period",
                  "Employer tax est.",
                ],
                report.workers
                  .filter((w: any) => w.workerType === type)
                  .map((w: any) => [
                    w.name,
                    w.rates.map(cash).join(" / ") || "Review",
                    w.hours.toFixed(2),
                    w.overtimeHours.toFixed(2),
                    w.missing ? "Review" : cash(w.gross),
                    cash(w.deductions),
                    cash(w.scheduledDeductions),
                    cash(w.employerTax),
                  ]),
              )}
            </section>
          ))}
          <section className="rounded-xl border dark:border-slate-700 overflow-hidden">
            <div className="flex justify-between p-5">
              <h2 className="font-bold">Deductions</h2>
              <Link
                href="/dashboard/finance/deductions"
                className="text-teal-700 underline text-sm"
              >
                Open deductions page
              </Link>
            </div>
            {table(
              ["Worker", "Deduction", "Amount", "Basis"],
              report.deductions.map((d: any) => [
                d.name.toUpperCase(),
                d.type,
                cash(d.amount),
                d.status,
              ]),
            )}
            <p className="p-5 text-sm text-slate-500">
              Recorded deductions: {cash(report.totals.deductions)}. Scheduled
              amounts are per pay period, not additional wage expenses or
              deductions posted by this report.
            </p>
          </section>
          <section className="rounded-xl border dark:border-slate-700 overflow-hidden">
            <h2 className="font-bold p-5">Included invoices</h2>
            {table(
              [
                "Invoice",
                "Location",
                "Service from",
                "Service to",
                "Revenue",
                "Invoice total",
                "Current balance",
              ],
              report.invoices.map((i: any) => [
                i.number,
                i.location,
                i.serviceFrom
                  .split("-")
                  .slice(1)
                  .concat(i.serviceFrom.slice(0, 4))
                  .join("/"),
                i.serviceTo
                  .split("-")
                  .slice(1)
                  .concat(i.serviceTo.slice(0, 4))
                  .join("/"),
                cash(i.revenue),
                cash(i.total),
                cash(i.balance),
              ]),
            )}
          </section>
          <section className="rounded-xl bg-slate-50 dark:bg-slate-800 p-5 text-sm text-slate-500 space-y-2">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">
              Report basis
            </h2>
            {report.notes.map((n: string) => (
              <p key={n}>{n}</p>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
