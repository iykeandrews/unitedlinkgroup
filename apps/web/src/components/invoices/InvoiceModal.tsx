"use client";
import {
  SERVICE_OPTIONS,
  readBillingServices,
  serviceRateFor,
} from "@/components/billing/LocationBillingServices";
import ServiceDatePicker from "./ServiceDatePicker";
import { InvoiceBillingDetails } from "@/components/billing/BillingReferences";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Download,
  Send,
  Save,
  ArrowLeft,
  Copy,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useBusiness } from "@/context/business-context";
import { formatCurrency } from "@/lib/localization";
import InvoicePayments from "./InvoicePayments";
import StatusBadge from "./StatusBadge";
import { invoiceDate, invoiceError } from "./accounting";
type Props = {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientData?: any;
  invoice?: any;
  onSave: () => void;
};
const initial = (clientId = "") => ({
  invoiceNumber: "",
  clientId,
  locationId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  status: "DRAFT",
  notes: "",
  items: [{ description: "", quantity: 1, rate: "" }],
});
export default function InvoiceModal({
  isOpen,
  onClose,
  clientId = "",
  clientData,
  invoice,
  onSave,
}: Props) {
  const { selectedBusiness } = useBusiness();
  const [form, setForm] = useState<any>(initial(clientId)),
    [saved, setSaved] = useState<any>(null),
    [mode, setMode] = useState<"edit" | "preview">("edit"),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [clients, setClients] = useState<any[]>([]),
    [locations, setLocations] = useState<any[]>([]),
    [tax, setTax] = useState({ rate: 0, inclusive: false }),
    [taxError, setTaxError] = useState(""),
    [taxLoading, setTaxLoading] = useState(false);
  const generation = useRef(0);
  const busyRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    busyRef.current = busy;
    closeRef.current = onClose;
  }, [busy, onClose]);
  const input =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white";
  const money = (n: number) =>
    formatCurrency(n, selectedBusiness?.currencyCode);
  const fromInvoice = (i: any) => ({
    invoiceNumber: i.invoiceNumber,
    clientId: i.clientId,
    locationId: i.locationId || "",
    issueDate: i.issueDate.slice(0, 10),
    dueDate: i.dueDate.slice(0, 10),
    status:
      i.documentStatus === "DRAFT"
        ? "DRAFT"
        : i.documentStatus === "VOID"
          ? "VOID"
          : "SENT",
    notes: i.notes || "",
    items: (i.items || []).map((it: any) => ({
      description: it.description,
      quantity: it.quantity,
      rate: it.rate,
    })),
  });
  useEffect(() => {
    if (!isOpen) return;
    ++generation.current;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setSaved(null);
    setForm(initial(clientId));
    setMode(invoice?.id ? "preview" : "edit");
    setTaxError("");
    setBusy(false);
    const options = {
      headers: { "x-business-id": selectedBusiness?.id || "" },
    };
    Promise.all([
      api.get("/invoices/clients", options),
      api.get("/locations", options),
      invoice?.id
        ? api.get(`/invoices/${invoice.id}`, options)
        : Promise.resolve(null),
    ])
      .then(([c, l, i]) => {
        if (cancelled) return;
        setClients(c.data);
        setLocations(l.data);
        if (i) {
          setSaved(i.data);
          setForm(fromInvoice(i.data));
          setTax({ rate: i.data.taxRate, inclusive: i.data.taxInclusive });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(invoiceError(e));
          setLoadError("Unable to load invoice details. Close and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) closeRef.current();
      if (e.key === "Tab" && dialogRef.current) {
        const elements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
          ),
        ).filter((el) => el.getClientRects().length > 0);
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    document.addEventListener("keydown", escape);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      generation.current++;
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = old;
      previousFocus?.focus();
    };
    // Reset on a different record or business; changes within the editor remain local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoice?.id, clientId, selectedBusiness?.id]);
  useEffect(() => {
    if (!isOpen || loading || !form.clientId) return;
    let cancelled = false;
    if (saved && (saved.locationId || "") === form.locationId) {
      setTax({
        rate: saved.taxRate,
        inclusive:
          saved.taxInclusive ||
          (saved.taxAmount > 0 && saved.total === saved.subtotal),
      });
      setTaxError("");
      setTaxLoading(false);
      return;
    }
    setTaxLoading(true);
    setTaxError("");
    api
      .get("/invoices/tax-context", {
        params: {
          clientId: form.clientId,
          ...(form.locationId ? { locationId: form.locationId } : {}),
        },
        headers: { "x-business-id": selectedBusiness?.id || "" },
      })
      .then((r) => {
        if (!cancelled) setTax(r.data);
      })
      .catch((e) => {
        if (!cancelled) setTaxError(invoiceError(e));
      })
      .finally(() => {
        if (!cancelled) setTaxLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    loading,
    form.clientId,
    form.locationId,
    saved?.id,
    saved?.taxRate,
    selectedBusiness?.id,
  ]);
  const client =
    clients.find((c) => c.id === form.clientId) || saved?.client || clientData;
  const site = locations.find((l) => l.id === form.locationId);
  const siteServices = readBillingServices(site?.billingServices);
  const subtotal =
    Math.round(
      form.items.reduce(
        (sum: number, item: any) =>
          sum +
          Math.round(Number(item.quantity || 0) * Number(item.rate || 0) * 100),
        0,
      ),
    ) / 100;
  const taxAmount =
    Math.round(
      (tax.inclusive
        ? (subtotal * tax.rate) / (100 + tax.rate)
        : (subtotal * tax.rate) / 100) * 100,
    ) / 100;
  const total =
    Math.round((tax.inclusive ? subtotal : subtotal + taxAmount) * 100) / 100;
  const dirty = saved
    ? JSON.stringify(form) !== JSON.stringify(fromInvoice(saved))
    : true;
  const canEdit =
    !saved ||
    (!["PAID", "PARTIALLY_PAID", "VOID"].includes(saved.status) &&
      !saved.payments?.some((p: any) => !p.voidedAt));
  const change = (key: string, value: any) =>
    setForm((prev: any) => {
      if (key !== "locationId" || value === prev.locationId)
        return { ...prev, [key]: value };
      const services = readBillingServices(
        locations.find((l) => l.id === value)?.billingServices,
      );
      return {
        ...prev,
        locationId: value,
        items: prev.items.map((item: any) =>
          item.serviceChoice
            ? { ...item, rate: serviceRateFor(services, item.description) }
            : item,
        ),
      };
    });
  const chooseService = (index: number, choice: string) => {
    const description = choice.startsWith("CUSTOM:")
      ? choice.slice(7)
      : choice === "OTHER"
        ? ""
        : SERVICE_OPTIONS.find((o) => o[0] === choice)?.[1] || "";
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: number) =>
        i === index
          ? {
              ...item,
              serviceChoice: choice,
              description,
              rate: serviceRateFor(siteServices, description),
            }
          : item,
      ),
    }));
  };
  const customDescription = (index: number, description: string) =>
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: number) =>
        i === index
          ? {
              ...item,
              description,
              rate:
                serviceRateFor(siteServices, description) === "" &&
                !item.serviceChoice
                  ? item.rate
                  : serviceRateFor(siteServices, description),
            }
          : item,
      ),
    }));
  const itemChange = (index: number, key: string, value: any) =>
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any, i: number) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  async function save() {
    if (
      !form.clientId ||
      !form.issueDate ||
      !form.dueDate ||
      form.dueDate < form.issueDate
    ) {
      toast.error(
        "Select a client and a service end date on or after the service start date.",
      );
      return;
    }
    if (
      !form.items.length ||
      form.items.some(
        (i: any) =>
          !i.description.trim() ||
          !Number.isFinite(Number(i.quantity)) ||
          Number(i.quantity) <= 0 ||
          String(i.rate).trim() === "" ||
          !Number.isFinite(Number(i.rate)) ||
          Number(i.rate) < 0,
      ) ||
      !Number.isFinite(total) ||
      total <= 0
    ) {
      toast.error("Enter valid items with a positive invoice total.");
      return;
    }
    const current = generation.current;
    setBusy(true);
    try {
      const payload = {
        ...form,
        ...(saved?.id ? { expectedUpdatedAt: saved.updatedAt } : {}),
        invoiceNumber: saved?.invoiceNumber || undefined,
        locationId: form.locationId || null,
        items: form.items.map((i: any) => ({
          description: i.description,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
        })),
      };
      const r = saved?.id
        ? await api.patch(`/invoices/${saved.id}`, payload)
        : await api.post("/invoices", payload);
      if (current !== generation.current) return;
      setSaved(r.data);
      setForm(fromInvoice(r.data));
      setTax({ rate: r.data.taxRate, inclusive: r.data.taxInclusive });
      setMode("preview");
      onSave();
      toast.success("Invoice saved.");
    } catch (e) {
      if (current === generation.current) toast.error(invoiceError(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function send() {
    if (!saved?.id || dirty) {
      toast.error("Save the invoice before sending.");
      return;
    }
    setBusy(true);
    const current = generation.current;
    try {
      const r = await api.post(`/invoices/${saved.id}/send`);
      if (current !== generation.current) return;
      setSaved(r.data);
      setForm(fromInvoice(r.data));
      onSave();
      toast.success("Invoice email sent.");
    } catch (e) {
      if (current === generation.current) toast.error(invoiceError(e));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function download() {
    if (!saved?.id || dirty) {
      toast.error("Save the invoice before downloading.");
      return;
    }
    setBusy(true);
    try {
      const r = await api.get(`/invoices/${saved.id}/pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([r.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${saved.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Unable to download the invoice PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-modal-title"
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-300">
              Client billing
            </p>
            <h2
              id="invoice-modal-title"
              className="mt-1 text-xl font-semibold text-slate-900 dark:text-white"
            >
              {saved ? saved.invoiceNumber : "New invoice"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "preview" && saved && (
              <>
                <button
                  aria-label="Duplicate invoice"
                  title="Duplicate into a new draft"
                  disabled={busy}
                  onClick={() => {
                    const copied = fromInvoice(saved);
                    setSaved(null);
                    setForm({
                      ...copied,
                      ...initial(copied.clientId),
                      locationId: copied.locationId,
                      items: copied.items,
                      notes: copied.notes,
                    });
                    setMode("edit");
                  }}
                  className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  <Copy size={19} />
                </button>
                <button
                  aria-label="Download invoice PDF"
                  title="Download PDF"
                  disabled={busy || dirty}
                  onClick={download}
                  className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  <Download size={19} />
                </button>
                <button
                  aria-label="Send invoice email"
                  title="Send invoice email"
                  disabled={busy || dirty || saved.status === "VOID"}
                  onClick={send}
                  className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  <Send size={19} />
                </button>
              </>
            )}
            <button
              disabled={busy}
              aria-label="Close invoice"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
          {loading ? (
            <p role="status" className="p-10 text-center text-slate-500">
              Loading invoice…
            </p>
          ) : loadError ? (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700"
            >
              {loadError}
            </p>
          ) : mode === "edit" ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Client
                  <select
                    aria-label="Invoice client"
                    disabled={!!saved?.id || !!clientId}
                    className={input}
                    value={form.clientId}
                    onChange={(e) => {
                      change("clientId", e.target.value);
                      change("locationId", "");
                    }}
                  >
                    <option value="">Select a client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Invoice number
                  <input
                    aria-label="Invoice number"
                    className={input}
                    placeholder="Generated when saved"
                    readOnly
                    value={saved?.invoiceNumber || ""}
                    title="Assigned automatically when the invoice is saved; cannot be changed."
                  />
                </label>
                <label className="text-sm font-medium">
                  Service start date (MM/DD/YYYY)
                  <ServiceDatePicker
                    label="Service start date"
                    className={input}
                    value={form.issueDate}
                    onChange={(value) => change("issueDate", value)}
                  />
                </label>
                <label className="text-sm font-medium">
                  Service end date (MM/DD/YYYY)
                  <ServiceDatePicker
                    label="Service end date"
                    className={input}
                    min={form.issueDate}
                    value={form.dueDate}
                    onChange={(value) => change("dueDate", value)}
                  />
                </label>
                <p className="text-xs text-gray-500 md:col-span-2">
                  Invoice numbers are generated automatically and retained
                  permanently. Invoice emails include all client contact and
                  billing emails, with a copy to invoice@unitedlinksecurity.com.
                </p>
                <label className="text-sm font-medium">
                  Document status
                  <select
                    aria-label="Document status"
                    className={input}
                    value={form.status}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Issued — unpaid</option>
                    {saved && <option value="VOID">Void</option>}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Service site
                  <select
                    aria-label="Service site"
                    className={input}
                    value={form.locationId}
                    onChange={(e) => change("locationId", e.target.value)}
                  >
                    <option value="">No site</option>
                    {locations
                      .filter((l) => l.clientId === form.clientId)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <InvoiceBillingDetails client={client} location={site} />
              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700 text-sm space-y-2">
                <h3 className="font-semibold">Payment terms</h3>
                {saved?.firstSentAt && <p>First emailed: {new Date(saved.firstSentAt).toLocaleDateString('en-US',{timeZone:'America/New_York'})}</p>}
                <p>
                  {saved?.paymentTerms ||
                    client?.paymentTerms ||
                    "Set payment terms in the client record before emailing."}
                </p>
                <p className="text-slate-500">
                  {saved?.paymentDueDate
                    ? "Payment due: " + invoiceDate(saved.paymentDueDate)
                    : saved?.paymentTermsFromEmail || !saved
                      ? "Payment countdown starts when the invoice is successfully emailed to the client."
                      : "Legacy payment date retained. Resending does not restart payment terms."}
                </p>
                <p className="text-xs text-slate-500">
                  Terms come from the client record. Service dates do not
                  determine the payment deadline.
                </p>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 font-semibold">Line items</h3>
                <div className="space-y-4">
                  {form.items.map((it: any, i: number) => (
                    <div
                      key={i}
                      className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_90px_115px_100px_32px]"
                    >
                      <label className="col-span-2 text-xs text-slate-500 sm:col-span-1">
                        Description
                        <select
                          aria-label={`Item ${i + 1} service description`}
                          className={input}
                          value={
                            it.serviceChoice ??
                            (SERVICE_OPTIONS.find(
                              (o) =>
                                o[0] !== "OTHER" && o[1] === it.description,
                            )?.[0] ||
                              (it.description ? "OTHER" : ""))
                          }
                          onChange={(e) => chooseService(i, e.target.value)}
                        >
                          <option value="">Select service</option>
                          {SERVICE_OPTIONS.filter((o) => o[0] !== "OTHER").map(
                            ([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ),
                          )}
                          {siteServices
                            .filter((s) => s.type === "OTHER")
                            .map((s) => (
                              <option
                                key={s.description}
                                value={"CUSTOM:" + s.description}
                              >
                                {s.description}
                              </option>
                            ))}
                          <option value="OTHER">Others</option>
                        </select>
                        {(it.serviceChoice === "OTHER" ||
                          it.serviceChoice?.startsWith("CUSTOM:") ||
                          (!it.serviceChoice &&
                            it.description &&
                            !SERVICE_OPTIONS.some(
                              (o) => o[1] === it.description,
                            ))) && (
                          <input
                            aria-label={`Item ${i + 1} custom description`}
                            className={input}
                            maxLength={2000}
                            value={it.description}
                            placeholder="Type the service description"
                            onChange={(e) =>
                              customDescription(i, e.target.value)
                            }
                          />
                        )}
                        {it.serviceChoice && it.rate === "" && (
                          <span className="block mt-1 text-amber-700">
                            No rate configured for this service at this
                            location. Set the location rate or enter an agreed
                            rate.
                          </span>
                        )}
                      </label>
                      <label className="text-xs text-slate-500">
                        Quantity
                        <input
                          aria-label={`Item ${i + 1} quantity`}
                          className={input}
                          type="number"
                          min="0.000001"
                          step="any"
                          value={it.quantity}
                          onChange={(e) =>
                            itemChange(i, "quantity", e.target.value)
                          }
                        />
                      </label>
                      <label className="text-xs text-slate-500">
                        Rate
                        <input
                          aria-label={`Item ${i + 1} rate`}
                          className={input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.rate}
                          onChange={(e) =>
                            itemChange(i, "rate", e.target.value)
                          }
                        />
                      </label>
                      <div className="text-xs text-slate-500">
                        Amount
                        <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
                          {money(
                            Math.round(
                              Number(it.quantity || 0) *
                                Number(it.rate || 0) *
                                100,
                            ) / 100,
                          )}
                        </p>
                      </div>
                      <button
                        aria-label={`Remove item ${i + 1}`}
                        disabled={form.items.length === 1}
                        onClick={() =>
                          change(
                            "items",
                            form.items.filter(
                              (_: any, index: number) => index !== i,
                            ),
                          )
                        }
                        className="self-center justify-self-end rounded-lg p-2 text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  disabled={form.items.length >= 500}
                  onClick={() =>
                    change("items", [
                      ...form.items,
                      { description: "", quantity: 1, rate: "" },
                    ])
                  }
                  className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-300"
                >
                  <Plus size={16} />
                  Add item
                </button>
              </section>
              <label className="block text-sm font-medium">
                Notes and payment terms
                <textarea
                  aria-label="Notes and payment terms"
                  rows={3}
                  maxLength={10000}
                  className={input}
                  value={form.notes}
                  onChange={(e) => change("notes", e.target.value)}
                />
              </label>
              {taxError && (
                <p
                  role="alert"
                  className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {taxError}
                </p>
              )}
              <div className="ml-auto max-w-sm space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>
                    {taxLoading
                      ? "Loading tax…"
                      : `Tax (${tax.rate}%)${tax.inclusive ? " included" : ""}`}
                  </span>
                  <span>{money(taxAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-semibold dark:border-slate-700">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>
            </div>
          ) : saved ? (
            <div className="space-y-5">
              <article className="rounded-xl border border-slate-200 bg-white p-5 text-slate-900 sm:p-8">
                <div className="flex flex-wrap justify-between gap-6 border-b border-slate-200 pb-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-teal-700">
                      Invoice
                    </p>
                    <h3 className="mt-2 break-words text-2xl font-semibold">
                      {saved.invoiceNumber}
                    </h3>
                    <div className="mt-3">
                      <StatusBadge status={saved.status} />
                    </div>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-semibold">{selectedBusiness?.name}</p>
                    {selectedBusiness?.address && (
                      <p className="mt-1 text-slate-500">
                        {selectedBusiness.address}
                      </p>
                    )}
                    <p className="mt-3 text-slate-500">
                      Service start {invoiceDate(saved.issueDate)}
                    </p>
                    <p className="mt-1 text-slate-500">
                      Service end {invoiceDate(saved.dueDate)}
                    </p>
                    {(saved.paymentTerms || saved.client?.paymentTerms) && (
                      <p className="mt-2">
                        Terms: {saved.paymentTerms || saved.client.paymentTerms}
                      </p>
                    )}
                    {saved.paymentDueDate ? (
                      <p className="mt-1 font-semibold">
                        Payment due {invoiceDate(saved.paymentDueDate)}
                      </p>
                    ) : saved.paymentTermsFromEmail ? (
                      <p className="mt-1 text-slate-500">
                        Payment due date starts when emailed
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="my-6">
                  <InvoiceBillingDetails
                    client={saved.client}
                    location={saved.location}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[450px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                        <th className="py-3">Description</th>
                        <th className="py-3 text-right">Qty</th>
                        <th className="py-3 text-right">Rate</th>
                        <th className="py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saved.items?.map((it: any) => (
                        <tr key={it.id} className="border-b border-slate-100">
                          <td className="max-w-sm whitespace-pre-wrap break-words py-3 pr-4">
                            {it.description}
                          </td>
                          <td className="py-3 text-right">{it.quantity}</td>
                          <td className="py-3 text-right">{money(it.rate)}</td>
                          <td className="py-3 text-right font-medium">
                            {money(it.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="ml-auto mt-5 max-w-xs space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{money(saved.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Tax ({saved.taxRate}%)
                      {saved.taxInclusive ? " included" : ""}
                    </span>
                    <span>{money(saved.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-semibold">
                    <span>Total</span>
                    <span>{money(saved.total)}</span>
                  </div>
                </div>
                {saved.notes && (
                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <p className="text-xs uppercase text-slate-500">
                      Notes and terms
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {saved.notes}
                    </p>
                  </div>
                )}
              </article>
              <InvoicePayments
                invoice={saved}
                currency={selectedBusiness?.currencyCode}
                onChange={(i) => {
                  setSaved(i);
                  setForm(fromInvoice(i));
                  onSave();
                }}
              />
            </div>
          ) : null}
        </main>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
          <p className="self-center text-xs text-slate-500">
            {mode === "edit"
              ? "Changes remain local until saved."
              : "Payments determine the paid status automatically."}
          </p>
          <div className="flex gap-3">
            {mode === "preview" && canEdit && (
              <button
                disabled={busy}
                onClick={() => setMode("edit")}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
              >
                <ArrowLeft size={15} />
                Edit invoice
              </button>
            )}
            <button
              disabled={busy}
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm"
            >
              Close
            </button>
            {mode === "edit" && (
              <button
                disabled={
                  busy ||
                  loading ||
                  !!loadError ||
                  taxLoading ||
                  !!taxError ||
                  !form.clientId ||
                  !canEdit
                }
                onClick={save}
                className="flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Save size={16} />
                {busy ? "Saving…" : "Save invoice"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
