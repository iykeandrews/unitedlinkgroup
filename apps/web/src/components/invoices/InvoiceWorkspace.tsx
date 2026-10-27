"use client";
import AmericanDateInput from "./AmericanDateInput";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Download,
  RefreshCw,
  ArrowUpRight,
  Users,
  Clock,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useBusiness } from "@/context/business-context";
import { formatCurrency } from "@/lib/localization";
import { Modal } from "@/components/Modal";
import InvoiceModal from "./InvoiceModal";
import StatusBadge from "./StatusBadge";
import {
  invoiceDate,
  invoiceError,
  invoiceMatches,
  invoicePeriodRange,
  invoiceInPeriod,
  invoiceMetrics,
  exportInvoiceCsv,
} from "./accounting";
export default function InvoiceWorkspace({
  clientId,
  client,
  embedded = false,
}: {
  clientId?: string;
  client?: any;
  embedded?: boolean;
}) {
  const { selectedBusiness } = useBusiness();
  const [invoices, setInvoices] = useState<any[]>([]),
    [clients, setClients] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [tab, setTab] = useState<"invoices" | "clients">("invoices"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("ALL"),
    [clientFilter, setClientFilter] = useState("ALL"),
    [sort, setSort] = useState("NEWEST"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [period, setPeriod] = useState("ALL");
  const [periodDate, setPeriodDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const periodRange = useMemo(
    () => invoicePeriodRange(period, periodDate),
    [period, periodDate],
  );
  const [modal, setModal] = useState(false),
    [selected, setSelected] = useState<any>(undefined),
    [newClient, setNewClient] = useState(false),
    [savingClient, setSavingClient] = useState(false),
    [clientForm, setClientForm] = useState({
      name: "",
      email: "",
      phone: "",
      address: "",
    });
  const generation = useRef(0);
  const money = (value: number) =>
    formatCurrency(value, selectedBusiness?.currencyCode);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setError("");
    if (!selectedBusiness?.id) {
      setLoading(false);
      setInvoices([]);
      setClients([]);
      return;
    }
    setLoading(true);
    try {
      const config = { headers: { "x-business-id": selectedBusiness.id } };
      const [i, c] = await Promise.all([
        api.get(
          clientId ? `/invoices/client/${clientId}` : "/invoices",
          config,
        ),
        clientId
          ? Promise.resolve({ data: client ? [client] : [] })
          : api.get("/invoices/clients", config),
      ]);
      if (current !== generation.current) return;
      setInvoices(i.data);
      setClients(c.data);
    } catch (e) {
      if (current === generation.current) {
        setInvoices([]);
        setClients([]);
        setError(invoiceError(e));
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [selectedBusiness?.id, clientId, client]);
  useEffect(() => {
    setModal(false);
    setSelected(undefined);
    setNewClient(false);
    setInvoices([]);
    setClients([]);
    setQuery("");
    setStatus("ALL");
    setPeriod("ALL");
    setClientFilter("ALL");
    setFrom("");
    setTo("");
    reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  const metrics = useMemo(() => invoiceMetrics(invoices), [invoices]);
  const filtered = useMemo(
    () =>
      invoices
        .filter(
          (i) =>
            [i.invoiceNumber, i.client?.name, i.location?.name, i.notes]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase().trim()) &&
            invoiceMatches(i, status) &&
            (period === "ALL" ||
              (!!periodRange && invoiceInPeriod(i, periodRange))) &&
            (clientFilter === "ALL" || i.clientId === clientFilter) &&
            (!from || i.dueDate.slice(0, 10) >= from) &&
            (!to || i.dueDate.slice(0, 10) <= to),
        )
        .sort((a, b) =>
          sort === "BALANCE"
            ? b.balanceDue - a.balanceDue
            : sort === "DUE"
              ? a.dueDate.localeCompare(b.dueDate)
              : b.createdAt.localeCompare(a.createdAt),
        ),
    [
      invoices,
      query,
      status,
      clientFilter,
      sort,
      from,
      to,
      period,
      periodRange,
    ],
  );
  const filteredClients = clients.filter((c) =>
    [c.name, c.email, c.billingContactEmail, c.phone, c.address]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  async function saveClient(e: React.FormEvent) {
    e.preventDefault();
    setSavingClient(true);
    const current = generation.current;
    try {
      await api.post("/invoices/clients", clientForm, {
        headers: { "x-business-id": selectedBusiness?.id || "" },
      });
      if (current !== generation.current) return;
      setNewClient(false);
      setClientForm({ name: "", email: "", phone: "", address: "" });
      toast.success("Client added.");
      reload();
    } catch (e) {
      toast.error(invoiceError(e));
    } finally {
      setSavingClient(false);
    }
  }
  const input =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
  const filterActive =
    period !== "ALL" ||
    status !== "ALL" ||
    clientFilter !== "ALL" ||
    !!from ||
    !!to ||
    !!query;
  if (!selectedBusiness)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
        Select a business to manage its invoices.
      </div>
    );
  return (
    <div className={`min-w-0 space-y-6 ${embedded ? "" : "pb-24"}`}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-300">
            {selectedBusiness.name} · Accounts receivable
          </p>
          <h1
            className={`mt-2 font-semibold tracking-tight text-slate-900 dark:text-white ${embedded ? "text-xl" : "text-3xl"}`}
          >
            {embedded ? "Invoices & billing history" : "Invoices & billing"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            A clear view of what’s billed, collected, and still due.
          </p>
        </div>
        <button
          disabled={loading || !!error}
          onClick={() => {
            if (!clientId && !clients.length) {
              setTab("clients");
              setNewClient(true);
              return;
            }
            setSelected(undefined);
            setModal(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
        >
          <Plus size={17} />
          New invoice
        </button>
      </header>
      {!embedded && (
        <nav
          aria-label="Billing views"
          className="flex gap-2 border-b border-slate-200 pb-3 dark:border-slate-700"
        >
          {(["invoices", "clients"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setQuery("");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              {t === "invoices" ? <FileText size={16} /> : <Users size={16} />}{" "}
              {t === "invoices" ? "Invoices" : "Clients"}
            </button>
          ))}
        </nav>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <p>{error}</p>
          <button onClick={reload} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}
      {tab === "invoices" && (
        <>
          <section
            aria-label="Invoice summary"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              {
                label: "Outstanding",
                value: money(metrics.outstanding),
                hint: `${metrics.unpaidCount} unpaid invoices`,
                icon: Wallet,
                filter: "OPEN",
                color: "text-teal-700 dark:text-teal-300",
              },
              {
                label: "Payments recorded",
                value: money(metrics.paid),
                hint: "Across issued invoices",
                icon: CheckCircle2,
                filter: "WITH_PAYMENTS",
                color: "text-emerald-700 dark:text-emerald-300",
              },
              {
                label: "Overdue",
                value: money(metrics.overdue),
                hint: "Past due and still outstanding",
                icon: Clock,
                filter: "OVERDUE",
                color: "text-rose-700 dark:text-rose-300",
              },
              {
                label: "Drafts",
                value: String(metrics.drafts),
                hint: "Not included in outstanding",
                icon: FileText,
                filter: "DRAFT",
                color: "text-slate-700 dark:text-slate-300",
              },
            ].map((card) => (
              <button
                key={card.label}
                onClick={() => setStatus(card.filter)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900"
              >
                <div
                  className={`flex items-center justify-between text-xs font-semibold uppercase tracking-wide ${card.color}`}
                >
                  <span>{card.label}</span>
                  <card.icon size={18} />
                </div>
                <p className="mt-4 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {loading ? "—" : card.value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{card.hint}</p>
              </button>
            ))}
          </section>
          <section
            aria-label="Receivables aging"
            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-white dark:border-slate-700"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-semibold">Receivables aging</h2>
              <span className="text-xs text-slate-400">
                Outstanding balances by days past due
              </span>
            </div>
            <div className="grid grid-cols-2 divide-white/10 sm:grid-cols-5">
              {metrics.aging.map((a) => (
                <div
                  key={a.label}
                  className="border-r border-white/10 px-5 py-4"
                >
                  <p className="text-xs text-slate-400">{a.label}</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">
                    {loading ? "—" : money(a.amount)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              aria-label={
                tab === "invoices" ? "Search invoices" : "Search clients"
              }
              className={`${input} pl-10`}
              placeholder={
                tab === "invoices"
                  ? "Search invoice, client, or site…"
                  : "Search clients…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              aria-label="Refresh invoices"
              disabled={loading}
              onClick={reload}
              className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            {tab === "invoices" ? (
              <button
                disabled={loading || !filtered.length}
                onClick={() =>
                  exportInvoiceCsv(
                    filtered,
                    selectedBusiness.currencyCode || "USD",
                  )
                }
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-slate-700"
              >
                <Download size={16} />
                Export CSV
              </button>
            ) : (
              <button
                onClick={() => setNewClient(true)}
                className="flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Add client
              </button>
            )}
          </div>
        </div>
        {tab === "invoices" && (
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-950/40 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-medium text-slate-500">
              Invoice period
              <select
                aria-label="Invoice period"
                className={`${input} mt-1`}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="ALL">All periods</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </label>
            {period !== "ALL" && (
              <label className="text-xs font-medium text-slate-500">
                Date within period
                <AmericanDateInput
                  aria-label="Date within invoice period"
                  className={`${input} mt-1`}
                  value={periodDate}
                  onChange={setPeriodDate}
                />
              </label>
            )}
            {period !== "ALL" && (
              <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-5">
                {periodRange
                  ? `Issued invoices with service start dates from ${invoiceDate(periodRange.start)} through ${invoiceDate(periodRange.end)}. Weeks run Sunday–Saturday.`
                  : "Enter a valid date to view this period."}
              </p>
            )}
            <label className="text-xs font-medium text-slate-500">
              Status
              <select
                aria-label="Invoice status filter"
                className={`${input} mt-1`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  ["ALL", "All invoices"],
                  ["OPEN", "Unpaid — all outstanding"],
                  ["PAID", "Paid"],
                  ["WITH_PAYMENTS", "Payments recorded"],
                  ["PARTIALLY_PAID", "Partially paid"],
                  ["OVERDUE", "Overdue"],
                  ["DRAFT", "Draft"],
                  ["VOID", "Void"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {!clientId && (
              <label className="text-xs font-medium text-slate-500">
                Client
                <select
                  aria-label="Client filter"
                  className={`${input} mt-1`}
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                >
                  <option value="ALL">All clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-xs font-medium text-slate-500">
              Service end from
              <AmericanDateInput
                aria-label="Service end date from"
                className={`${input} mt-1`}
                value={from}
                onChange={(value) => setFrom(value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Service end through
              <AmericanDateInput
                aria-label="Service end date through"
                className={`${input} mt-1`}
                min={from}
                value={to}
                onChange={(value) => setTo(value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Sort
              <select
                aria-label="Invoice sort"
                className={`${input} mt-1`}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="NEWEST">Newest first</option>
                <option value="DUE">Service end date first</option>
                <option value="BALANCE">Highest balance</option>
              </select>
            </label>
            {filterActive && (
              <button
                onClick={() => {
                  setStatus("ALL");
                  setPeriod("ALL");
                  setClientFilter("ALL");
                  setFrom("");
                  setTo("");
                  setQuery("");
                }}
                className="text-left text-xs font-semibold text-teal-700 dark:text-teal-300"
              >
                Clear filters
              </button>
            )}
            {from && to && from > to && (
              <p role="alert" className="text-xs text-rose-700">
                Due-through date must be on or after due-from date.
              </p>
            )}
          </div>
        )}
        {loading ? (
          <p role="status" className="p-12 text-center text-sm text-slate-500">
            Loading billing records…
          </p>
        ) : tab === "invoices" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                  <tr>
                    {[
                      "Invoice / client",
                      "Service start date",
                      "Service end date",
                      "Total",
                      "Paid",
                      "Balance due",
                      "Status",
                      "",
                    ].map((t, i) => (
                      <th
                        key={i}
                        className={`px-5 py-3 ${[3, 4, 5].includes(i) ? "text-right" : ""}`}
                        scope="col"
                      >
                        {t || "Actions"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.length ? (
                    filtered.map((i) => (
                      <tr
                        key={i.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-5 py-4">
                          <button
                            onClick={() => {
                              setSelected(i);
                              setModal(true);
                            }}
                            className="font-semibold text-teal-800 hover:underline dark:text-teal-300"
                          >
                            {i.invoiceNumber}
                          </button>
                          <p className="mt-1 text-xs text-slate-500">
                            {i.client?.name}
                          </p>
                          {i.location && (
                            <p className="mt-1 text-xs text-slate-400">
                              {i.location.name}
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                          {invoiceDate(i.issueDate)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <p>{invoiceDate(i.dueDate)}</p>
                          {i.paymentDueDate ? (
                            <p className="mt-1 text-xs font-medium">
                              Payment due {invoiceDate(i.paymentDueDate)}
                            </p>
                          ) : i.paymentTermsFromEmail ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Payment terms start when emailed
                            </p>
                          ) : null}
                          {i.isOverdue && (
                            <p className="mt-1 text-xs text-rose-600">
                              {i.daysOverdue} days overdue
                            </p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                          {money(i.total)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                          {money(i.amountPaid)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums">
                          {money(i.balanceDue)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={i.status} />
                        </td>
                        <td className="px-5 py-4">
                          <button
                            aria-label={`View invoice ${i.invoiceNumber}`}
                            onClick={() => {
                              setSelected(i);
                              setModal(true);
                            }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <ArrowUpRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 text-center">
                        <FileText
                          size={32}
                          className="mx-auto mb-3 text-slate-300"
                        />
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {error
                            ? "Billing records unavailable"
                            : invoices.length
                              ? "No invoices match these filters"
                              : "Your invoice history starts here"}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {invoices.length
                            ? "Adjust the filters to find an invoice."
                            : "Create an invoice, then record received payments to track its balance."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-700">
              <span>
                {filtered.length} of {invoices.length} invoices
              </span>
              <span>
                Filtered outstanding:{" "}
                {money(invoiceMetrics(filtered).outstanding)}
              </span>
            </div>
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-950">
                <tr>
                  {["Client", "Billing email", "Phone", "Address", ""].map(
                    (t, i) => (
                      <th key={i} className="px-5 py-3">
                        {t || "Actions"}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClients.length ? (
                  filteredClients.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-4 font-semibold">{c.name}</td>
                      <td className="px-5 py-4 text-slate-500">
                        {c.billingContactEmail || c.email || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {c.phone || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {c.address || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => {
                            setSelected(undefined);
                            setModal(true);
                            setClientFilter(c.id);
                          }}
                          className="text-sm font-semibold text-teal-700 dark:text-teal-300"
                        >
                          Create invoice
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      {clients.length
                        ? "No clients match your search."
                        : "Add a client to start invoicing."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <InvoiceModal
        isOpen={modal}
        onClose={() => setModal(false)}
        invoice={selected}
        clientId={
          selected?.clientId ||
          clientId ||
          (clientFilter !== "ALL" ? clientFilter : "")
        }
        clientData={client}
        onSave={reload}
      />
      <Modal
        isOpen={newClient}
        onClose={() => {
          if (!savingClient) setNewClient(false);
        }}
        title="Add billing client"
      >
        <form onSubmit={saveClient} className="space-y-4">
          {[
            { name: "name", label: "Client name", type: "text", max: 200 },
            { name: "email", label: "Billing email", type: "email", max: 254 },
            { name: "phone", label: "Phone", type: "tel", max: 50 },
            {
              name: "address",
              label: "Billing address",
              type: "text",
              max: 500,
            },
          ].map((f) => (
            <label key={f.name} className="block text-sm font-medium">
              {f.label}
              <input
                aria-label={f.label}
                className={`${input} mt-1`}
                required={f.name === "name"}
                type={f.type}
                maxLength={f.max}
                value={(clientForm as any)[f.name]}
                onChange={(e) =>
                  setClientForm({ ...clientForm, [f.name]: e.target.value })
                }
              />
            </label>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={savingClient}
              onClick={() => setNewClient(false)}
              className="rounded-lg px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              disabled={savingClient}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingClient ? "Saving…" : "Add client"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
