"use client";
import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { OFFICER_CATEGORIES } from "../../lib/officer-categories";
const emptyShift = {
  id: "",
  name: "",
  officerCategory: "SO",
  classification: "MORNING",
  startTime: "07:00",
  endTime: "15:00",
  requiredOfficers: 1,
  isActive: true,
  pinId: "",
};
const emptyPin = {
  id: "",
  label: "",
  billingPin: "",
  isActive: true,
  allowCrossCategory: false,
};
export default function ShiftConfiguration({
  locationId,
  canEdit,
}: {
  locationId: string;
  canEdit: boolean;
}) {
  const [data, setData] = useState<any>(null),
    [shift, setShift] = useState(emptyShift),
    [pin, setPin] = useState(emptyPin),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const res = await api.get(
        `/locations/${locationId}/shift-configurations`,
      );
      setData(res.data);
      setError("");
    } catch (e: any) {
      setError(
        e.response?.data?.message || "Unable to load shift configuration",
      );
    }
  }, [locationId]);
  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  async function save(kind: "shift" | "pin") {
    setBusy(true);
    try {
      await api.post(
        `/locations/${locationId}/shift-configurations${kind === "pin" ? "/pins" : ""}`,
        kind === "pin" ? pin : shift,
      );
      kind === "pin" ? setPin(emptyPin) : setShift(emptyShift);
      await load();
      toast.success("Configuration saved");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  const input =
    "mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-900";
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 space-y-5">
      <h2 className="text-xl font-semibold">
        Shift Configuration and PIN Management
      </h2>
      <p className="text-sm text-slate-500">
        Uses this location’s existing billing PINs for the client’s app only.
        These PINs do not control clock-in or clock-out in this app. Configured
        times match the recorded schedule, including overnight shifts.
      </p>
      {error && (
        <p role="alert" className="text-red-600">
          {error}{" "}
          <button type="button" onClick={load} className="underline">
            Retry
          </button>
        </p>
      )}
      {!data && !error && <p>Loading configuration…</p>}
      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Shift",
                    "Officer category",
                    "Times / required",
                    "Client PIN",
                    "Status",
                    "",
                  ].map((h, i) => (
                    <th key={i} className="p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.configurations.map((c: any) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">
                      {c.name}
                      <br />
                      <span className="text-xs text-slate-500">
                        {c.classification}
                      </span>
                    </td>
                    <td className="p-2">
                      {OFFICER_CATEGORIES[c.officerCategory]}
                    </td>
                    <td className="p-2">
                      {c.startTime}–{c.endTime}
                      {c.endTime <= c.startTime ? " (+1 day)" : ""}
                      <br />
                      {c.requiredOfficers} officer(s)
                    </td>
                    <td className="p-2">
                      {c.pin?.billingPin || "Not assigned"}
                      {c.pin && !c.pin.isActive ? " (inactive)" : ""}
                    </td>
                    <td className="p-2">
                      {c.isActive ? "Active" : "Inactive"}
                    </td>
                    <td>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            setShift({
                              ...emptyShift,
                              ...c,
                              pinId: c.pinId || "",
                            })
                          }
                          className="font-semibold text-indigo-600"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.configurations.length && (
              <p className="py-4 text-sm text-slate-500">
                No configured shifts yet. Existing schedules are unchanged.
              </p>
            )}
          </div>
          {canEdit && (
            <fieldset
              disabled={busy}
              className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900 space-y-3"
            >
              <h3 className="font-semibold">
                {shift.id
                  ? "Edit shift configuration"
                  : "Add shift configuration"}
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                <label>
                  Shift name
                  <input
                    className={input}
                    value={shift.name}
                    onChange={(e) =>
                      setShift({ ...shift, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Officer category
                  <select
                    className={input}
                    value={shift.officerCategory}
                    onChange={(e) =>
                      setShift({ ...shift, officerCategory: e.target.value })
                    }
                  >
                    {Object.entries(OFFICER_CATEGORIES).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Classification
                  <select
                    className={input}
                    value={shift.classification}
                    onChange={(e) =>
                      setShift({ ...shift, classification: e.target.value })
                    }
                  >
                    {["MORNING", "AFTERNOON", "OVERNIGHT"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Start time
                  <input
                    type="time"
                    className={input}
                    value={shift.startTime}
                    onChange={(e) =>
                      setShift({ ...shift, startTime: e.target.value })
                    }
                  />
                </label>
                <label>
                  End time
                  <input
                    type="time"
                    className={input}
                    value={shift.endTime}
                    onChange={(e) =>
                      setShift({ ...shift, endTime: e.target.value })
                    }
                  />
                </label>
                <label>
                  Officers required
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className={input}
                    value={shift.requiredOfficers}
                    onChange={(e) =>
                      setShift({
                        ...shift,
                        requiredOfficers: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Assigned billing PIN
                  <select
                    className={input}
                    value={shift.pinId}
                    onChange={(e) =>
                      setShift({ ...shift, pinId: e.target.value })
                    }
                  >
                    <option value="">No PIN / unlink current PIN</option>
                    {data.pins.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.billingPin} — {p.label}
                        {p.isActive ? "" : " (inactive)"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={shift.isActive}
                  onChange={(e) =>
                    setShift({ ...shift, isActive: e.target.checked })
                  }
                />
                Active shift configuration
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => save("shift")}
                  className="rounded bg-indigo-700 px-4 py-2 text-white"
                >
                  Save shift configuration
                </button>
                <button type="button" onClick={() => setShift(emptyShift)}>
                  Clear
                </button>
              </div>
            </fieldset>
          )}
          <h3 className="font-semibold">Existing billing PIN assignments</h3>
          <p className="text-sm text-slate-500">
            Link the same PIN record to several shift configurations to share
            it. To add a PIN, save it in the location’s Billing PINs section
            first, then refresh this section.
          </p>
          <button
            type="button"
            onClick={load}
            className="text-sm font-semibold text-indigo-600"
          >
            Refresh billing PINs
          </button>
          <div className="space-y-2">
            {data.pins.map((p: any) => (
              <div
                key={p.id}
                className="flex flex-wrap justify-between gap-3 rounded border p-3"
              >
                <div>
                  <strong>
                    {p.billingPin} — {p.label}
                  </strong>
                  <p className="text-sm text-slate-500">
                    {p.isActive ? "Active" : "Inactive"} ·{" "}
                    {p.configurations.length} linked shifts ·{" "}
                    {p.allowCrossCategory
                      ? "Category sharing allowed"
                      : "Separate officer categories"}
                  </p>
                  <p className="text-xs">
                    {p.configurations.map((c: any) => c.name).join(", ") ||
                      "No linked shifts"}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setPin({ ...emptyPin, ...p })}
                    className="font-semibold text-indigo-600"
                  >
                    Edit PIN settings
                  </button>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <fieldset
              disabled={busy}
              className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900 space-y-3"
            >
              <h3 className="font-semibold">
                {pin.id ? "Edit PIN settings" : "Use an existing billing PIN"}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  Billing PIN
                  <select
                    className={input}
                    disabled={!!pin.id}
                    value={pin.billingPin}
                    onChange={(e) =>
                      setPin({ ...pin, billingPin: e.target.value })
                    }
                  >
                    <option value="">Select billing PIN</option>
                    {data.billingPins.map((p: string) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  PIN label
                  <input
                    className={input}
                    value={pin.label}
                    onChange={(e) => setPin({ ...pin, label: e.target.value })}
                  />
                </label>
              </div>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={pin.isActive}
                  onChange={(e) =>
                    setPin({ ...pin, isActive: e.target.checked })
                  }
                />
                Active PIN for every linked shift
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={pin.allowCrossCategory}
                  onChange={(e) =>
                    setPin({ ...pin, allowCrossCategory: e.target.checked })
                  }
                />
                Explicitly allow this PIN to be shared across officer categories
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => save("pin")}
                  className="rounded bg-indigo-700 px-4 py-2 text-white"
                >
                  Save PIN settings
                </button>
                <button type="button" onClick={() => setPin(emptyPin)}>
                  Clear
                </button>
              </div>
            </fieldset>
          )}
          <details>
            <summary className="cursor-pointer font-semibold">
              Configuration activity
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {data.audits.map((a: any) => (
                <li key={a.id}>
                  {new Date(a.createdAt).toLocaleString("en-US")} —{" "}
                  {a.action.replaceAll("_", " ")}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
