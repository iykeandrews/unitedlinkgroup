import { BadRequestException } from "@nestjs/common";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { calculateHours, paidIntervals } from "../payroll/hours";
import { effectivePay } from "../employees/employment.util";

export const reportDay = (value: Date | string, zone = "America/New_York") => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  return part("year") + "-" + part("month") + "-" + part("day");
};
const clock = (value: any, zone: string) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(value))
    : "Open";
const stamp = (value: any, zone: string) =>
  value ? reportDay(value, zone) + " " + clock(value, zone) : "Open";
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function validateReportPeriod(from: string, to: string) {
  const valid = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (
    !valid(from) ||
    !valid(to) ||
    from > to ||
    Date.parse(to) - Date.parse(from) > 366 * 86400000
  )
    throw new BadRequestException(
      "Choose a valid report period of up to one year.",
    );
}
export function buildTimesheetReport(
  business: any,
  sheets: any[],
  changes: any[],
  query: any,
) {
  validateReportPeriod(query.from, query.to);
  if (!["ALL", "APPROVED", "PENDING"].includes(query.status || "ALL"))
    throw new BadRequestException(
      "Choose approved, pending, or both statuses.",
    );
  const parse = (details: string) => {
    try {
      return JSON.parse(details || "{}").changes || [];
    } catch {
      return [];
    }
  };
  let settings: any = {};
  try {
    settings = JSON.parse(business.settings || "{}");
  } catch {}
  const anchor = new Date(
    settings.payrollTaxes?.workweekAnchor || "2026-01-04T00:00:00Z",
  );
  const selected = sheets
    .filter((s) => {
      const day = reportDay(
        s.startTime,
        s.timeZone || s.location?.timeZone || "America/New_York",
      );
      return (
        ["APPROVED", "PENDING"].includes(s.status) &&
        day >= query.from &&
        day <= query.to &&
        (!query.status ||
          query.status === "ALL" ||
          s.status === query.status) &&
        (!query.workerType || s.workerType === query.workerType) &&
        (!query.locationId || s.locationId === query.locationId) &&
        (!query.employeeId || s.employeeId === query.employeeId) &&
        (!query.search ||
          (s.employee.firstName + " " + s.employee.lastName)
            .toLowerCase()
            .includes(query.search.toLowerCase()))
      );
    })
    .sort(
      (a, b) =>
        (a.employee.lastName + " " + a.employee.firstName).localeCompare(
          b.employee.lastName + " " + b.employee.firstName,
        ) ||
        a.employeeId.localeCompare(b.employeeId) ||
        +new Date(a.startTime) - +new Date(b.startTime),
    );
  const rows = selected.map((s) => {
    const zone = s.timeZone || s.location?.timeZone || "America/New_York";
    const pay = effectivePay({ ...s.employee, workerType: s.workerType });
    let rate = pay.hourlyRate,
      payType = pay.payType;
    const profile =
      s.workerType === "CONTRACTOR_1099"
        ? s.employee.contractorProfile
        : s.employee.w2Profile;
    if (
      profile?.rate == null &&
      s.employee.hourlyRate == null &&
      payType === "HOURLY"
    )
      rate = null;
    const next = changes
      .filter(
        (c) =>
          c.resourceId === s.employeeId &&
          new Date(c.createdAt) > new Date(s.startTime),
      )
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .find((c) =>
        parse(c.details).some((e: any) => e.classification === s.workerType),
      );
    if (next) {
      const change = parse(next.details).find(
        (e: any) => e.classification === s.workerType,
      );
      rate = change.previousRate;
      payType = change.previousPayType;
    }
    const historical = /Historical source hourly rate:\s*\$([\d.]+)/.exec(
      s.employeeNote || "",
    );
    if (s.paidExternally && historical) {
      rate = Number(historical[1]);
      payType = "HOURLY";
    }
    let hours: number | null = null,
      gross: number | null = null,
      ot: number | null = null,
      warning = "";
    try {
      if (s.endTime) {
        hours = paidIntervals(s).reduce(
          (n, [a, z]) => n + (z - a) / 3600000,
          0,
        );
        if (
          payType === "HOURLY" &&
          typeof rate === "number" &&
          Number.isFinite(rate) &&
          rate >= 0
        ) {
          const context = sheets
            .filter(
              (t) =>
                t.employeeId === s.employeeId &&
                t.workerType === s.workerType &&
                t.endTime &&
                ["APPROVED", "PENDING"].includes(t.status),
            )
            .map((t) => ({ ...t, paidExternally: false }));
          const result = calculateHours(
            context,
            new Date(s.startTime),
            new Date(+new Date(s.endTime) - 1),
            rate,
            s.workerType === "W2" && pay.overtimeEligible,
            anchor,
          );
          gross = result.grossPay;
          ot = result.overtimeHours;
        } else warning = "Salary or missing hourly rate: review in payroll";
      } else warning = "Clock-out required";
    } catch {
      warning = "Review invalid or overlapping attendance";
    }
    const breaks =
      (s.breaks || [])
        .map(
          (b: any) =>
            stamp(b.startTime, zone) +
            " - " +
            stamp(b.endTime, zone) +
            " (" +
            (b.type === "PAID" ? "paid" : "unpaid") +
            ")",
        )
        .join("\n") || "None";
    return {
      id: s.id,
      employeeId: s.employeeId,
      name: s.employee.firstName + " " + s.employee.lastName,
      badge: s.employee.badgeNumber || "",
      date: reportDay(s.startTime, zone),
      location: s.location?.name || "Unassigned",
      zone,
      clockIn: stamp(s.startTime, zone),
      clockOut: stamp(s.endTime, zone),
      breaks,
      hours: hours === null ? null : round(hours),
      overtimeHours: ot === null ? null : round(ot),
      rate: payType === "HOURLY" && typeof rate === "number" ? rate : null,
      gross,
      status: s.status,
      workerType: s.workerType,
      paidExternally: !!s.paidExternally,
      warning,
    };
  });
  const groups: any[] = [];
  for (const row of rows) {
    let g = groups.find((g) => g.employeeId === row.employeeId);
    if (!g) {
      g = {
        employeeId: row.employeeId,
        name: row.name,
        badge: row.badge,
        rows: [],
        hours: 0,
        gross: 0,
        missing: 0,
      };
      groups.push(g);
    }
    g.rows.push(row);
    g.hours += row.hours || 0;
    g.gross += row.gross || 0;
    if (row.gross === null) g.missing++;
  }
  for (const g of groups) {
    g.hours = round(g.hours);
    g.gross = round(g.gross);
  }
  return {
    business: business.name,
    currency: business.currencyCode || "USD",
    from: query.from,
    to: query.to,
    status: query.status || "ALL",
    groups,
    rows,
    hours: round(groups.reduce((n, g) => n + g.hours, 0)),
    gross: round(groups.reduce((n, g) => n + g.gross, 0)),
    notes:
      "Gross pay is an estimate before taxes and deductions, using recorded hourly rates and weekly overtime where applicable. Pending attendance is included in overtime estimates. Paid external history is shown for reference, not as an amount due. Salary, missing rates, open shifts and overlapping attendance require payroll review. Dates and times use each work location’s time zone. Period selection uses the clock-in date.",
  };
}
export type TimesheetReport = ReturnType<typeof buildTimesheetReport>;
export function reportPdf(report: TimesheetReport) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: report.currency,
    }).format(n);
  const groups = report.groups.length
    ? report.groups
    : [
        {
          name: "No matching timesheets",
          badge: "",
          rows: [],
          hours: 0,
          gross: 0,
          missing: 0,
        },
      ];
  groups.forEach((g, index) => {
    if (index) doc.addPage();
    doc.setFillColor(36, 32, 72);
    doc.rect(0, 0, 297, 31, "F");
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("TIMESHEET REPORT", 12, 13);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(report.business.slice(0, 95), 12, 23);
    doc.setTextColor(36, 32, 72);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(g.name + (g.badge ? " | " + g.badge : ""), 12, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Period: " +
        report.from +
        " through " +
        report.to +
        "  |  " +
        (report.status === "ALL"
          ? "Approved and pending"
          : report.status.toLowerCase()),
      12,
      49,
    );
    doc.setFillColor(243, 242, 250);
    doc.roundedRect(12, 54, 273, 16, 2, 2, "F");
    doc.setFontSize(10);
    doc.text("Entries: " + g.rows.length, 17, 64);
    doc.text("Total net hours: " + g.hours.toFixed(2), 84, 64);
    doc.text(
      "Estimated gross: " + money(g.gross) + (g.missing ? " (incomplete)" : ""),
      169,
      64,
    );
    autoTable(doc, {
      startY: 76,
      margin: { left: 12, right: 12, bottom: 28, top: 18 },
      head: [
        [
          "Work date",
          "Location / zone",
          "Clock-in",
          "Clock-out",
          "Break times",
          "Net hours",
          "OT hours",
          "Rate / hr",
          "Gross pay",
          "Status",
        ],
      ],
      body: g.rows.map((r: any) => [
        r.date,
        r.location + "\n" + r.zone,
        r.clockIn,
        r.clockOut,
        r.breaks,
        r.hours === null ? "Review" : r.hours.toFixed(2),
        r.overtimeHours === null ? "-" : r.overtimeHours.toFixed(2),
        r.rate === null ? "Review" : money(r.rate),
        r.gross === null ? "Review" : money(r.gross),
        r.status +
          (r.paidExternally ? "\nPaid externally" : "") +
          (r.warning ? "\n" + r.warning : ""),
      ]),
      theme: "striped",
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: { fillColor: [70, 53, 116], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 247, 251] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 37 },
        2: { cellWidth: 27 },
        3: { cellWidth: 27 },
        4: { cellWidth: 49 },
        5: { cellWidth: 16, halign: "right" },
        6: { cellWidth: 15, halign: "right" },
        7: { cellWidth: 23, halign: "right" },
        8: { cellWidth: 25, halign: "right" },
        9: { cellWidth: 34 },
      },
      foot: [
        [
          "EMPLOYEE TOTAL",
          "",
          "",
          "",
          "",
          g.hours.toFixed(2),
          "",
          "",
          money(g.gross),
          "",
        ],
      ],
      footStyles: {
        fillColor: [235, 232, 244],
        textColor: [36, 32, 72],
        fontStyle: "bold",
      },
      showFoot: "lastPage",
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFontSize(9);
          doc.setTextColor(36, 32, 72);
          doc.text(
            g.name + " | " + report.from + " through " + report.to,
            12,
            11,
          );
        }
      },
    });
  });
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(90);
    doc.text(doc.splitTextToSize(report.notes, 273), 12, 191);
    doc.text(
      report.from + " - " + report.to + "  |  " + page + " / " + count,
      285,
      205,
      { align: "right" },
    );
  }
  return Buffer.from(doc.output("arraybuffer"));
}
export async function reportExcel(report: TimesheetReport) {
  const book = new ExcelJS.Workbook();
  book.creator = report.business;
  book.created = new Date();
  const currency =
    '"' +
    report.currency +
    '" #,##0.00;[Red]("' +
    report.currency +
    '" #,##0.00)';
  const title = (sheet: ExcelJS.Worksheet, count: number) => {
    sheet.mergeCells(1, 1, 1, count);
    sheet.getCell(1, 1).value = report.business + " | TIMESHEET REPORT";
    sheet.getRow(1).height = 32;
    sheet.getCell(1, 1).font = {
      size: 18,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    sheet.getCell(1, 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF242048" },
    };
    sheet.mergeCells(2, 1, 2, count);
    sheet.getCell(2, 1).value =
      "Period: " +
      report.from +
      " through " +
      report.to +
      " | " +
      (report.status === "ALL" ? "Approved and pending" : report.status);
    sheet.views = [{ state: "frozen", ySplit: 4 }];
    sheet.pageSetup = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    sheet.headerFooter = {
      oddFooter: "&L" + report.from + " - " + report.to + "&RPage &P of &N",
    };
  };
  const styleHeader = (row: ExcelJS.Row) => {
    row.height = 26;
    row.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF463574" },
      };
      c.alignment = { vertical: "middle", wrapText: true };
    });
  };
  const summary = book.addWorksheet("Employee summary");
  title(summary, 6);
  summary.addRow([]);
  styleHeader(
    summary.addRow([
      "Employee",
      "Employee ID",
      "Entries",
      "Net hours",
      "Estimated gross",
      "Needs review",
    ]),
  );
  for (const g of report.groups)
    summary.addRow([
      g.name,
      g.badge || g.employeeId,
      g.rows.length,
      g.hours,
      g.gross,
      g.missing ? g.missing + " entries" : "",
    ]);
  const total = summary.addRow([
    "TOTAL",
    "",
    report.rows.length,
    report.hours,
    report.gross,
    "",
  ]);
  total.font = { bold: true };
  summary.getColumn(4).numFmt = "0.00";
  summary.getColumn(5).numFmt = currency;
  [32, 22, 12, 15, 22, 22].forEach(
    (w, i) => (summary.getColumn(i + 1).width = w),
  );
  summary.autoFilter = { from: "A4", to: "F" + (4 + report.groups.length) };
  const sheet = book.addWorksheet("Timesheets by employee");
  title(sheet, 15);
  sheet.addRow([]);
  styleHeader(
    sheet.addRow([
      "Employee",
      "Work date",
      "Location",
      "Time zone",
      "Clock-in",
      "Clock-out",
      "Break times",
      "Net hours",
      "OT hours",
      "Hourly rate",
      "Estimated gross",
      "Status",
      "Classification",
      "Paid externally",
      "Review notes",
    ]),
  );
  for (const g of report.groups) {
    const heading = sheet.addRow([g.name + (g.badge ? " | " + g.badge : "")]);
    sheet.mergeCells(heading.number, 1, heading.number, 15);
    heading.font = { bold: true, color: { argb: "FF242048" } };
    heading.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEAE6F4" },
    };
    for (const r of g.rows) {
      const row = sheet.addRow([
        r.name,
        r.date,
        r.location,
        r.zone,
        r.clockIn,
        r.clockOut,
        r.breaks,
        r.hours,
        r.overtimeHours,
        r.rate,
        r.gross,
        r.status,
        r.workerType,
        r.paidExternally ? "Yes" : "No",
        r.warning,
      ]);
      row.alignment = { vertical: "top", wrapText: true };
      row.height = Math.max(30, 16 * r.breaks.split("\n").length);
      for (const col of [8, 9]) row.getCell(col).numFmt = "0.00";
      for (const col of [10, 11]) row.getCell(col).numFmt = currency;
    }
    const subtotal = sheet.addRow([
      g.name + " TOTAL",
      "",
      "",
      "",
      "",
      "",
      "",
      g.hours,
      "",
      "",
      g.gross,
    ]);
    subtotal.font = { bold: true };
    subtotal.getCell(8).numFmt = "0.00";
    subtotal.getCell(11).numFmt = currency;
    sheet.addRow([]);
  }
  [28, 15, 28, 24, 26, 26, 62, 14, 14, 18, 20, 15, 23, 18, 42].forEach(
    (w, i) => (sheet.getColumn(i + 1).width = w),
  );
  const notes = book.addWorksheet("Report notes");
  title(notes, 3);
  notes.mergeCells("A4:C8");
  notes.getCell("A4").value = report.notes;
  notes.getCell("A4").alignment = { wrapText: true, vertical: "top" };
  notes.columns.forEach((c) => (c.width = 38));
  return Buffer.from(await book.xlsx.writeBuffer());
}
