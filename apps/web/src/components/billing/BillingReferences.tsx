"use client";
export function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
export function clientAddress(client: any) {
  if (!client) return "";
  return client.billingAddressSameAsOffice === false
    ? client.billingAddress || ""
    : [
        client.street || client.address,
        [client.city, client.state, client.zip].filter(Boolean).join(", "),
        client.country,
      ]
        .filter(Boolean)
        .join("\n");
}
export function clientRecipients(client: any) {
  const to = client?.billingContactEmail || client?.email || "";
  const cc = Array.from(
    new Set<string>(
      [
        client?.email,
        client?.billingContactEmail2,
        client?.billingContactEmail3,
        ...stringList(client?.ccEmails),
        'invoice@unitedlinksecurity.com',
      ]
        .filter(Boolean)
        .map((email: string) => email.trim().toLowerCase()),
    ),
  ).filter((email) => email !== to.trim().toLowerCase());
  return { to, cc };
}
export function ReferenceList({
  label,
  values,
  onChange,
  email = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  email?: boolean;
}) {
  return (
    <section className="col-span-full rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {label}
        </h3>
        <button
          type="button"
          disabled={values.length >= 50}
          onClick={() => onChange([...values, ""])}
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add {email ? "CC email" : "billing pin"}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        {email
          ? "Invoices go to the billing and contact emails, with all additional recipients and invoice@unitedlinksecurity.com copied. Duplicate recipients are removed."
          : "Reference codes shown on invoices for this location. These pins are used only for billing and never for clock-in or clock-out."}
      </p>
      {!values.length && (
        <p className="text-sm text-slate-500">
          No {email ? "additional CC recipients" : "billing pins"} added.
        </p>
      )}
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            aria-label={`${label} ${index + 1}`}
            type={email ? "email" : "text"}
            required
            maxLength={email ? 254 : 100}
            value={value}
            onChange={(event) =>
              onChange(
                values.map((entry, i) =>
                  i === index ? event.target.value : entry,
                ),
              )
            }
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:bg-slate-900 dark:text-white"
            placeholder={email ? "accounts@example.com" : "e.g. PIN-1042"}
          />
          <button
            type="button"
            aria-label={`Remove ${email ? "CC email" : "billing pin"} ${index + 1}`}
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            className="rounded-lg px-3 py-2 text-sm text-red-700"
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}
export function InvoiceBillingDetails({
  client,
  location,
}: {
  client: any;
  location?: any;
}) {
  const { to, cc } = clientRecipients(client);
  return (
    <section className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-2 dark:border-teal-900 dark:bg-slate-900">
      <h3 className="font-semibold">Billing details</h3>
      <p className="font-medium">{client?.name || "Select a client"}</p>
      <p className="whitespace-pre-line text-sm">
        {clientAddress(client) ||
          "No billing address saved. Update the client before sending."}
      </p>
      <p className="text-sm break-words">
        <strong>To:</strong> {to || "No billing email saved"}
      </p>
      {cc.length > 0 && (
        <p className="text-sm break-words">
          <strong>CC:</strong> {cc.join(", ")}
        </p>
      )}
      {location && (
        <>
          <p className="text-sm">
            <strong>Location:</strong> {location.name} · {location.address}
          </p>
          <p className="text-sm">
            <strong>Work order:</strong> {location.workOrder || "Not entered"}
          </p>
          {stringList(location.billingPins).length > 0 && (
            <p className="text-sm break-words">
              <strong>Billing pins:</strong>{" "}
              {stringList(location.billingPins).join(", ")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
