import { billingAddress, billingList } from "./invoice-billing";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { invoiceTracking } from "./invoice-accounting";
export async function generateInvoicePdf({
  business,
  invoice,
  businessEmail,
}: {
  business: any;
  invoice: any;
  businessEmail?: string;
}): Promise<Buffer> {
  const doc = new jsPDF();
  const tracked =
    invoice.balanceDue !== undefined ? invoice : invoiceTracking(invoice);
  const currency = business?.currencyCode || "USD";
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      n || 0,
    );
  const day = (value: any) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  const text = (value: any, width: number) =>
    doc.splitTextToSize(String(value || ""), width);
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("INVOICE", 14, 16);
  doc.setFontSize(10);
  doc.text(text(business?.name || "Invoice", 180), 14, 25);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  let y = 47;
  for (const line of [
    business?.address,
    [business?.city, business?.state, business?.zip].filter(Boolean).join(", "),
    businessEmail,
    business?.mobile,
  ].filter(Boolean)) {
    const lines = text(line, 110);
    doc.text(lines, 14, y);
    y += lines.length * 5;
  }
  doc.text(text(invoice.invoiceNumber, 62), 134, 47);
  doc.text(`Service start: ${day(invoice.issueDate)}`, 134, 59);
  doc.text(`Service end: ${day(invoice.dueDate)}`, 134, 66);
  doc.text(`Status: ${tracked.status.replace(/_/g, " ")}`, 134, 73);
  y = Math.max(y + 9, 88);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 14, y);
  doc.setFont("helvetica", "normal");
  y += 7;
  for (const line of [
    invoice.client?.name,
    billingAddress(invoice.client),
    invoice.client?.billingContactEmail || invoice.client?.email,
    invoice.location?.name ? `Site: ${invoice.location.name}` : null,
  ].filter(Boolean)) {
    const lines = text(line, 180);
    if (y + lines.length * 5 > 260) { doc.addPage(); y = 24; }
    doc.text(lines, 14, y);
    y += lines.length * 5;
  }
  const location = invoice.location;
  if (location) {
    const rows = [["Service location", [location.name, location.address].filter(Boolean).join("\n")], ["Work order", location.workOrder || "Not entered"], ...(billingList(location.billingPins).length ? [["Billing pins", billingList(location.billingPins).join(", ")]] : [])];
    autoTable(doc, { startY: y + 5, body: rows, theme: "plain", styles: { fontSize: 9, overflow: "linebreak" }, columnStyles: { 0: { cellWidth: 32, fontStyle: "bold" } }, margin: { top: 18, bottom: 20 } });
    y = (doc as any).lastAutoTable.finalY;
  }
  autoTable(doc, {
    startY: y + 7,
    head: [["Description", "Quantity", "Rate", "Amount"]],
    body: (invoice.items || []).map((item: any) => [
      item.description,
      String(item.quantity),
      money(item.rate),
      money(item.amount ?? item.quantity * item.rate),
    ]),
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 105 },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    margin: { top: 18, bottom: 20 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 228) {
    doc.addPage();
    y = 24;
  }
  doc.setFontSize(10);
  for (const [label, value] of [
    ["Subtotal", invoice.subtotal],
    [
      `Tax (${invoice.taxRate}%)${invoice.taxInclusive ? " included" : ""}`,
      invoice.taxAmount,
    ],
    ["Invoice total", invoice.total],
    ["Payments recorded", tracked.amountPaid],
    ["Balance due", tracked.balanceDue],
  ] as [string, number][]) {
    doc.text(label, 115, y);
    doc.text(money(value), 196, y, { align: "right" });
    y += 7;
  }
  if (invoice.notes) {
    autoTable(doc, {
      startY: y + 7,
      body: [["Notes & terms", invoice.notes]],
      theme: "plain",
      styles: { fontSize: 9, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 32 } },
      margin: { top: 18, bottom: 20 },
    });
  }
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(`${invoice.invoiceNumber} | ${p} / ${pages}`, 14, 286);
    doc.text("Thank you for your business", 196, 286, { align: "right" });
  }
  return Buffer.from(doc.output("arraybuffer"));
}
