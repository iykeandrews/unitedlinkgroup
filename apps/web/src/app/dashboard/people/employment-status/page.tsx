"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, History, Search, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Modal } from "@/components/Modal";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/context/auth-context";
import { useBusiness } from "@/context/business-context";
import api from "@/lib/api";

const statuses = {
  ACTIVE: "Active",
  ONBOARDING: "Onboarding",
  ON_LEAVE: "On leave",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
  RESIGNED: "Resigned",
  TERMINATED: "Terminated",
};
const choices = ["ACTIVE", "ON_LEAVE", "INACTIVE", "RESIGNED", "TERMINATED"] as const;
type Status = keyof typeof statuses;
type Employee = { id: string; firstName: string; lastName: string; middleName?: string; email: string; status: Status; effectiveDate: string | null };
type Trend = { month: string; active: number; resigned: number; terminated: number };
type Entry = { id: string; kind: Status; fromStatus: Status; effectiveDate: string; notes: string; recordedBy: string; recordedAt: string };
const field = "min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950";
const name = (employee: Employee) => [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ");
const label = (status: Status) => statuses[status] || status;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const displayDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return month + "/" + day + "/" + year;
};

function StatusBadge({ status }: { status: Status }) {
  const color = status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    : status === "TERMINATED" || status === "RESIGNED"
      ? "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
      : status === "ON_LEAVE" || status === "ONBOARDING"
        ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{label(status)}</span>;
}

const monthLabel = (month: string) => new Date(month + "-01T00:00:00Z").toLocaleDateString("en-US", {
  month: "short", year: "2-digit", timeZone: "UTC",
});

function EmploymentTrends({ trends, error }: { trends: Trend[]; error: string }) {
  return (
    <section aria-labelledby="employment-trends" className="space-y-3">
      <h2 id="employment-trends" className="text-lg font-semibold">Monthly workforce trends</h2>
      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : !trends.length ? (
        <p className="text-sm text-slate-500">Loading monthly trends…</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-semibold">Active employees</h3>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Month-end headcount. This month shows the latest count.</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ left: 0, right: 14, top: 8 }}>
                    <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.3} />
                    <XAxis dataKey="month" tickFormatter={monthLabel} minTickGap={12} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} width={34} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={monthLabel} contentStyle={{ color: "#0f172a" }} />
                    <Line dataKey="active" name="Active employees" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-semibold">Resignations and terminations</h3>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Employees with recorded changes, grouped by effective month.</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends} margin={{ left: 0, right: 14, top: 8 }}>
                    <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.3} />
                    <XAxis dataKey="month" tickFormatter={monthLabel} minTickGap={12} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} width={34} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={monthLabel} contentStyle={{ color: "#0f172a" }} />
                    <Legend />
                    <Bar dataKey="resigned" name="Resigned" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="terminated" name="Terminated" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Historical headcount is estimated from hire dates and available status history.</p>
        </>
      )}
    </section>
  );
}

export default function EmploymentStatusPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading employment records…</p>}>
      <EmploymentStatusContent />
    </Suspense>
  );
}

function EmploymentStatusContent() {
  const employeeId = useSearchParams().get("employeeId") || "";
  const { user } = useAuth();
  const { selectedBusiness, isLoading } = useBusiness();

  if (isLoading || !user) return <p>Loading employment records…</p>;
  if (!["BUSINESS_ADMIN", "SUPER_ADMIN"].includes(String(user.role))) {
    return <p>Employment status records are available to administrators.</p>;
  }
  if (!selectedBusiness?.id) return <p>Select a business to view employment records.</p>;

  return <EmploymentDirectory key={selectedBusiness.id + "/" + employeeId} businessId={selectedBusiness.id} initialEmployeeId={employeeId} />;
}

