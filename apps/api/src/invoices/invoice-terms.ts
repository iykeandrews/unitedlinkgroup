import { BadRequestException } from "@nestjs/common";
export function invoiceSentDay(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const value = (type: string) => parts.find((p) => p.type === type)!.value;
  return value("year") + "-" + value("month") + "-" + value("day");
}
export function clientPaymentTerms(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (/^due\s+on\s+receipt$/i.test(text))
    return { label: "Due on Receipt", days: 0 };
  const match = /^net\s*(\d{1,4})(?:\s+days?)?$/i.exec(text);
  if (!match || Number(match[1]) > 3650)
    throw new BadRequestException(
      "Set valid payment terms on the client record before emailing the invoice (for example Net 30 or Net 45).",
    );
  return { label: "Net " + Number(match[1]), days: Number(match[1]) };
}
export function firstEmailTerms(invoice: any, at: Date) {
  if (
    invoice.firstSentAt ||
    (!invoice.paymentTermsFromEmail && invoice.status !== "DRAFT")
  )
    return {};
  const terms = clientPaymentTerms(invoice.client?.paymentTerms);
  const date = new Date(invoiceSentDay(at) + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + terms.days);
  return {
    firstSentAt: at,
    paymentDueDate: date,
    paymentTerms: terms.label,
    paymentTermsFromEmail: true,
  };
}
