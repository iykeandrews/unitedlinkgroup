"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/auth-context";
import { useBusiness } from "../../context/business-context";
import api from "../../lib/api";

const field =
  "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 dark:bg-slate-800 dark:text-white dark:border-slate-600";
const button =
  "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700";
const title = (s: string) =>
  s
    ?.replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "—";
const date = (s: string) =>
  s
    ? new Date(s).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not set";
const name = (p: any) => [p?.firstName, p?.lastName].filter(Boolean).join(" ");
const errors = (e: any) =>
  Array.isArray(e?.response?.data?.message)
    ? e.response.data.message.join(", ")
    : e?.response?.data?.message || "Unable to save. Please try again.";
const states = [
  "DRAFT",
  "OPEN",
  "AWAITING_RESPONSE",
  "UNDER_REVIEW",
  "RESOLVED",
  "CLOSED",
];
export default function ConductWorkspace({
  kind,
}: {
  kind: "COMPLAINT" | "QUERY";
}) {
  const { user } = useAuth(),
    { selectedBusiness } = useBusiness();
  const admin = ["SUPER_ADMIN", "BUSINESS_ADMIN", "MANAGER"].includes(
    user?.role || "",
  );
  const [data, setData] = useState<any>({
      items: [],
      total: 0,
      stats: { statuses: {}, overdue: 0 },
    }),
    [options, setOptions] = useState<any>({ employees: [], locations: [] });
  const [selected, setSelected] = useState<any>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [overdue, setOverdue] = useState(false),
    [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false),
    [form, setForm] = useState<any>({
      subject: "EMPLOYEE",
      category: "Professional conduct",
      priority: "MEDIUM",
    }),
    [task, setTask] = useState<any>({ action: "NOTE", visibility: "INTERNAL" });
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const version = useRef(0),
    lock = useRef(false);
  const [portalLink, setPortalLink] = useState(""),
    [verificationReady, setVerificationReady] = useState<boolean | null>(null);
  const scope = useRef(selectedBusiness?.id),
    detailVersion = useRef(0);
  scope.current = selectedBusiness?.id;
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/conduct", {
        params: {
          kind,
          search,
          status,
          overdue: overdue ? "true" : undefined,
          page,
        },
      });
      if (request === version.current) setData(response.data);
    } catch (e: any) {
      if (request === version.current) {
        setData({ items: [], total: 0, stats: { statuses: {}, overdue: 0 } });
        setError(errors(e));
      }
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, [kind, search, status, overdue, page, selectedBusiness?.id]);
  useEffect(() => {
    setSelected(null);
    detailVersion.current++;
    setPortalLink("");
    setVerificationReady(null);
    setCreating(false);
    setPage(1);
  }, [selectedBusiness?.id, kind]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => {
      clearTimeout(timer);
      version.current++;
    };
  }, [load]);
  useEffect(() => {
    let active = true;
    if (admin)
      api
        .get("/conduct/options")
        .then((res) => {
          if (active) setOptions(res.data);
        })
        .catch(() => {
          if (active) setOptions({ employees: [], locations: [] });
        });
    return () => {
      active = false;
    };
  }, [admin, selectedBusiness?.id]);
  const open = async (id: string) => {
    const request = ++detailVersion.current,
      business = scope.current;
    try {
      const res = await api.get(`/conduct/${id}`);
      if (request !== detailVersion.current || business !== scope.current)
        return;
      setSelected(res.data);
      setTask({ action: admin ? "NOTE" : "RESPOND", visibility: "INTERNAL" });
      setCreating(false);
    } catch (e: any) {
      toast.error(errors(e));
    }
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("caseId");
    if (id) void open(id);
    if (kind === "QUERY" && params.get("sourceCaseId")) {
      setCreating(true);
      setForm({
        subject: "EMPLOYEE",
        category: "Professional conduct",
        priority: "MEDIUM",
        sourceCaseId: params.get("sourceCaseId"),
        employeeId: params.get("employeeId") || "",
      });
    }
  }, [selectedBusiness?.id]);
  const run = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const business = scope.current;
    try {
      if (creating) {
        const payload = {
          ...form,
          kind,
          subject: kind === "QUERY" ? "EMPLOYEE" : form.subject,
        };
        for (const key of Object.keys(payload))
          if (payload[key] === "") delete payload[key];
        if (payload.dueAt)
          payload.dueAt = new Date(payload.dueAt).toISOString();
        const res = await api.post("/conduct", payload);
        if (business !== scope.current) return;
        setSelected(res.data);
        setCreating(false);
        toast.success(
          kind === "QUERY"
            ? "Draft saved. Review it before issuing."
            : "Complaint recorded.",
        );
      } else {
        const payload = { ...task, version: selected.version };
        for (const key of ["dueAt", "followUpAt"])
          if (payload[key]) payload[key] = new Date(payload[key]).toISOString();
          else delete payload[key];
        const res = await api.post(`/conduct/${selected.id}/actions`, payload);
        if (business !== scope.current) return;
        setSelected(res.data);
        setTask({ action: admin ? "NOTE" : "RESPOND", visibility: "INTERNAL" });
        toast.success("Case record updated.");
      }
      await load();
    } catch (e: any) {
      toast.error(errors(e));
      if (e?.response?.status === 409 && selected) await open(selected.id);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const shareLink = async () => {
    try {
      const res = await api.post("/conduct/portal-link");
      setPortalLink(res.data.url);
      setVerificationReady(res.data.verificationReady);
      if (navigator.clipboard)
        await navigator.clipboard.writeText(res.data.url);
      toast.success("Complaint link ready to share.");
    } catch (e: any) {
      toast.error(errors(e));
    }
  };
  const input = (
    key: string,
    label: string,
    type = "text",
    source = form,
    set = setForm,
  ) => (
    <label className="block text-sm font-medium" key={key}>
      {label}
      <input
        type={type}
        className={`${field} mt-1`}
        value={source[key] || ""}
        onChange={(e) =>
          set((prev: any) => ({ ...prev, [key]: e.target.value }))
        }
      />
    </label>
  );
  const area = (key: string, label: string, source = task, set = setTask) => (
    <label className="block text-sm font-medium" key={key}>
      {label}
      <textarea
        rows={3}
        className={`${field} mt-1`}
        value={source[key] || ""}
        onChange={(e) =>
          set((prev: any) => ({ ...prev, [key]: e.target.value }))
        }
      />
    </label>
  );
  const choose = (
    key: string,
    label: string,
    values: any[],
    source = form,
    set = setForm,
  ) => (
    <label className="block text-sm font-medium" key={key}>
      {label}
      <select
        className={`${field} mt-1`}
        value={source[key] || ""}
        onChange={(e) =>
          set((prev: any) => ({
            ...prev,
            [key]: e.target.value,
            ...(key === "action" && e.target.value === "EDIT"
              ? {
                  title: selected?.title || "",
                  description: selected?.description || "",
                }
              : {}),
          }))
        }
      >
        <option value="">Select…</option>
        {values.map((value) => (
          <option key={value.id || value} value={value.id || value}>
            {value.label || value.name || name(value) || title(value)}
          </option>
        ))}
      </select>
    </label>
  );
  const active =
    selected && !["RESOLVED", "CLOSED", "DRAFT"].includes(selected.status);
  const actions = admin
    ? [
        "NOTE",
        ...(selected?.status === "DRAFT" ? ["ASSIGN", "ISSUE"] : []),
        ...(active ? ["ASSIGN", "REVIEW", "RESOLVE"] : []),
        ...(kind === "COMPLAINT" ? ["CUSTOMER_UPDATE"] : []),
        ...(selected?.status === "RESOLVED" ? ["CLOSE"] : []),
        ...(["RESOLVED", "CLOSED"].includes(selected?.status)
          ? ["REOPEN"]
          : []),
        ...(selected?.followUpAt ? ["FOLLOW_UP_COMPLETE"] : []),
      ]
    : [...(active ? ["RESPOND"] : []), "ACKNOWLEDGE"];
  if (kind === "COMPLAINT" && !admin)
    return (
      <p className="p-8">
        Customer complaints are restricted to administrators.
      </p>
    );
  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 text-slate-900 dark:text-slate-100 md:p-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">
            Operations · Accountability
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {kind === "COMPLAINT"
              ? "Customer Complaints"
              : admin
                ? "Officer Queries"
                : "My Queries & Decisions"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {kind === "COMPLAINT"
              ? "Record concerns, establish the facts, and track service recovery through to closure."
              : "A clear record of allegations, officer responses, company decisions and follow-up."}
          </p>
        </div>
        {admin && (
          <button
            className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
            onClick={() => {
              setCreating(true);
              setSelected(null);
              setForm({
                subject: "EMPLOYEE",
                category: "Professional conduct",
                priority: "MEDIUM",
              });
            }}
          >
            New {kind === "QUERY" ? "query" : "complaint"}
          </button>
        )}
      </header>
      {admin && kind === "COMPLAINT" && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-indigo-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Customer complaint link</h2>
              <p className="mt-1 text-sm">
                Share a secure form. Customers receive a ticket number, email
                confirmation and private tracking link.
              </p>
            </div>
            <button className={button} onClick={() => void shareLink()}>
              Get & copy complaint link
            </button>
          </div>
          {portalLink && (
            <input
              aria-label="Customer complaint link"
              readOnly
              className={`${field} mt-4`}
              value={portalLink}
            />
          )}{" "}
          {verificationReady === false && (
            <p className="mt-3 text-sm font-semibold text-amber-800">
              Human verification needs configuration before customers can
              submit. Add TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY to Render.
              Submissions remain blocked until verification is ready.
            </p>
          )}
        </section>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [
            "Active",
            Object.entries(data.stats.statuses)
              .filter(([key]) => !["DRAFT", "RESOLVED", "CLOSED"].includes(key))
              .reduce((sum, entry) => sum + Number(entry[1]), 0),
          ],
          ["Overdue", data.stats.overdue],
          ["Resolved", data.stats.statuses.RESOLVED || 0],
          ["Closed", data.stats.statuses.CLOSED || 0],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p
              className={`mt-2 text-3xl font-bold ${label === "Overdue" && Number(value) > 0 ? "text-red-600" : ""}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Search cases"
          placeholder="Search reference, title or details…"
          className={`${field} max-w-md`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Case status"
          className={`${field} max-w-52`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => {
              setOverdue(e.target.checked);
              setPage(1);
            }}
          />
          Overdue only
        </label>
        <button className={button} onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(500px,1.4fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b p-4 text-sm font-semibold">
            {data.total} case{data.total === 1 ? "" : "s"}
          </div>
          {loading ? (
            <p className="p-8 text-slate-500">Loading cases…</p>
          ) : data.items.length === 0 ? (
            <p className="p-8 text-slate-500">No cases match this view.</p>
          ) : (
            data.items.map((row: any) => (
              <button
                key={row.id}
                onClick={() => void open(row.id)}
                className={`block w-full border-b border-slate-100 p-5 text-left hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-slate-700 ${selected?.id === row.id ? "bg-indigo-50 dark:bg-slate-700" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-500">
                    {row.reference}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                    {title(row.status)}
                  </span>
                </div>
                <p className="mt-2 font-semibold">{row.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {name(row.employee) || title(row.subject)} ·{" "}
                  {title(row.priority)}
                </p>
                <p
                  className={`mt-2 text-xs ${row.dueAt && new Date(row.dueAt) < new Date() && !["RESOLVED", "CLOSED", "DRAFT"].includes(row.status) ? "font-semibold text-red-600" : "text-slate-500"}`}
                >
                  Deadline: {date(row.dueAt)}
                </p>
              </button>
            ))
          )}
          <div className="flex items-center justify-between p-4">
            <button
              className={button}
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="text-xs">Page {page}</span>
            <button
              className={button}
              disabled={page * 25 >= data.total || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          {creating ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">
                {kind === "QUERY"
                  ? "Prepare an officer query"
                  : "Record a customer complaint"}
              </h2>
              {input("title", "Case title")}
              {kind === "COMPLAINT" &&
                choose("subject", "Concern relates to", [
                  "EMPLOYEE",
                  "OPERATIONS",
                  "ACTIVITIES",
                ])}
              {choose("employeeId", "Employee concerned", options.employees)}
              {choose("locationId", "Location", options.locations)}
              {input("category", "Category")}
              {choose("priority", "Priority", [
                "LOW",
                "MEDIUM",
                "HIGH",
                "URGENT",
              ])}
              {area(
                "description",
                kind === "QUERY"
                  ? "Allegation and facts shared with the officer"
                  : "Customer complaint and relevant facts",
                form,
                setForm,
              )}
              {kind === "COMPLAINT" && (
                <>
                  {input("customerName", "Customer / complainant (optional)")}
                  {input(
                    "customerContact",
                    "Customer contact (private, optional)",
                  )}
                </>
              )}
              {choose("ownerEmployeeId", "Case owner", options.employees)}
              {input(
                "dueAt",
                kind === "QUERY"
                  ? "Response deadline (local time)"
                  : "Case deadline (local time)",
                "datetime-local",
              )}
              <button
                className={button}
                disabled={busy}
                onClick={() => void run()}
              >
                {busy
                  ? "Saving…"
                  : kind === "QUERY"
                    ? "Save draft"
                    : "Record complaint"}
              </button>
              <p className="text-xs text-slate-500">
                {kind === "QUERY"
                  ? "The officer cannot see this draft until an administrator issues it."
                  : "Customer contact details and investigation notes stay private to administrators."}
              </p>
            </div>
          ) : !selected ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-lg font-semibold">
                Every case deserves a clear outcome
              </p>
              <p className="mt-2 text-sm">
                Select a case to review its timeline and next steps.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="font-mono text-xs text-indigo-600">
                  {selected.reference}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{selected.title}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {name(selected.employee)} ·{" "}
                  {selected.locationName || "No location recorded"} ·{" "}
                  {title(selected.status)}
                </p>
              </div>
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-900 md:grid-cols-2">
                <p>
                  Category: <strong>{selected.category}</strong>
                </p>
                <p>
                  Deadline: <strong>{date(selected.dueAt)}</strong>
                </p>
                {admin && (
                  <>
                    <p>
                      Owner:{" "}
                      <strong>{selected.ownerName || "Unassigned"}</strong>
                    </p>
                    <p>
                      Customer:{" "}
                      <strong>{selected.customerName || "Not recorded"}</strong>
                    </p>
                    {selected.customerContact && (
                      <p>Contact: {selected.customerContact}</p>
                    )}
                    {selected.sourceCaseId && (
                      <button
                        className="text-left text-indigo-600 underline"
                        onClick={() => {
                          window.location.href = `/dashboard/insights/complaints?caseId=${selected.sourceCaseId}`;
                        }}
                      >
                        Open linked complaint
                      </button>
                    )}
                    {selected.followUpAt && (
                      <p>Follow-up: {date(selected.followUpAt)}</p>
                    )}
                  </>
                )}
              </div>
              <div>
                <h3 className="font-bold">
                  {kind === "QUERY"
                    ? "Allegation / query"
                    : "Complaint details"}
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {selected.description}
                </p>
              </div>
              {selected.resolution && (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
                  <h3 className="font-bold">
                    Company resolution · {title(selected.outcome)}
                  </h3>
                  <p className="whitespace-pre-wrap">{selected.resolution}</p>
                  <p>
                    <strong>Corrective action:</strong>{" "}
                    {selected.correctiveAction}
                  </p>
                  {selected.preventiveAction && (
                    <p>
                      <strong>Prevention:</strong> {selected.preventiveAction}
                    </p>
                  )}
                  {admin && selected.rootCause && (
                    <p>
                      <strong>Root cause (internal):</strong>{" "}
                      {selected.rootCause}
                    </p>
                  )}
                </div>
              )}
              <div>
                <h3 className="mb-4 font-bold">Case history</h3>
                <ol className="space-y-4 border-l-2 border-indigo-100 pl-5">
                  {selected.events.map((event: any) => (
                    <li key={event.id}>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <strong>{title(event.type)}</strong>
                        {event.visibility === "INTERNAL" && (
                          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                            Internal
                          </span>
                        )}
                        <span className="text-slate-500">
                          {date(event.createdAt)} · {event.actorName}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                        {event.message}
                      </p>
                      {admin && event.changes && (
                        <details className="mt-2 text-xs text-slate-500">
                          <summary className="cursor-pointer">
                            Recorded changes
                          </summary>
                          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3 dark:bg-slate-900">
                            {JSON.stringify(JSON.parse(event.changes), null, 2)}
                          </pre>
                        </details>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              {admin && kind === "COMPLAINT" && (
                <a
                  className="block font-semibold text-indigo-600 underline"
                  href={`/dashboard/insights/queries?sourceCaseId=${selected.id}&employeeId=${selected.employeeId || ""}`}
                >
                  Prepare a linked officer query
                </a>
              )}
              <div className="space-y-4 border-t pt-5">
                {admin && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                    Customer updates and complaint resolutions are visible on
                    the customer's private tracking page. Issuing, resolving,
                    closing or reopening an officer query shares that action
                    with the officer. Internal notes and root-cause findings
                    remain private.
                  </p>
                )}
                <h3 className="font-bold">
                  {admin ? "Next action" : "Your response"}
                </h3>
                {choose("action", "Action", actions, task, setTask)}
                {task.action === "ASSIGN" && (
                  <>
                    {choose(
                      "priority",
                      "Priority update",
                      ["LOW", "MEDIUM", "HIGH", "URGENT"],
                      task,
                      setTask,
                    )}
                    {input(
                      "category",
                      "Category update (optional)",
                      "text",
                      task,
                      setTask,
                    )}
                    {(selected.kind === "COMPLAINT" ||
                      selected.status === "DRAFT") &&
                      choose(
                        "employeeId",
                        "Employee concerned (optional update)",
                        options.employees,
                        task,
                        setTask,
                      )}
                    {choose(
                      "ownerEmployeeId",
                      "Case owner",
                      options.employees,
                      task,
                      setTask,
                    )}
                    {input(
                      "dueAt",
                      "Updated deadline (local time)",
                      "datetime-local",
                      task,
                      setTask,
                    )}
                  </>
                )}
                {area(
                  "message",
                  task.action === "ACKNOWLEDGE"
                    ? "Optional comment"
                    : "Reason, response or update",
                )}
                {task.action === "NOTE" &&
                  kind === "QUERY" &&
                  selected.issuedAt &&
                  choose(
                    "visibility",
                    "Who can see this note?",
                    ["INTERNAL", "EMPLOYEE"],
                    task,
                    setTask,
                  )}
                {task.action === "RESOLVE" && (
                  <>
                    {choose(
                      "outcome",
                      "Finding / outcome",
                      kind === "COMPLAINT"
                        ? [
                            "SUBSTANTIATED",
                            "NOT_SUBSTANTIATED",
                            "PARTIALLY_SUBSTANTIATED",
                            "RESOLVED_BY_SERVICE_RECOVERY",
                          ]
                        : [
                            "NO_MISCONDUCT",
                            "COACHING",
                            "WRITTEN_WARNING",
                            "FURTHER_ACTION",
                          ],
                      task,
                      setTask,
                    )}
                    {area(
                      "resolution",
                      kind === "COMPLAINT"
                        ? "Resolution shared with customer"
                        : "Company decision shared with officer",
                    )}
                    {area("rootCause", "Root cause (internal)")}
                    {area(
                      "correctiveAction",
                      "Corrective action (or state none required)",
                    )}
                    {area("preventiveAction", "Preventive measures")}
                    {input(
                      "followUpAt",
                      "Follow-up date (local time)",
                      "datetime-local",
                      task,
                      setTask,
                    )}
                  </>
                )}
                <button
                  className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
                  disabled={busy}
                  onClick={() => void run()}
                >
                  {busy
                    ? "Saving…"
                    : task.action === "ISSUE"
                      ? "Issue query to officer"
                      : task.action === "RESPOND"
                        ? "Submit response"
                        : "Save action"}
                </button>
                {!admin && (
                  <p className="text-xs text-slate-500">
                    Acknowledging receipt does not indicate agreement with an
                    allegation or decision. Your response remains part of the
                    case history.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