function EmploymentDirectory({ businessId, initialEmployeeId }: { businessId: string; initialEmployeeId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState(initialEmployeeId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [summary, setSummary] = useState<{ label: string; filter: string } | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [trendError, setTrendError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get<Employee[]>("/employees/employment-status", {
      headers: { "x-business-id": businessId }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setEmployees(data);
      setError("");
    }).catch(() => {
      if (!controller.signal.aborted) setError("Could not load employment records. Refresh the page to try again.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [businessId, revision]);

  useEffect(() => {
    const controller = new AbortController();
    api.get<Trend[]>("/employees/employment-status/trends", {
      headers: { "x-business-id": businessId }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setTrends(data);
      setTrendError("");
    }).catch(() => {
      if (!controller.signal.aborted) setTrendError("Could not load monthly trends.");
    });
    return () => controller.abort();
  }, [businessId, revision]);

  const employee = employees.find((row) => row.id === selected);
  const query = search.trim().toLowerCase();
  const visible = employees.filter((row) =>
    (!filter || row.status === filter) && (name(row) + " " + row.email).toLowerCase().includes(query)
  );

  const counts = [
    { label: "Total employees", count: employees.length, filter: "" },
    { label: "Active", count: employees.filter((row) => row.status === "ACTIVE").length, filter: "ACTIVE" },
    { label: "Resigned", count: employees.filter((row) => row.status === "RESIGNED").length, filter: "RESIGNED" },
    { label: "Terminated", count: employees.filter((row) => row.status === "TERMINATED").length, filter: "TERMINATED" },
  ];

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <Link href="/dashboard/people" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300">
          <ArrowLeft size={15} aria-hidden="true" /> Employees
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Employment Status</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review workforce status and record employment changes.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((item) => (
          <button key={item.label} type="button" aria-haspopup="dialog" onClick={() => setSummary(item)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums">{loading || error ? "—" : item.count}</span>
          </button>
        ))}
      </div>
      <EmploymentTrends trends={trends} error={trendError} />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Employment directory">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div>
            <h2 className="font-semibold">Employee directory</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{visible.length} of {employees.length} employees</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-slate-500" />
              <input className={field + " w-full pl-9 sm:w-64"} type="search" aria-label="Search by name or email" placeholder="Search by name or email" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select className={field} aria-label="Filter by employment status" value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(statuses).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
            </select>
          </div>
        </div>
        {error && <p role="alert" className="px-5 pb-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {!loading && !error && selected && !employee && <p role="alert" className="px-5 pb-4 text-sm">This employee is unavailable in the selected business.</p>}
        {loading ? <p className="p-6 text-sm text-slate-500">Loading employees…</p> : visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                <tr>{["Employee", "Current status", "Effective date", "Record"].map((title) => <th key={title} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <th scope="row" className="px-4 py-3.5 font-semibold">
                      {name(row)}
                      {row.email && <span className="mt-0.5 block break-all text-xs font-normal text-slate-500 dark:text-slate-400">{row.email}</span>}
                    </th>
                    <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums">{row.effectiveDate ? displayDate(row.effectiveDate) : "—"}</td>
                    <td className="px-4 py-3.5">
                      <button type="button" aria-haspopup="dialog" onClick={() => setSelected(row.id)} className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-indigo-700 hover:underline dark:text-indigo-300" aria-label={"View employment record for " + name(row)}>
                        View record <ChevronRight size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !error && (
          <div className="flex items-center justify-center gap-2 border-t border-slate-200 px-5 py-10 text-sm text-slate-500 dark:border-slate-800">
            <Users size={18} aria-hidden="true" /> No employees match this view.
          </div>
        )}
      </section>
      {summary && (
        <Modal isOpen onClose={() => setSummary(null)} title={summary.label} maxWidth="max-w-2xl">
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {employees.filter((row) => !summary.filter || row.status === summary.filter).map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => { setSummary(null); setSelected(row.id); }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                  <span className="font-semibold">{name(row)}</span>
                  <StatusBadge status={row.status} />
                </button>
              </li>
            ))}
          </ul>
          {loading && <p className="text-sm text-slate-500">Loading employees…</p>}
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          {!loading && !error && !employees.some((row) => !summary.filter || row.status === summary.filter) && (
            <p className="text-sm text-slate-500">No employees in this group.</p>
          )}
        </Modal>
      )}
      {employee && (
        <Modal isOpen onClose={() => setSelected("")} title="Employment record" maxWidth="max-w-4xl">
          <EmploymentRecord key={employee.id} employee={employee} businessId={businessId} revision={revision} onSaved={() => setRevision((value) => value + 1)} />
        </Modal>
      )}
    </div>
  );
}

function EmploymentRecord({ employee, businessId, revision, onSaved }: {
  employee: Employee; businessId: string; revision: number; onSaved: () => void;
}) {
  const [history, setHistory] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const endpoint = "/employees/" + employee.id + "/employment-status";

  useEffect(() => {
    const controller = new AbortController();
    api.get<Entry[]>(endpoint, { headers: { "x-business-id": businessId }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setHistory(data);
          setHistoryError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryError("Could not load this employee’s status history.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId, endpoint, revision]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      await api.post(endpoint, { kind, effectiveDate, notes }, { headers: { "x-business-id": businessId } });
      setNotes("");
      setKind("");
      setSaved(true);
      onSaved();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSaveError(message || "Could not save the status change.");
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  return (
    <section aria-label={"Employment record for " + name(employee)}>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{name(employee)}</h2>
          {employee.email && <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">{employee.email}</p>}
        </div>
        <div className="text-sm">
          <StatusBadge status={employee.status} />
          {employee.effectiveDate && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Effective {displayDate(employee.effectiveDate)}</p>}
        </div>
      </header>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form onSubmit={save} className="space-y-3">
          <h3 className="font-semibold">Record a status change</h3>
          <p className="text-sm text-slate-500">Saving applies the new status immediately. Use the effective date to document when the change took effect.</p>
          <fieldset disabled={saving} className="grid gap-3">
            <label className="grid gap-1 text-sm">New status
              <select className={field} required value={kind} onChange={(event) => setKind(event.target.value)}>
                <option value="">Choose a status</option>
                {choices.filter((value) => value !== "ACTIVE" || employee.status !== "ONBOARDING").map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">Effective date
              <input className={field} required type="date" max={today()} value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm">Notes (optional)
              <textarea className={field} maxLength={2000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <button className="justify-self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" type="submit">{saving ? "Saving…" : "Save status"}</button>
          </fieldset>
          {saveError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
          {saved && <p role="status" className="text-sm text-green-700 dark:text-green-300">Status change saved.</p>}
        </form>
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><History size={17} aria-hidden="true" /> Status history</h3>
          {historyError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{historyError}</p>}
          {loading ? <p className="text-sm">Loading status history…</p> : history.length ? (
            <ol className="space-y-3">
              {history.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={entry.kind} />
                    <span className="font-medium tabular-nums">Effective {displayDate(entry.effectiveDate)}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">Recorded by {entry.recordedBy} on {new Date(entry.recordedAt).toLocaleDateString("en-US", { timeZone: "America/New_York" })}</p>
                  {entry.notes && <p className="mt-2 whitespace-pre-wrap break-words">{entry.notes}</p>}
                </li>
              ))}
            </ol>
          ) : !historyError && <p className="text-sm text-slate-500">No status changes have been recorded.</p>}
        </div>
      </div>
    </section>
  );
}
