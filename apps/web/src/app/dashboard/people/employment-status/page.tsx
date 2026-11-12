"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
type Entry = { id: string; kind: Status; fromStatus: Status; effectiveDate: string; notes: string; recordedBy: string; recordedAt: string };
const field = "rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950";
const panel = "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";
const name = (employee: Employee) => [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ");
const label = (status: Status) => statuses[status] || status;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const displayDate = (value: string) => {
  const [year, month, day] = value.split("-");
  return month + "/" + day + "/" + year;
};

export default function EmploymentStatusPage() {
  const { user } = useAuth();
  const { selectedBusiness, isLoading } = useBusiness();

  if (isLoading || !user) return <p>Loading employment records…</p>;
  if (!["BUSINESS_ADMIN", "SUPER_ADMIN"].includes(String(user.role))) {
    return <p>Employment status records are available to administrators.</p>;
  }
  if (!selectedBusiness?.id) return <p>Select a business to view employment records.</p>;

  return <EmploymentDirectory key={selectedBusiness.id} businessId={selectedBusiness.id} />;
}

function EmploymentDirectory({ businessId }: { businessId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
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

  const employee = employees.find((row) => row.id === selected);
  const query = search.trim().toLowerCase();
  const visible = employees.filter((row) =>
    (!filter || row.status === filter) && (name(row) + " " + row.email).toLowerCase().includes(query)
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="space-y-2">
        <Link href="/dashboard/people" className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Back to People</Link>
        <h1 className="text-2xl font-semibold">Employment Status</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">View the full team, record separations, and review each employee’s status history.</p>
      </header>
      <section className={panel} aria-label="Employment directory">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input className={field} type="search" aria-label="Search employees" placeholder="Search employees" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className={field} aria-label="Filter by employment status" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(statuses).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
          </select>
          <span className="text-sm text-slate-500">{visible.length} of {employees.length} employees</span>
        </div>
        {error && <p role="alert" className="mb-4 text-red-600 dark:text-red-400">{error}</p>}
        {loading ? <p>Loading employees…</p> : visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>{["Employee", "Status", "Effective date", "Record"].map((title) => <th key={title} scope="col" className="px-3 py-2">{title}</th>)}</tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <th scope="row" className="px-3 py-2 font-medium">{name(row)}</th>
                    <td className="px-3 py-2">{label(row.status)}</td>
                    <td className="px-3 py-2">{row.effectiveDate ? displayDate(row.effectiveDate) : "—"}</td>
                    <td className="px-3 py-2"><a href="#employment-record" onClick={() => setSelected(row.id)} className="font-semibold text-indigo-600 dark:text-indigo-300" aria-label={"Open employment record for " + name(row)}>Open record</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>No employees match this view.</p>}
      </section>
      {employee && <EmploymentRecord key={employee.id} employee={employee} businessId={businessId} revision={revision} onSaved={() => setRevision((value) => value + 1)} />}
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
    <section id="employment-record" className={panel} aria-label={"Employment record for " + name(employee)}>
      <h2 className="text-lg font-semibold">{name(employee)}</h2>
      <p className="text-sm text-slate-500">Current status · {label(employee.status)}</p>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
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
          <h3 className="mb-3 font-semibold">Status history</h3>
          {historyError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{historyError}</p>}
          {loading ? <p className="text-sm">Loading status history…</p> : history.length ? (
            <ol className="space-y-3">
              {history.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <p className="font-semibold">{label(entry.kind)} · {displayDate(entry.effectiveDate)}</p>
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
