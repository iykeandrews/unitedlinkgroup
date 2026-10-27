import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FinanceSummary } from "./finance-summary";
import { InvoiceLogo } from "../invoices/invoice-logo";
import { displayReportDate } from "../time-tracking/timesheet-report";

export function financeSummaryPdf(
  report: FinanceSummary,
  logo: InvoiceLogo | null,
) {
  const doc = new jsPDF({ orientation: "portrait", format: "letter" }),
    width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight();
  const cash = (n: number) =>
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const header = (subtitle: string) => {
    if (logo)
      doc.addImage(logo.bytes, logo.format, 12, 9, 40, 15, undefined, "FAST");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(20, 46, 68);
    doc.text(report.business.name, logo ? 57 : 12, 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize(report.business.address, width - (logo ? 69 : 24)),
      logo ? 57 : 12,
      20,
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(report.title, 12, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      displayReportDate(report.from) + " - " + displayReportDate(report.to),
      12,
      43,
    );
    doc.setFontSize(9);
    doc.text(subtitle, 12, 49);
    doc.setDrawColor(210, 222, 230);
    doc.line(12, 53, width - 12, 53);
  };
  const table = (head: string[], body: any[][], startY = 60, foot?: any[][]) =>
    autoTable(doc, {
      head: [head],
      body: body.length
        ? body
        : [head.map((_, i) => (i ? "" : "No records in this period"))],
      foot,
      showFoot: "lastPage",
      rowPageBreak: "avoid",
      tableWidth: width - 24,
      startY,
      margin: { left: 12, right: 12, top: 58, bottom: 17 },
      styles: {
        font: "helvetica",
        fontSize: 10.5,
        cellPadding: 1.8,
        overflow: "linebreak",
        textColor: [32, 48, 64],
      },
      columnStyles:
        head[0] === "Worker" && head.length === 6
          ? {
              0: { cellWidth: 49 },
              1: { cellWidth: 25 },
              2: { cellWidth: 23 },
              3: { cellWidth: 23 },
              4: { cellWidth: 36 },
              5: { cellWidth: width - 180 },
            }
          : head[0] === "Location"
            ? { 0: { cellWidth: 39 } }
            : head[0] === "Measure"
              ? { 0: { cellWidth: 45 } }
              : {},
      headStyles: {
        fillColor: [20, 46, 68],
        textColor: [255, 255, 255],
        fontSize: 9.5,
      },
      footStyles: {
        fillColor: [232, 240, 245],
        textColor: [20, 46, 68],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [246, 249, 251] },
      didDrawPage: (hook) => {
        if (hook.pageNumber > 1) header("Continued");
      },
    });
  header(
    report.basis === "SERVICE"
      ? "Revenue by service period"
      : "Revenue by first email date",
  );
  const t = report.totals;
  doc.setFillColor(224, 242, 239);
  doc.roundedRect(12, 59, width - 24, 22, 2, 2, "F");
  doc.setFontSize(9);
  doc.text(
    "Total employer cost - approved gross pay + estimated employer taxes",
    15,
    66,
  );
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(
    t.incompleteGross ? "Incomplete - review wages" : cash(t.employerCost),
    15,
    75,
  );
  const cards = [
    ["Invoiced revenue, before tax", cash(t.revenue)],
    ["Approved gross pay", cash(t.grossPay)],
    ["Estimated employer taxes", cash(t.employerTaxes)],
    [
      "Contribution before overhead",
      t.incomplete ? "Incomplete - review" : cash(t.margin),
    ],
  ];
  cards.forEach(([label, value], i) => {
    const x = 12 + ((i % 2) * (width - 20)) / 2;
    const y = 85 + Math.floor(i / 2) * 26;
    doc.setFillColor(239, 245, 248);
    doc.roundedRect(x, y, (width - 28) / 2, 22, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 3, y + 7);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 3, y + 16);
  });
  table(
    [
      "Location",
      "Invoices",
      "Scheduled h",
      "Approved h",
      "Revenue",
      "Gross pay",
      "Contribution",
    ],
    report.locations.map((l) => [
      l.name,
      l.invoiceCount,
      l.scheduledHours.toFixed(2),
      l.approvedHours.toFixed(2),
      l.manualInvoiceRequired && !l.manualReason
        ? "Enter manually"
        : cash(l.revenue),
      cash(l.gross),
      t.incomplete ? "Review" : cash(l.margin),
    ]),
    141,
    [
      [
        "TOTAL",
        t.invoices,
        t.scheduledHours.toFixed(2),
        t.approvedHours.toFixed(2),
        cash(t.revenue),
        cash(t.grossPay),
        t.incomplete ? "Review" : cash(t.margin),
      ],
    ],
  );
  for (const [classification, label] of [
    ["W2", "W-2 employees"],
    ["CONTRACTOR_1099", "1099 contractors"],
  ]) {
    doc.addPage();
    header(label + " | Approved attendance only");
    const workers = report.workers.filter(
      (w) => w.workerType === classification,
    );
    const group = report.workerTotals.find(
      (g) => g.workerType === classification,
    )!;
    table(
      [
        "Worker",
        "Profile rate",
        "Approved hours",
        "Actual hours",
        "Gross pay",
        "Deductions",
      ],
      workers.map((w) => [
        w.name,
        w.profileRate == null ? "Review" : cash(w.profileRate),
        w.hours.toFixed(2),
        w.actualHours == null ? "Review" : w.actualHours.toFixed(2),
        w.missing ? "Review" : cash(w.gross),
        cash(w.deductions),
      ]),
      60,
      [
        [
          classification === "W2" ? "W-2 TOTAL" : "1099 TOTAL",
          "",
          group.approvedHours.toFixed(2),
          group.actualHours === null ? "Review" : group.actualHours.toFixed(2),
          group.incompleteGross ? "Review" : cash(group.grossPay),
          cash(group.deductions),
        ],
      ],
    );
  }
  let combinedY = ((doc as any).lastAutoTable?.finalY || 60) + 14;
  if (combinedY > height - 65) {
    doc.addPage();
    header("All workers - combined totals");
    combinedY = 60;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 46, 68);
    doc.text("All workers - combined totals", 12, combinedY);
    combinedY += 6;
  }
  table(
    ["Actual hours", "Scheduled hours", "Gross pay"],
    [
      [
        t.actualHours === null ? "Review" : t.actualHours.toFixed(2),
        t.scheduledHours.toFixed(2),
        t.incompleteGross ? "Review" : cash(t.grossPay),
      ],
    ],
    combinedY,
  );
  doc.addPage();
  header("Invoice detail | Whole service periods; no prorating");
  table(
    [
      "Invoice / location",
      "Service period",
      "Revenue before tax",
      "Sales tax",
      "Invoice total",
      "Current balance",
    ],
    report.invoices.map((i) => [
      i.number + "\n" + i.location,
      displayReportDate(i.serviceFrom) +
        " -\n" +
        displayReportDate(i.serviceTo),
      cash(i.revenue),
      cash(i.salesTax),
      cash(i.total),
      cash(i.balance),
    ]),
  );
  doc.addPage();
  header("Deduction detail | Recorded and scheduled shown separately");
  table(
    ["Worker", "Deduction", "Amount", "Basis"],
    report.deductions.map((d) => [
      d.name.toUpperCase(),
      d.type,
      cash(d.amount),
      d.status,
    ]),
  );
  doc.addPage();
  header("Calculation basis and employer-tax assumptions");
  table(
    ["Measure", "Amount / assumption"],
    [
      [
        "Total workers / approved hours",
        t.workers + " / " + t.approvedHours.toFixed(2) + "h",
      ],
      [
        "Invoiced total / sales tax",
        cash(t.invoicedTotal) + " / " + cash(t.salesTax),
      ],
      ["Current outstanding on selected invoices", cash(t.outstanding)],
      [
        "Recorded worker deductions",
        cash(t.deductions) + " (not an additional employer expense)",
      ],
      [
        "Employer Social Security",
        "6.2% up to " +
          cash(
            report.options.year === 2026
              ? 184500
              : report.options.year === 2025
                ? 176100
                : 168600,
          ) +
          " per W-2 worker annually",
      ],
      ["Employer Medicare", "1.45% of W-2 gross wages; no annual cap"],
      [
        "FUTA estimate",
        "0.6% of first " + cash(7000) + " annually; assumes full state credit",
      ],
      [
        "Optional additional employer tax",
        report.options.extraRate +
          "% | annual base " +
          (report.options.extraCap
            ? cash(report.options.extraCap)
            : "Uncapped"),
      ],
      ...report.warnings.map((w) => ["REVIEW", w]),
      ...report.notes.map((note) => ["Basis / limitation", note]),
    ],
  );
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(94, 113, 127);
    doc.text(
      "Management estimate | " +
        displayReportDate(report.from) +
        " - " +
        displayReportDate(report.to),
      12,
      height - 8,
    );
    doc.text(p + " / " + pages, width - 12, height - 8, { align: "right" });
  }
  return Buffer.from(doc.output("arraybuffer"));
}
