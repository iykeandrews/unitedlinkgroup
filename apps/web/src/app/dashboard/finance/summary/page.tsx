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
    Record<string, { amount: string; scheduledHours: string; approvedHours: string; reason: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<any>(null),
    [loading, setLoading] = useState(false),
    [downloading, setDownloading] = useState(false),
    [error, setError] = useState("");
  const version = useRef(0);
  const admin = ["BUSINESS_ADMIN", "SUPER_ADMIN"].includes(user?.role || "");
  const field =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white";
  const params = { from, to, basis, extraRate, extraCap };
  const valid =
    !!from && !!to && from <= to && from.slice(0, 4) === to.slice(0, 4);
  const key = JSON.stringify({ business: selectedBusiness?.id, ...params }),
    [loadedKey, setLoadedKey] = useState("");
  const current = !!report && loadedKey === key;
  useEffect(() => {
    version.current++;
    setReport(null);
    setManualDraft({});
    setLoadedKey("");
    setError("");
    setLoading(false);
  }, [selectedBusiness?.id]);
  useEffect(() => {
    setManualDraft({});
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
      setManualDraft(Object.fromEntries(Object.entries(response.data.savedOverrides || {}).map(([id,v]:[string,any])=>[id,{amount:v.amount?.toString() ?? "",scheduledHours:v.scheduledHours?.toString() ?? "",approvedHours:v.approvedHours?.toString() ?? "",reason:v.reason || ""}])));
      setLoadedKey(key);
    } catch (e) {
      if (request === version.current) setError(message(e));
    } finally {
      if (request === version.current) setLoading(false);
    }
  };
  const download = async (format: "pdf" | "xlsx" = "pdf") => {
    if (!current || downloading) return;
    setDownloading(true);
    try {
      const response = await api.get("/reports/finance-summary", {
        params: { ...params, format },
        headers: { "x-business-id": selectedBusiness?.id || "" },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data),
        a = document.createElement("a");
      a.href = url;
      a.download = "revenue-payroll-summary-" + from + "-" + to + "." + format;
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
  const table = (heads: string[], rows: any[][], totals?: any[]) => (
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
        {totals && (
          <tfoot>
            <tr className="border-t-2 bg-slate-100 font-bold dark:bg-slate-800">
              {totals.map((value, i) => (
                <td key={i} className="px-4 py-3">
                  {value}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
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
            onClick={() => download("pdf")}
            disabled={!current || downloading || loading}
            className="inline-flex gap-2 items-center border rounded-lg px-5 py-2.5 disabled:opacity-50"
          >
            <Download size={17} />
            {downloading ? "Creating file…" : "Download PDF"}
          </button>
          <button onClick={() => download("xlsx")} disabled={!current || downloading || loading} className="inline-flex gap-2 items-center border rounded-lg px-5 py-2.5 disabled:opacity-50"><Download size={17} />Download Excel</button>
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
          <h2 className="font-bold">Saved location adjustments</h2>
          <p className="text-sm text-slate-500 mt-2">Invoice revenue, scheduled hours and approved hours are saved for this exact reporting period and date basis. Leave a field blank to use calculated values. These adjustments affect the summary and downloads only; employee attendance, wages and invoices remain unchanged.</p>
          {report.savedAt && <p className="text-xs text-slate-500 mt-2">Last saved: {new Date(report.savedAt).toLocaleString("en-US")}</p>}
          <details className="mt-3">
            <summary className="cursor-pointer font-medium">Edit amounts and hours by location</summary>
            <div className="space-y-4 mt-4">
              {report.availableLocations.map((l:any)=><div key={l.id} className="rounded-lg border p-4">
                <h3 className="font-semibold">{l.name}</h3>
                <div className="grid md:grid-cols-4 gap-3">
                  {[["amount","Invoice revenue ($)"],["scheduledHours","Scheduled hours"],["approvedHours","Approved hours"],["reason","Adjustment reason"]].map(([key,label])=><label key={key} className="text-sm">{label}<input className={field} aria-label={l.name+" "+label} type={key==="reason"?"text":"number"} min="0" step="0.01" maxLength={300} placeholder={key==="reason"?"Reason for adjustment":"Use calculated value"} value={(manualDraft[l.id] as any)?.[key] ?? ""} onChange={e=>setManualDraft({...manualDraft,[l.id]:{...(manualDraft[l.id] || {amount:"",scheduledHours:"",approvedHours:"",reason:""}),[key]:e.target.value}})} /></label>)}
                </div>
              </div>)}
            </div>
            <button className="mt-4 rounded-lg bg-slate-800 text-white px-4 py-2 disabled:opacity-50" disabled={saving || !current} onClick={async()=>{
              const values:any={};
              for(const [id,v] of Object.entries(manualDraft)) {
                const entry:any={};
                for(const key of ["amount","scheduledHours","approvedHours"] as const) {
                  if(v[key]==="")continue;
                  if(!Number.isFinite(Number(v[key])) || Number(v[key])<0){toast.error("Enter non-negative amounts and hours.");return;}
                  entry[key]=Number(v[key]);
                }
                if(!Object.keys(entry).length)continue;
                if(!v.reason.trim()){toast.error("Add a reason for each adjustment.");return;}
                values[id]={...entry,reason:v.reason.trim()};
              }
              const request = version.current;
              setSaving(true);
              try {
                const response=await api.put("/reports/finance-summary/overrides",{...params,manualAmounts:JSON.stringify(values)},{headers:{"x-business-id":selectedBusiness?.id || ""}});
                if(request !== version.current) return;
                setReport(response.data); toast.success("Amounts and hours saved for this period.");
              } catch(e){toast.error(message(e));}finally{setSaving(false);}
            }}>{saving?"Saving…":"Save amounts and hours"}</button>
          </details>
        </section>
      )}
      {current && (
        <>
          <section className="rounded-xl border border-teal-200 bg-teal-50 p-5 text-teal-950 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100">
            <h2 className="font-bold">Total employer cost — estimate</h2>
            <p className="text-3xl font-bold mt-2">
              {report.totals.incompleteGross
                ? "Incomplete — review wages"
                : cash(report.totals.employerCost)}
            </p>
            <p className="text-sm mt-2">
              Officer’s wages {cash(report.totals.grossPay)} + estimated
              employer taxes {cash(report.totals.employerTaxes)}
            </p>
          </section>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Revenue before sales tax", cash(report.totals.revenue)],
              ["Officer’s wages", cash(report.totals.grossPay)],
              ["Employer taxes — estimate", cash(report.totals.employerTaxes)],
              [
                "Estimated Net Income",
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
                "Officer’s wages",
                "Net",
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
                  "Profile rate",
                  "Approved hours",
                  "Actual hours",
                  "Officer’s wages",
                  "Deductions",
                ],
                report.workers
                  .filter((w: any) => w.workerType === type)
                  .map((w: any) => [
                    w.name,
                    w.profileRate == null ? "Review" : cash(w.profileRate),
                    w.hours.toFixed(2),
                    w.actualHours == null ? "Review" : w.actualHours.toFixed(2),
                    w.missing ? "Review" : cash(w.gross),
                    cash(w.deductions),
                  ]),
                (() => {
                  const g = report.workerTotals.find(
                    (g: any) => g.workerType === type,
                  );
                  return [
                    type === "W2" ? "W-2 TOTAL" : "1099 TOTAL",
                    "",
                    g.approvedHours.toFixed(2),
                    g.actualHours === null
                      ? "Review"
                      : g.actualHours.toFixed(2),
                    g.incompleteGross ? "Review" : cash(g.grossPay),
                    cash(g.deductions),
                  ];
                })(),
              )}
            </section>
          ))}
          <section className="rounded-xl border dark:border-slate-700 overflow-hidden">
            <h2 className="font-bold p-5">All workers — combined totals</h2>
            {table(
              ["Actual hours", "Scheduled hours", "Officer’s wages"],
              [
                [
                  report.totals.actualHours === null
                    ? "Review"
                    : report.totals.actualHours.toFixed(2),
                  report.totals.scheduledHours.toFixed(2),
                  report.totals.incompleteGross
                    ? "Review"
                    : cash(report.totals.grossPay),
                ],
              ],
            )}
            <p className="p-5 text-sm text-slate-500">
              Actual hours combine W-2 and 1099 earnings converted at each
              worker’s profile rate. Scheduled hours come from the calendar for
              this period.
            </p>
          </section>
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
              Deductions: {cash(report.totals.deductions)}. Scheduled
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
