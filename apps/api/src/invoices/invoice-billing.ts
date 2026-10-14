export function billingList(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((item) => typeof item === "string");
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
export function billingAddress(client: any): string {
  if (!client) return "";
  if (client.billingAddressSameAsOffice === false)
    return client.billingAddress || "";
  return [
    client.street || client.address,
    [client.city, client.state, client.zip].filter(Boolean).join(", "),
    client.country,
  ]
    .filter(Boolean)
    .join("\n");
}
export function invoiceRecipients(client: any) {
  const to = String(client?.billingContactEmail || client?.email || "")
    .trim()
    .toLowerCase();
  const cc = [
    ...new Set(
      [
        client?.billingContactEmail2,
        client?.billingContactEmail3,
        ...billingList(client?.ccEmails),
      ]
        .filter(Boolean)
        .map((email) => String(email).trim().toLowerCase()),
    ),
  ].filter((email) => email !== to);
  return { to, cc };
}
