"use client";
import { useEffect, useRef, useState } from "react";
import {
  Download,
  RefreshCw,
  Search,
  Clock,
  CalendarCheck,
  AlertTriangle,
  Users,
} from "lucide-react";
import api from "@/lib/api";
import { useBusiness } from "@/context/business-context";
import AmericanDateInput from "@/components/invoices/AmericanDateInput";
import { invoiceDate } from "@/components/invoices/accounting";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
const field =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800";
const day = (offset = 0) =>
  new Date(Date.now() + offset * 86400000).toLocaleDateString("en-CA");
export default function PerformanceReportPage() {
  const { selectedBusiness } = useBusiness();
  const [start, setStart] = useState(day(-30)),
    [end, setEnd] = useState(day()),
    [query, setQuery] = useState("");
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const version = useRef(0);
  useEffect(() => {
    const current = ++version.current;
    setData(null);
    setError("");
    if (!selectedBusiness) {
      setLoading(false);
      return;
    }
    if (!start || !end || end < start) {
      setError(
        "Enter valid start and end dates. End date must be on or after start date.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get("/reports/performance", {
        headers: { "x-business-id": selectedBusiness.id },
        params: { startDate: start, endDate: end },
      })
      .then((r) => {
        if (current === version.current) setData(r.data);
      })
      .catch((e) => {
        if (current === version.current)
          setError(
            e.response?.status === 403
              ? "Your account does not have access to this report."
              : e.response?.data?.message ||
                  "Unable to load performance data. Please retry.",
          );
      })
      .finally(() => {
        if (current === version.current) setLoading(false);
      });
    return () => {
      version.current++;
    };
  }, [selectedBusiness?.id, start, end, refresh]);
  const rows = (data?.rows || []).filter((r: any) =>
    `${r.name} ${r.email}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const totals = data?.totals;
  const exportRows = rows.map((r: any) => [
    r.name,
    r.email,
    r.hours.toFixed(2),
    r.plannedHours.toFixed(2),
    r.onTime,
    r.late,
    r.missed,
    r.upcoming,
    r.punctuality === null ? "—" : `${r.punctuality}%`,
    r.averageLateMinutes,
  ]);
  const columns = [
    "Employee",
    "Email",
    "Recorded hours",
    "Planned hours",
    "On time",
    "Late",
    "Unmatched completed shifts",
    "Upcoming / in progress",
    "On-time rate",
    "Average lateness (minutes)",
  ];
  const csv = () => {
    const cell = (v: any) => {
      const raw = String(v ?? "");
      return (
        '"' +
        (/^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw).replace(/"/g, '""') +
        '"'
      );
    };
    const blob = new Blob(
      [
        "\uFEFF" +
          [
            [selectedBusiness?.name || "Performance report"],
            ["Period", invoiceDate(start), invoiceDate(end)],
            columns,
            ...exportRows,
          ]
            .map((r) => r.map(cell).join(","))
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `performance_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const pdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(17);
    doc.text("Attendance & performance", 14, 18);
    doc.setFontSize(10);
    doc.text(
      `${selectedBusiness?.name} · ${invoiceDate(start)} – ${invoiceDate(end)}`,
      14,
      27,
    );
    doc.text(
      "Descriptive attendance measures. Unmatched shifts require review; they are not confirmed absences.",
      14,
      34,
    );
    autoTable(doc, {
      startY: 42,
      head: [columns],
      body: exportRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 118, 110] },
    });
    doc.save(`performance_${start}_${end}.pdf`);
  };
  if (!selectedBusiness)
    return (
      <p className="p-8 text-slate-500">
        Select a business to view performance reports.
      </p>
    );
  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">
            {selectedBusiness.name} · Workforce reports
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Attendance & performance
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Recorded hours, punctuality, and shifts that need review.
          </p>
        </div>
        <button
          aria-label="Refresh performance report"
          onClick={() => setRefresh((v) => v + 1)}
          disabled={loading}
          className={`${field} flex items-center gap-2`}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>
      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="text-xs font-medium text-slate-500">
          Start date
          <AmericanDateInput
            aria-label="Performance start date"
            className={`${field} mt-1 block`}
            value={start}
            onChange={setStart}
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          End date
          <AmericanDateInput
            aria-label="Performance end date"
            className={`${field} mt-1 block`}
            min={start}
            value={end}
            onChange={setEnd}
          />
        </label>
        <button
          className={`${field} flex items-center gap-2`}
          disabled={!rows.length || loading || !!error}
          onClick={csv}
        >
          <Download size={16} />
          Export CSV
        </button>
        <button
          className={field}
          disabled={!rows.length || loading || !!error}
          onClick={pdf}
        >
          Download PDF
        </button>
      </section>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </div>
      )}
      {loading ? (
        <p role="status" className="p-8 text-slate-500">
          Loading performance report…
        </p>
      ) : (
        data && (
          <>
            <section
              aria-label="Performance summary"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {[
                [Clock, "Recorded hours", `${totals.hours.toFixed(2)}h`],
                [
                  CalendarCheck,
                  "On-time rate",
                  totals.punctuality === null ? "—" : `${totals.punctuality}%`,
                ],
                [AlertTriangle, "Shifts to review", totals.missed],
                [Users, "Open timesheets", totals.openTimesheets],
              ].map(([Icon, label, value]: any) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex justify-between text-sm text-slate-500">
                    {label}
                    <Icon size={18} />
                  </div>
                  <p className="mt-3 text-3xl font-semibold">{value}</p>
                </div>
              ))}
            </section>
            <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Five-minute on-time grace period. Each time record matches one
              shift. Future and in-progress shifts are not marked absent.
              Recorded hours exclude unpaid breaks; open timesheets have no
              final hours. Unmatched shifts need review before drawing
              conclusions about attendance. Payroll uses approved records.
            </p>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b p-4 dark:border-slate-700">
                <Search size={17} />
                <input
                  aria-label="Search performance employees"
                  placeholder="Search employee name or email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800">
                    <tr>
                      {[
                        "Employee",
                        "Recorded hours",
                        "Planned hours",
                        "On time",
                        "Late",
                        "Shifts to review",
                        "Upcoming",
                        "On-time rate",
                      ].map((v) => (
                        <th key={v} className="whitespace-nowrap p-4">
                          {v}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? (
                      rows.map((r: any) => (
                        <tr
                          key={r.employeeId}
                          className="border-t dark:border-slate-700"
                        >
                          <td className="p-4">
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-slate-500">{r.email}</p>
                          </td>
                          {[
                            `${r.hours.toFixed(2)}h`,
                            `${r.plannedHours.toFixed(2)}h`,
                            r.onTime,
                            r.late,
                            r.missed,
                            r.upcoming,
                            r.punctuality === null ? "—" : `${r.punctuality}%`,
                          ].map((v, i) => (
                            <td key={i} className="whitespace-nowrap p-4">
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-10 text-center text-slate-500"
                        >
                          No matching attendance or published shifts in this
                          period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="border-t p-4 text-xs text-slate-500 dark:border-slate-700">
                {rows.length} employees · Summary cards cover the complete date
                range. Exports follow the search.
              </p>
            </section>
          </>
        )
      )}
    </main>
  );
}
