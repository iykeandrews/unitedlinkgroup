import { InvoiceLogo, loadInvoiceLogo } from "./invoice-logo";
import { billingAddress, billingList } from "./invoice-billing";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { invoiceTracking } from "./invoice-accounting";
import { invoiceSentDay } from "./invoice-terms";

export async function generateInvoicePdf({
  business,
  invoice,
  businessEmail,
  logo: suppliedLogo,
}: {
  business: any;
  invoice: any;
  businessEmail?: string;
  logo?: InvoiceLogo | null;
}): Promise<Buffer> {
  const doc = new jsPDF({ format: "letter" });
  const logo =
    suppliedLogo === undefined
      ? await loadInvoiceLogo(business?.logoUrl)
      : suppliedLogo;
  const tracked =
    invoice.balanceDue !== undefined ? invoice : invoiceTracking(invoice);
  const width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight();
  const left = 15,
    right = width - 15,
    contentWidth = right - left;
  const navy: [number, number, number] = [16, 42, 67],
    ink: [number, number, number] = [23, 50, 77];
  const muted: [number, number, number] = [97, 115, 134],
    line: [number, number, number] = [225, 232, 239];
  const currency = business?.currencyCode || "USD";
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      value || 0,
    );
  const day = (value: any) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  const wrapped = (value: any, maxWidth: number) =>
    doc.splitTextToSize(String(value || ""), maxWidth);
  const write = (
    value: any,
    x: number,
    y: number,
    size = 9,
    bold = false,
    color = ink,
    align: "left" | "right" = "left",
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(String(value || ""), x, y, { align });
  };
  const rule = (y: number) => {
    doc.setDrawColor(...line);
    doc.setLineWidth(0.25);
    doc.line(left, y, right, y);
  };
  doc.setFillColor(...navy);
  doc.rect(0, 0, width, 4.5, "F");
  if (logo) {
    const properties = doc.getImageProperties(logo.dataUrl);
    const scale = Math.min(88 / properties.width, 22 / properties.height);
    const w = properties.width * scale,
      h = properties.height * scale;
    doc.addImage(logo.dataUrl, logo.format, left, 24 - h / 2, w, h);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...navy);
    doc.text(wrapped(business?.name || "Business", 108), left, 25);
  }
  write("INVOICE", right, 25, 27, true, navy, "right");
  doc.setFontSize(9);
  const numberLines = wrapped(invoice.invoiceNumber, 70);
  doc.setTextColor(...muted);
  doc.text(numberLines, right, 33, { align: "right" });
  let y = Math.max(47, 35 + numberLines.length * 4);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ink);
  const nameLines = wrapped(business?.name || "Business", 105);
  doc.text(nameLines, left, y);
  let addressY = y + nameLines.length * 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  for (const value of [
    business?.address,
    [business?.city, business?.state, business?.zip].filter(Boolean).join(", "),
    business?.mobile,
    businessEmail,
  ]) {
    if (!value) continue;
    const lines = wrapped(value, 106);
    doc.text(lines, left, addressY);
    addressY += lines.length * 4.6;
  }
  let metaY = y;
  const paymentTerms =
    invoice.paymentTerms ||
    (invoice.paymentTermsFromEmail ? invoice.client?.paymentTerms : null);
  for (const [label, value] of [
    ["SERVICE START", day(invoice.issueDate)],
    ["SERVICE END", day(invoice.dueDate)],
    ...(invoice.firstSentAt
      ? [["EMAILED", day(invoiceSentDay(new Date(invoice.firstSentAt)))]]
      : []),
    ...(paymentTerms ? [["PAYMENT TERMS", paymentTerms]] : []),
    ...(invoice.paymentDueDate
      ? [["PAYMENT DUE", day(invoice.paymentDueDate)]]
      : invoice.paymentTermsFromEmail
        ? [["PAYMENT DUE", "Calculated when emailed"]]
        : []),
  ]) {
    write(label, right - 72, metaY, 7, false, muted);
    write(value, right, metaY, 9, true, ink, "right");
    metaY += 8;
  }
  y = Math.max(addressY, metaY) + 5;
  rule(y);
  y += 9;
  const location = invoice.location,
    siteX = right - 76;
  write("BILL TO", left, y, 7.5, true, muted);
  if (location) write("SERVICE LOCATION", siteX, y, 7.5, true, muted);
  const billingRows = [
    invoice.client?.name,
    billingAddress(invoice.client),
    invoice.client?.billingContactEmail || invoice.client?.email,
  ]
    .filter(Boolean)
    .map((value) => [String(value)]);
  autoTable(doc, {
    startY: y + 5,
    body: billingRows,
    theme: "plain",
    styles: {
      fontSize: 9,
      textColor: muted,
      cellPadding: { top: 0, bottom: 3, left: 0, right: 0 },
      overflow: "linebreak",
    },
    margin: {
      left,
      right: location ? width - left - 100 : 15,
      top: 22,
      bottom: 22,
    },
    didParseCell: (cell) => {
      if (cell.row.index === 0) {
        cell.cell.styles.fontStyle = "bold";
        cell.cell.styles.fontSize = 12;
        cell.cell.styles.textColor = navy;
      }
    },
  });
  const billY = (doc as any).lastAutoTable.finalY + 4;
  const billEndPage = doc.getNumberOfPages();
  let siteY = billEndPage > 1 ? billY + 5 : y + 8;
  if (location) {
    const siteWidth = right - siteX;
    // A fixed single column is essential here: all-colSpan rows let autoTable
    // infer a wider table when a site has no work order or billing pins.
    autoTable(doc, {
      startY: siteY - 3,
      tableWidth: siteWidth,
      body: [
        [location.name || "Service site"],
        ...(location.address ? [[location.address]] : []),
      ],
      theme: "plain",
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 1, bottom: 2, left: 0, right: 2 },
        overflow: "linebreak",
        textColor: muted,
        cellWidth: siteWidth,
      },
      columnStyles: { 0: { cellWidth: siteWidth } },
      margin: { left: siteX, right: 15, top: 22, bottom: 22 },
      didParseCell: ({ row, cell }) => {
        if (row.index === 0) {
          cell.styles.fontStyle = "bold";
          cell.styles.textColor = navy;
        }
      },
    });
    const referenceRows = [
      ...(location.workOrder ? [["Work order", location.workOrder]] : []),
      ...(billingList(location.billingPins).length
        ? [["Billing pins", billingList(location.billingPins).join(", ")]]
        : []),
    ];
    if (referenceRows.length) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 1,
        tableWidth: siteWidth,
        body: referenceRows,
        theme: "plain",
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 1, bottom: 2, left: 0, right: 2 },
          overflow: "linebreak",
          textColor: muted,
        },
        columnStyles: {
          0: { cellWidth: 24, fontStyle: "bold" },
          1: { cellWidth: siteWidth - 24 },
        },
        margin: { left: siteX, right: 15, top: 22, bottom: 22 },
      });
    }
    siteY = (doc as any).lastAutoTable.finalY + 4;
  }
  y =
    (doc.getNumberOfPages() > billEndPage ? siteY : Math.max(billY, siteY)) + 7;
  autoTable(doc, {
    startY: y,
    head: [["SERVICE DESCRIPTION", "QUANTITY", "RATE", "AMOUNT"]],
    body: (invoice.items || []).map((item: any) => [
      item.description,
      String(item.quantity),
      money(item.rate),
      money(item.amount ?? item.quantity * item.rate),
    ]),
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 4,
      overflow: "linebreak",
      textColor: ink,
      lineColor: line,
      lineWidth: { bottom: 0.2 },
    },
    headStyles: {
      fillColor: navy,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: contentWidth - 83 },
      1: { cellWidth: 25, halign: "right" },
      2: { cellWidth: 27, halign: "right" },
      3: { cellWidth: 31, halign: "right" },
    },
    margin: { left, right: 15, top: 22, bottom: 22 },
  });
  y = (doc as any).lastAutoTable.finalY + 13;
  if (y + 65 > height - 24) {
    doc.addPage();
    y = 28;
  }
  const summaryX = right - 73;
  write("SERVICE & PAYMENT NOTES", left, y, 7.5, true, muted);
  doc.setFontSize(9);
  const note = wrapped(
    "Please include the invoice number with your remittance. Payment terms are per your service agreement.",
    100,
  );
  doc.setTextColor(...muted);
  doc.text(note, left, y + 8);
  write("Billing questions? Contact our team.", left, y + 29, 9, false, muted);
  if (businessEmail) {
    doc.setFontSize(9);
    doc.text(wrapped(businessEmail, 100), left, y + 35);
  }
  let totalY = y;
  for (const [label, amount] of [
    ["Subtotal", invoice.subtotal],
    [
      `Tax (${invoice.taxRate || 0}%)${invoice.taxInclusive ? " included" : ""}`,
      invoice.taxAmount,
    ],
    ["Invoice total", invoice.total],
    ["Payments recorded", tracked.amountPaid],
  ] as [string, number][]) {
    write(label, summaryX, totalY, 9, false, muted);
    write(
      money(amount),
      right,
      totalY,
      10,
      label === "Invoice total",
      ink,
      "right",
    );
    totalY += 8;
  }
  doc.setFillColor(242, 246, 250);
  doc.roundedRect(summaryX - 4, totalY + 1, 77, 16, 2, 2, "F");
  write("BALANCE DUE", summaryX, totalY + 11, 7.5, true, navy);
  write(
    money(tracked.balanceDue),
    right - 3,
    totalY + 11,
    17,
    true,
    navy,
    "right",
  );
  y = totalY + 29;
  if (invoice.notes) {
    autoTable(doc, {
      startY: y,
      body: [["Additional notes", invoice.notes]],
      theme: "plain",
      styles: {
        fontSize: 9,
        overflow: "linebreak",
        textColor: muted,
        cellPadding: 2,
      },
      columnStyles: { 0: { cellWidth: 32, fontStyle: "bold" } },
      margin: { left, right: 15, top: 22, bottom: 22 },
    });
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    rule(height - 19);
    if (page > 1) {
      write(business?.name || "Invoice", left, 12, 8, true, muted);
      write(invoice.invoiceNumber, right, 12, 8, false, muted, "right");
    }
    write("Thank you for your business.", left, height - 12, 8, false, muted);
    write(
      `${invoice.invoiceNumber} | ${page} / ${pages}`,
      right,
      height - 12,
      8,
      false,
      muted,
      "right",
    );
  }
  return Buffer.from(doc.output("arraybuffer"));
}
