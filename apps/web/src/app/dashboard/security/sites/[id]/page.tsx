"use client";
import ShiftConfiguration from "@/components/locations/ShiftConfiguration";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, MapPin } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useBusiness } from "@/context/business-context";
import { useAuth } from "@/context/auth-context";
import AmericanDateInput from "@/components/invoices/AmericanDateInput";
import {
  ReferenceList,
  stringList,
} from "@/components/billing/BillingReferences";
const empty = {
  name: "",
  code: "",
  workOrder: "",
  billingPins: [] as string[],
  startDate: "",
  endDate: "",
  address: "",
  status: "ACTIVE",
  geoLat: "",
  geoLng: "",
  radius: 100,
  clientId: "",
};
export default function LocationDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { selectedBusiness } = useBusiness();
  const { user } = useAuth();
  const canEdit = ["BUSINESS_ADMIN", "SUPER_ADMIN"].includes(user?.role || "");
  const [form, setForm] = useState(empty),
    [clients, setClients] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const version = useRef(0);
  const load = async () => {
    const current = ++version.current;
    setLoading(true);
    setError("");
    if (!selectedBusiness?.id) {
      setLoading(false);
      return;
    }
    try {
      const options = { headers: { "x-business-id": selectedBusiness.id } };
      const [site, accounts] = await Promise.all([
        api.get(`/locations/${id}`, options),
        api.get("/clients", options),
      ]);
      if (current !== version.current) return;
      const data = site.data;
      setClients(accounts.data);
      setForm({
        name: data.name || "",
        code: data.code || "",
        workOrder: data.workOrder || "",
        billingPins: stringList(data.billingPins),
        startDate: data.startDate?.slice(0, 10) || "",
        endDate: data.endDate?.slice(0, 10) || "",
        address: data.address || "",
        status: data.status || "ACTIVE",
        geoLat: data.geoLat == null ? "" : String(data.geoLat),
        geoLng: data.geoLng == null ? "" : String(data.geoLng),
        radius: data.radius || 100,
        clientId: data.clientId || "",
      });
    } catch {
      if (current === version.current)
        setError("Unable to load this location. Please retry.");
    } finally {
      if (current === version.current) setLoading(false);
    }
  };
  useEffect(() => {
    setForm(empty);
    setClients([]);
    load();
    return () => {
      version.current++;
    };
  }, [id, selectedBusiness?.id]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !canEdit) return;
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      toast.error("Service end date must be on or after the start date.");
      return;
    }
    setSaving(true);
    try {
      await api.patch(
        `/locations/${id}`,
        {
          ...form,
          geoLat: form.geoLat === "" ? null : Number(form.geoLat),
          geoLng: form.geoLng === "" ? null : Number(form.geoLng),
          radius: Number(form.radius),
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          workOrder: form.workOrder || null,
        },
        { headers: { "x-business-id": selectedBusiness?.id || "" } },
      );
      toast.success("Location and billing references saved");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Unable to save location. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  };
  const input =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white";
  if (!selectedBusiness)
    return <p className="p-8">Select a business to view locations.</p>;
  if (loading) return <p className="p-8">Loading location…</p>;
  if (error)
    return (
      <div role="alert" className="p-8 text-red-700">
        {error}{" "}
        <button className="underline" onClick={load}>
          Retry
        </button>
      </div>
    );
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <button
        onClick={() => router.push("/dashboard/security/sites")}
        className="inline-flex gap-2 items-center text-sm text-slate-500"
      >
        <ArrowLeft size={16} />
        Back to locations
      </button>
      <header className="flex gap-4 items-center">
        <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
          <MapPin />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-teal-700">
            Client service location
          </p>
          <h1 className="text-3xl font-bold">{form.name}</h1>
          <p className="text-sm text-slate-500">
            Location details, work order and optional billing pins
          </p>
        </div>
      </header>
      <form onSubmit={save} className="space-y-6">
        <fieldset disabled={!canEdit || saving} className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-slate-800 dark:border-slate-700">
            <h2 className="font-semibold mb-4">Location details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label>
                Location name
                <input
                  className={input}
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Location code
                <input
                  className={input}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </label>
              <label>
                Client
                <select
                  className={input}
                  value={form.clientId}
                  onChange={(e) =>
                    setForm({ ...form, clientId: e.target.value })
                  }
                >
                  <option value="">No client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  className={input}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <label className="md:col-span-2">
                Service address
                <textarea
                  rows={2}
                  className={input}
                  required
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </label>
              <label>
                Service start date
                <AmericanDateInput
                  aria-label="Location service start date"
                  className={input}
                  value={form.startDate}
                  onChange={(startDate) => setForm({ ...form, startDate })}
                />
              </label>
              <label>
                Service end date
                <AmericanDateInput
                  aria-label="Location service end date"
                  className={input}
                  value={form.endDate}
                  onChange={(endDate) => setForm({ ...form, endDate })}
                />
              </label>
            </div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:bg-slate-800 dark:border-slate-700">
            <h2 className="font-semibold">Invoice references</h2>
            <label className="block">
              Work order
              <input
                className={input}
                maxLength={200}
                value={form.workOrder}
                onChange={(e) =>
                  setForm({ ...form, workOrder: e.target.value })
                }
                placeholder="e.g. WO-2026-104"
              />
            </label>
            <ReferenceList
              label="Billing pins (optional)"
              values={form.billingPins}
              onChange={(billingPins) => setForm({ ...form, billingPins })}
            />
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:bg-slate-800 dark:border-slate-700">
            <h2 className="font-semibold">Location coordinates</h2>
            <p className="text-sm text-slate-500 my-2">
              These location settings are separate from billing pins.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  className={input}
                  value={form.geoLat}
                  onChange={(e) => setForm({ ...form, geoLat: e.target.value })}
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  className={input}
                  value={form.geoLng}
                  onChange={(e) => setForm({ ...form, geoLng: e.target.value })}
                />
              </label>
              <label>
                Geofence radius (meters)
                <input
                  type="number"
                  min={1}
                  max={100000}
                  className={input}
                  value={form.radius}
                  onChange={(e) =>
                    setForm({ ...form, radius: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </section>
          {canEdit && (
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Saving…" : "Save location"}
            </button>
          )}
        </fieldset>
        {!canEdit && (
          <p className="text-sm text-slate-500">
            Only an administrator can edit this location.
          </p>
        )}
      </form>
      <ShiftConfiguration key={String(id)} locationId={String(id)} canEdit={canEdit} />
    </div>
  );
}
