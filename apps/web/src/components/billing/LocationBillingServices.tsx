"use client";
export const SERVICE_OPTIONS = [
  ["ARMED_SPO", "Armed special police officer"],
  ["UNARMED_SPO", "Unarmed special police officer"],
  ["SECURITY_OFFICER", "Security officer"],
  ["SECURITY_GUARD", "Security guard"],
  ["ARMED_SECURITY_GUARD", "Armed security guard"],
  ["PRIVATE_DETECTIVE", "Private detective"],
  ["OTHER", "Others"],
] as const;
export type ServiceRate = {
  type: string;
  description: string;
  rate: string | number;
};
export function readBillingServices(value: any): ServiceRate[] {
  try {
    const rows = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
export function servicePayload(rows: ServiceRate[]) {
  const seen = new Set<string>();
  return rows.map((row) => {
    const description =
      row.type === "OTHER"
        ? row.description.trim()
        : SERVICE_OPTIONS.find((o) => o[0] === row.type)?.[1] || "";
    if (!description || description.length > 200)
      throw new Error("Select a service and enter its description.");
    const rate = Number(row.rate);
    if (
      String(row.rate).trim() === "" ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      rate > 1000000 ||
      Math.abs(Math.round(rate * 100) / 100 - rate) > 0.000001
    )
      throw new Error(
        "Enter an hourly billing rate with up to two decimal places for every service.",
      );
    if (seen.has(description.toLowerCase()))
      throw new Error("Each service description must be unique.");
    seen.add(description.toLowerCase());
    return { type: row.type, description, rate };
  });
}
export function serviceRateFor(services: ServiceRate[], description: string) {
  return (
    services.find(
      (s) => s.description.toLowerCase() === description.trim().toLowerCase(),
    )?.rate ?? ""
  );
}
export default function LocationBillingServices({
  value,
  onChange,
  note,
  onNoteChange,
  required = false,
  currency = "USD",
}: {
  value: ServiceRate[];
  onChange: (rows: ServiceRate[]) => void;
  note: string;
  onNoteChange: (note: string) => void;
  required?: boolean;
  currency?: string;
}) {
  const field =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white";
  const update = (i: number, key: string, next: any) =>
    onChange(
      value.map((row, index) => (index === i ? { ...row, [key]: next } : row)),
    );
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 space-y-4">
      <h2 className="font-semibold">
        Client services and hourly billing rates{required ? " *" : ""}
      </h2>
      <p className="text-sm text-slate-500">
        These rates fill invoice line items for this location. Employee pay
        rates are managed separately.
      </p>
      {value.map((row, i) => (
        <div
          key={i}
          className="grid gap-3 sm:grid-cols-[1fr_160px_auto] border-b pb-4"
        >
          <div>
            <label className="text-sm">
              Service type
              <select
                required
                className={field}
                value={row.type}
                onChange={(e) =>
                  onChange(
                    value.map((s, n) =>
                      n === i
                        ? {
                            ...s,
                            type: e.target.value,
                            description:
                              e.target.value === "OTHER"
                                ? ""
                                : SERVICE_OPTIONS.find(
                                    (o) => o[0] === e.target.value,
                                  )?.[1] || "",
                          }
                        : s,
                    ),
                  )
                }
              >
                <option value="">Select service</option>
                {SERVICE_OPTIONS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {row.type === "OTHER" && (
              <label className="block text-sm mt-2">
                Custom service description
                <input
                  required
                  maxLength={200}
                  className={field}
                  value={row.description}
                  onChange={(e) => update(i, "description", e.target.value)}
                />
              </label>
            )}
          </div>
          <label className="text-sm">
            Hourly rate ({currency})
            <input
              required
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              className={field}
              value={row.rate}
              onChange={(e) => update(i, "rate", e.target.value)}
            />
          </label>
          <button
            type="button"
            className="self-start mt-7 text-sm text-rose-600"
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={value.length >= 50}
        className="text-sm font-semibold text-teal-700"
        onClick={() =>
          onChange([...value, { type: "", description: "", rate: "" }])
        }
      >
        + Add service
      </button>
      {!value.length && (
        <p className="text-sm text-slate-500">
          {required
            ? "Add at least one service and its billing rate."
            : "No billing services configured yet."}
        </p>
      )}
      <label className="block text-sm">
        Client request / change note (optional)
        <textarea
          maxLength={1000}
          className={field}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="For example: Client requested armed coverage starting this month"
        />
      </label>
    </section>
  );
}
export function BillingServicesHistory({
  entries,
  currency = "USD",
}: {
  entries: any[];
  currency?: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 p-6 dark:border-slate-700 space-y-4">
      <h2 className="font-semibold">Service and rate history</h2>
      {!entries.length && (
        <p className="text-sm text-slate-500">
          Service additions and rate changes will appear here after saving.
        </p>
      )}
      {entries.map((entry) => (
        <article key={entry.id} className="border-b pb-4 last:border-0 text-sm">
          <p className="font-medium">
            {new Date(entry.createdAt).toLocaleString("en-US", {
              timeZone: "America/New_York",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })}{" "}
            · {entry.actor || "Administrator"}
          </p>
          {(entry.changes || []).map((change: any, i: number) => (
            <p key={i} className="mt-1">
              {change.description}:{" "}
              {(
                {
                  SERVICE_ADDED: "Service added",
                  SERVICE_REMOVED: "Service removed",
                  RATE_INCREASED: "Rate increased",
                  RATE_DECREASED: "Rate decreased",
                } as any
              )[change.action] || change.action}{" "}
              ·{" "}
              {change.previousRate == null
                ? ""
                : currency +
                  " " +
                  Number(change.previousRate).toFixed(2) +
                  "/hr → "}
              {change.rate == null
                ? "Removed"
                : currency + " " + Number(change.rate).toFixed(2) + "/hr"}
            </p>
          ))}
          {entry.note && (
            <p className="mt-2 text-slate-500">
              Client request / note: {entry.note}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
