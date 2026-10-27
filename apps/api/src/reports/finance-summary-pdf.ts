import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FinanceSummary } from "./finance-summary";
import { InvoiceLogo } from "../invoices/invoice-logo";
import { displayReportDate } from "../time-tracking/timesheet-report";

export function financeSummaryPdf(
  report: FinanceSummary,
  logo: InvoiceLogo | null,
) {
  const doc = new jsPDF({ orientation: "landscape", format: "letter" }),
    width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight();
  const cash = (n: number) =>
    report.business.currency +
    " " +
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
      doc.splitTextToSize(report.business.address, 205),
      logo ? 57 : 12,
      20,
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(report.title, 12, 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      displayReportDate(report.from) +
        " - " +
        displayReportDate(report.to) +
        " | " +
        subtitle,
      12,
      43,
    );
    doc.setDrawColor(210, 222, 230);
    doc.line(12, 47, width - 12, 47);
  };
  const table = (head: string[], body: any[][], startY = 54, foot?: any[][]) =>
    autoTable(doc, {
      head: [head],
      body: body.length
        ? body
        : [head.map((_, i) => (i ? "" : "No records in this period"))],
      foot,
      showFoot: "lastPage",
      rowPageBreak: "avoid",
      tableWidth: head[0] === "Location" ? 255 : "auto",
      startY,
      margin: { left: 12, right: 12, top: 52, bottom: 17 },
      styles: {
        font: "helvetica",
        fontSize: 10.5,
        cellPadding: head[0] === "Location" ? 1.4 : 2.2,
        overflow: "linebreak",
        textColor: [32, 48, 64],
      },
      columnStyles:
        head[0] === "Location"
          ? {
              0: { cellWidth: 48 },
              1: { cellWidth: 18 },
              2: { cellWidth: 23 },
              3: { cellWidth: 23 },
              4: { cellWidth: 36 },
              5: { cellWidth: 36 },
              6: { cellWidth: 33 },
              7: { cellWidth: 38 },
            }
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
    const x = 12 + (i * (width - 24)) / 4;
    doc.setFillColor(239, 245, 248);
    doc.roundedRect(x, 53, (width - 30) / 4, 22, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 3, 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 3, 69);
  });
  table(
    [
      "Location",
      "Invoices",
      "Scheduled h",
      "Approved h",
      "Revenue",
      "Gross pay",
      "Employer tax est.",
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
      cash(l.employerTax),
      t.incomplete ? "Review" : cash(l.margin),
    ]),
    83,
    [
      [
        "TOTAL",
        t.invoices,
        t.scheduledHours.toFixed(2),
        t.approvedHours.toFixed(2),
        cash(t.revenue),
        cash(t.grossPay),
        cash(t.employerTaxes),
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
    table(
      [
        "Worker",
        "Rate / hour",
        "Approved h",
        "OT h",
        "Gross pay",
        "Recorded deductions",
        "Scheduled / pay period",
        "Employer tax est.",
      ],
      workers.map((w) => [
        w.name,
        w.rates.length
          ? w.rates.map((r: number) => cash(r)).join(" / ")
          : "Review",
        w.hours.toFixed(2),
        w.overtimeHours.toFixed(2),
        w.missing ? "Review" : cash(w.gross),
        cash(w.deductions),
        cash(w.scheduledDeductions),
        cash(w.employerTax),
      ]),
    );
  }
  doc.addPage();
  header("Invoice detail | Whole service periods; no prorating");
  table(
    [
      "Invoice",
      "Location",
      "Service from",
      "Service to",
      "Revenue before tax",
      "Sales tax",
      "Invoice total",
      "Current balance",
    ],
    report.invoices.map((i) => [
      i.number,
      i.location,
      displayReportDate(i.serviceFrom),
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
    ["Worker", "Deduction", "Amount", "Basis", "Reference"],
    report.deductions.map((d) => [
      d.name.toUpperCase(),
      d.type,
      cash(d.amount),
      d.status,
      d.reference,
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
