import { billingList } from "./invoice-billing";
const escape = (value: unknown) =>
  String(value || "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function invoiceEmail({
  business,
  invoice,
  balanceDue,
  hasLogo,
}: {
  business: any;
  invoice: any;
  balanceDue: number;
  hasLogo: boolean;
}) {
  const businessName = business?.name || "Business";
  const address = [
    business?.address,
    [business?.city, business?.state, business?.zip].filter(Boolean).join(", "),
  ].filter(Boolean);
  const day = (date: any) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  const period = `${day(invoice.issueDate)} - ${day(invoice.dueDate)}`;
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: business?.currencyCode || "USD",
  }).format(balanceDue);
  const pins = billingList(invoice.location?.billingPins);
  const contact =
    invoice.client?.billingContactName ||
    invoice.client?.name ||
    "Accounts Payable";
  const referenceRows = [
    invoice.location?.name && `Service location: ${invoice.location.name}`,
    invoice.location?.workOrder && `Work order: ${invoice.location.workOrder}`,
    pins.length && `Billing pins: ${pins.join(", ")}`,
  ].filter(Boolean);
  const html = `<div style="margin:0;padding:28px 12px;background:#edf2f7;font-family:Arial,Helvetica,sans-serif;color:#17324d"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;margin:0 auto;background:#ffffff;border-collapse:collapse"><tr><td style="padding:28px 32px;background:#102a43;border-bottom:4px solid #c8a45c">${hasLogo ? '<div style="display:inline-block;background:#ffffff;border-radius:6px;padding:12px"><img src="cid:business-logo@unitedlink-invoice" alt="Business logo" width="240" style="display:block;width:240px;max-width:100%;height:auto;border:0" /></div>' : `<div style="font-size:22px;font-weight:bold;color:#ffffff">${escape(businessName)}</div>`}</td></tr><tr><td style="padding:32px"><p style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#617386;margin:0">YOUR SERVICE INVOICE</p><h1 style="font-size:26px;line-height:1.3;margin:12px 0 22px;color:#102a43">Security services invoice</h1><p style="font-size:15px;line-height:1.7">Hello ${escape(contact)},</p><p style="font-size:15px;line-height:1.7">Please find your invoice for the service period below attached. Thank you for choosing ${escape(businessName)}.</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#f2f6fa;margin:24px 0;border-collapse:collapse"><tr><td style="padding:20px;font-size:11px;color:#617386">INVOICE<br><strong style="display:block;font-size:15px;color:#102a43;margin-top:8px">${escape(invoice.invoiceNumber)}</strong></td><td style="padding:20px;text-align:right;font-size:11px;color:#617386">BALANCE DUE<br><strong style="display:block;font-size:24px;color:#102a43;margin-top:6px">${escape(total)}</strong></td></tr><tr><td colspan="2" style="padding:0 20px 20px;font-size:13px;line-height:1.8;color:#617386">Service period: <strong>${escape(period)}</strong>${referenceRows.map((row) => `<br>${escape(row)}`).join("")}</td></tr></table><p style="font-size:14px;line-height:1.7">The attached PDF includes your service breakdown, billing references, and recorded payments. Please reference <strong>${escape(invoice.invoiceNumber)}</strong> with your remittance.</p><p style="font-size:14px;line-height:1.7">For billing questions, reply to this email and our team will be happy to help.</p><p style="font-size:14px;line-height:1.7;margin:24px 0 0">Thank you,<br><strong>${escape(businessName)}<br>Billing Team</strong></p></td></tr><tr><td style="padding:22px 32px;border-top:1px solid #e1e8ef;color:#617386;font-size:12px;line-height:1.8"><strong style="color:#17324d">${escape(businessName)}</strong>${address.map((part) => `<br>${escape(part)}`).join("")}${business?.mobile ? `<br>${escape(business.mobile)}` : ""}</td></tr></table></div>`;
  const text = [
    `${businessName} - Invoice ${invoice.invoiceNumber}`,
    `Hello ${contact},`,
    "Please find your invoice attached as a PDF.",
    `Service period: ${period}`,
    ...referenceRows,
    `Balance due: ${total}`,
    `Please reference ${invoice.invoiceNumber} with your payment.`,
    "For billing questions, reply to this email.",
    businessName,
    ...address,
    business?.mobile,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { html, text };
}
