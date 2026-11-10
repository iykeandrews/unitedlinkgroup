"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileCheck2, FileText, Mail, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "../../../../components/Modal";
import { useBusiness } from "../../../../context/business-context";
import api from "../../../../lib/api";

const titles = { APPOINTMENT: "Letter of Appointment", ACCEPTANCE: "Letter of Acceptance" } as const;
type Kind = keyof typeof titles;
type Employee = { id: string; firstName: string; middleName?: string; lastName: string; email?: string };
const fullName = (employee: Employee) => [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ");
const initial = { employeeId: "", employeeName: "", position: "", hourlyRate: "", letterDate: "", startDate: "", signatory: "", notes: "" };
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const secondary = "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold dark:border-slate-700 disabled:opacity-50";
const primary = "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";

async function errorMessage(error: any, fallback: string) {
  let data = error?.response?.data;
  if (data instanceof Blob) {
    try { data = JSON.parse(await data.text()); } catch { return fallback; }
  }
  return Array.isArray(data?.message) ? data.message.join(". ") : data?.message || fallback;
}

export default function EmploymentLettersPage() {
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id;
  return <EmploymentLettersEditor key={businessId} businessId={businessId} />;
}

function EmploymentLettersEditor({ businessId }: { businessId?: string }) {
  const [role, setRole] = useState<string>();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [kind, setKind] = useState<Kind>("APPOINTMENT");
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [confirmEmail, setConfirmEmail] = useState(false);
  const actionLock = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const employee = employees.find(({ id }) => id === draft.employeeId);
  const email = employee?.email?.trim();
  const authorized = role === "BUSINESS_ADMIN" || role === "SUPER_ADMIN";

  function changeField(field: Exclude<keyof typeof initial, "employeeId">, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaveStatus("Unsaved changes");
  }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setEmployees([]);
      setDraft(initial);
      setSaveStatus("");
      setConfirmEmail(false);
      setLoadError("");
      try {
        const { data: profile } = await api.get("/auth/profile", { signal: controller.signal });
        if (controller.signal.aborted) return;
        setRole(profile.role);
        if (!["BUSINESS_ADMIN", "SUPER_ADMIN"].includes(profile.role) || (profile.role === "SUPER_ADMIN" && !businessId)) return;
        const { data } = await api.get<Employee[]>("/employees", {
          params: { status: "ACTIVE" },
          headers: businessId ? { "x-business-id": businessId } : undefined,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setEmployees([...data].sort((a, b) => fullName(a).localeCompare(fullName(b))));
        }
      } catch {
        if (!controller.signal.aborted) setLoadError("Unable to load employees. Refresh the page and try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [businessId]);

  async function selectEmployee(employeeId: string) {
    if (actionLock.current) return;
    setSaveStatus("");
    if (!employeeId) {
      setDraft(initial);
      return;
    }
    actionLock.current = true;
    setPending("open");
    try {
      const { data } = await api.post<Omit<typeof initial, "employeeId">>(
        "/employee-forms/letters/draft",
        { employeeId },
        { headers: businessId ? { "x-business-id": businessId } : undefined },
      );
      setDraft({ ...initial, ...data, employeeId });
      setSaveStatus("Draft in this employee’s Employment Forms folder");
    } catch (error) {
      toast.error(await errorMessage(error, "Unable to open the employee’s letter folder."));
    } finally {
      actionLock.current = false;
      setPending("");
    }
  }

  async function run(action: "save" | "download" | "print" | "email") {
    if (actionLock.current || !employee || !form.current?.reportValidity()) return;
    const printTab = action === "print" ? window.open("about:blank", "_blank") : null;
    if (action === "print" && !printTab) {
      toast.error("Allow pop-ups to open the print preview.");
      return;
    }
    if (printTab) printTab.opener = null;
    actionLock.current = true;
    setPending(action);
    const headers = businessId ? { "x-business-id": businessId } : undefined;
    const payload = {
      ...draft,
      type: kind,
      signatory: kind === "APPOINTMENT" ? draft.signatory : undefined,
      hourlyRate: kind === "APPOINTMENT" ? draft.hourlyRate : undefined,
    };
    try {
      if (kind === "APPOINTMENT") {
        await api.patch("/employee-forms/letters/draft", payload, { headers });
        setSaveStatus("Saved to this employee’s Employment Forms folder");
        if (action === "save") {
          toast.success("Appointment letter saved");
          return;
        }
      }
      if (action === "email") {
        const { data } = await api.post("/employee-forms/letters/email", { ...payload, expectedEmail: email }, { headers });
        setConfirmEmail(false);
        toast.success(`Letter emailed to ${data.to}`);
        return;
      }
      const { data } = await api.post<Blob>("/employee-forms/letters/pdf", payload, { headers, responseType: "blob" });
      const url = URL.createObjectURL(data);
      if (printTab && !printTab.closed) {
        printTab.location.replace(url);
      } else if (action === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = kind === "APPOINTMENT" ? "letter-of-appointment.pdf" : "letter-of-acceptance.pdf";
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      printTab?.close();
      toast.error(await errorMessage(error, "Unable to prepare the letter. Please try again."));
    } finally {
      actionLock.current = false;
      setPending("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/dashboard/people/employment-forms" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300"><ArrowLeft size={16} /> Employment Forms</Link>
      <header className="rounded-2xl bg-slate-950 px-6 py-8 text-white sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">People Operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Employment Letters</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Prepare a personalized appointment letter or an acceptance letter for the employee to sign.</p>
      </header>
      {loading ? <p role="status">Loading employees…</p> : loadError ? <p role="alert">{loadError}</p> : !authorized ? (
        <p>Employment letters are available to administrators.</p>
      ) : role === "SUPER_ADMIN" && !businessId ? (
        <p>Select a business to prepare employment letters.</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form ref={form} onSubmit={(event) => { event.preventDefault(); void run("download"); }} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <fieldset disabled={!!pending} className="space-y-5">
              <legend className="mb-4 text-lg font-semibold">Letter details</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(titles) as Kind[]).map((type) => {
                  const Icon = type === "APPOINTMENT" ? FileText : FileCheck2;
                  return <button key={type} type="button" onClick={() => setKind(type)} aria-pressed={kind === type}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-semibold ${kind === type ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200" : "border-slate-200 dark:border-slate-700"}`}>
                    <Icon size={19} />{titles[type]}
                  </button>;
                })}
              </div>
              <label className="block space-y-2 text-sm font-medium">
                <span>Employee</span>
                <select className={field} required value={draft.employeeId} onChange={(event) => void selectEmployee(event.target.value)}>
                  <option value="">{employees.length ? "Select an employee" : "No active employees"}</option>
                  {employees.map((person) => <option value={person.id} key={person.id}>{fullName(person)}{person.email ? ` · ${person.email}` : ""}</option>)}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium"><span>Name on letter</span>
                <input className={field} required pattern=".*\S.*" maxLength={160} value={draft.employeeName} onChange={(event) => changeField("employeeName", event.target.value)} />
              </label>
              <label className="block space-y-2 text-sm font-medium"><span>Position</span>
                <input className={field} required pattern=".*\S.*" maxLength={120} value={draft.position} onChange={(event) => changeField("position", event.target.value)} placeholder="e.g. Security Officer" />
              </label>
              {kind === "APPOINTMENT" && <label className="block space-y-2 text-sm font-medium"><span>Hourly rate ($)</span>
                <input className={field} required inputMode="decimal" pattern="(?!0+(?:\.0{1,2})?$)[0-9]{1,6}(?:\.[0-9]{1,2})?" value={draft.hourlyRate} onChange={(event) => changeField("hourlyRate", event.target.value)} placeholder="18.50" />
              </label>}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium"><span>Letter date</span>
                  <input className={field} type="date" required value={draft.letterDate} onChange={(event) => changeField("letterDate", event.target.value)} />
                </label>
                <label className="block space-y-2 text-sm font-medium"><span>Effective start date</span>
                  <input className={field} type="date" required value={draft.startDate} onChange={(event) => changeField("startDate", event.target.value)} />
                </label>
              </div>
              {kind === "APPOINTMENT" && <label className="block space-y-2 text-sm font-medium"><span>Company signatory <span className="text-slate-500">(optional)</span></span>
                <input className={field} maxLength={160} value={draft.signatory} onChange={(event) => changeField("signatory", event.target.value)} placeholder="Joseph Osigwe, CEO" />
              </label>}
              <label className="block space-y-2 text-sm font-medium"><span>{kind === "APPOINTMENT" ? "Appointment details" : "Additional remarks"} <span className="text-slate-500">(optional)</span></span>
                <textarea className={field} rows={5} maxLength={1600} value={draft.notes} onChange={(event) => changeField("notes", event.target.value)} />
              </label>
            </fieldset>
            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              {kind === "APPOINTMENT" && <button className={secondary} type="button" onClick={() => void run("save")} disabled={!employee || !!pending}><Save size={17} /> Save to employee folder</button>}
              <button className={secondary} type="submit" disabled={!employee || !!pending}><Download size={17} /> Download PDF</button>
              <button className={secondary} type="button" onClick={() => void run("print")} disabled={!employee || !!pending}><Printer size={17} /> Print</button>
              <button className={primary} type="button" onClick={() => { if (form.current?.reportValidity()) setConfirmEmail(true); }} disabled={!email || !!pending}><Mail size={17} /> Email letter</button>
            </div>
            {pending && <p className="text-sm text-slate-500" role="status">{{ open: "Opening employee folder…", save: "Saving appointment letter…", email: "Sending the letter…" }[pending] || "Preparing your PDF…"}</p>}
          </form>
          <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold">{titles[kind]}</h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{kind === "APPOINTMENT" ? "Confirms the employee’s role and start date. Includes a line for an authorized company representative to sign." : "Confirms the employee accepts the role. Includes lines for the employee’s signature and the date signed."}</p>
            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee on the letter</p>
              <p className="mt-2 break-words text-sm font-semibold">{employee ? draft.employeeName : "Select an employee"}</p>
              {employee && <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{email || "Add an email address to the employee profile to send the letter."}</p>}
            </div>
            {kind === "APPOINTMENT" && saveStatus && <p className="text-sm text-slate-600 dark:text-slate-300" role="status">{saveStatus}</p>}
            <p className="text-xs leading-5 text-slate-500">Print opens the PDF in your browser, where you can choose the printer.</p>
          </aside>
        </div>
      )}
      <Modal isOpen={confirmEmail} onClose={() => { if (!pending) setConfirmEmail(false); }} title="Email employment letter">
        <p className="text-sm leading-6">Send the {titles[kind]} as a PDF attachment to {employee && fullName(employee)} at <strong className="break-all">{email}</strong>?</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className={secondary} type="button" disabled={!!pending} onClick={() => setConfirmEmail(false)}>Cancel</button>
          <button className={primary} type="button" disabled={!email || !!pending} onClick={() => void run("email")}>{pending ? "Sending…" : "Send email"}</button>
        </div>
      </Modal>
    </div>
  );
}
