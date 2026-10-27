import { BadRequestException } from "@nestjs/common";
import { jsPDF } from "jspdf";
import { InvoiceLogo } from "../invoices/invoice-logo";
import ExcelJS from "exceljs";
import { calculateHours, paidIntervals } from "../payroll/hours";
import { effectivePay } from "../employees/employment.util";

export const displayReportDate = (iso: string) =>
  iso.slice(5, 7) + "/" + iso.slice(8, 10) + "/" + iso.slice(0, 4);
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
  if (
    query.employeeIds !== undefined &&
    (typeof query.employeeIds !== "string" || query.employeeIds.length > 24000)
  )
    throw new BadRequestException("Choose valid employees");
  const employeeIds = query.employeeIds
    ? new Set<string>(query.employeeIds.split(",").filter(Boolean))
    : null;
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
        (!employeeIds || employeeIds.has(s.employeeId)) &&
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
      // A first configured positive rate replaces an unset/zero placeholder,
      // including attendance entered before the profile was completed.
      const initialRate =
        (change.previousRate == null || change.previousRate === 0) &&
        typeof change.newRate === "number" &&
        change.newRate > 0;
      rate = initialRate ? change.newRate : change.previousRate;
      payType = initialRate
        ? change.payType || payType
        : change.previousPayType;
    }
    const historical = /Historical source hourly rate:\s*\$(\d+(?:\.\d+)?)/.exec(
      s.employeeNote || "",
    );
    if (s.paidExternally && historical) {
      rate = Number(historical[1]);
      payType = "HOURLY";
    }
    if (s.shiftHourlyRate != null) {
      rate = s.shiftHourlyRate;
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
          hours += rate > 0 ? Number(s.additionalWorkAmount || 0) / rate : 0;
          gross = result.grossPay;
          ot = result.overtimeHours;
        } else warning = "Salary or missing hourly rate: review in payroll";
      } else warning = "Clock-out required";
    } catch {
      warning = "Review invalid or overlapping attendance";
    }
    const breaks =
      (s.breaks || [])
        .map((b: any) => {
          if (!b.endTime) return "Open break";
          const minutes =
            (+new Date(b.endTime) - +new Date(b.startTime)) / 60000;
          return Number.isFinite(minutes) && minutes >= 0
            ? round(minutes) + "mins" + (b.type === "PAID" ? " paid" : "")
            : "Review";
        })
        .join("; ") || "0mins";
    return {
      id: s.id,
      employeeId: s.employeeId,
      name: s.employee.firstName + " " + s.employee.lastName,
      badge: s.employee.badgeNumber || "",
      date: displayReportDate(reportDay(s.startTime, zone)),
      location: s.location?.name || "Unassigned",
      zone,
      clockIn: clock(s.startTime, zone),
      clockOut:
        clock(s.endTime, zone) +
        (s.endTime &&
        reportDay(s.endTime, zone) !== reportDay(s.startTime, zone)
          ? " (" + displayReportDate(reportDay(s.endTime, zone)) + ")"
          : ""),
      breaks,
      hours: hours === null ? null : round(hours),
      overtimeHours: ot === null ? null : round(ot),
      rate: payType === "HOURLY" && typeof rate === "number" ? rate : null,
      gross,
      status: s.status,
      workerType: s.workerType,
      paidExternally: !!s.paidExternally,
      warning: [
        warning,
        s.additionalWorkAmount > 0
          ? "Additional work: " +
            s.additionalWorkDescription +
            "; " +
            s.additionalWorkAmount.toFixed(2) +
            " (" +
            (s.additionalWorkAmount / rate).toFixed(2) +
            "h)"
          : "",
      ]
        .filter(Boolean)
        .join(" / "),
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
    address: [
      business.address,
      [business.city, business.state, business.zip].filter(Boolean).join(", "),
    ]
      .filter(Boolean)
      .join(" | "),
    logo: null as InvoiceLogo | null,
    currency: business.currencyCode || "USD",
    from: displayReportDate(query.from),
    to: displayReportDate(query.to),
    status: query.status || "ALL",
    groups,
    rows,
    hours: round(groups.reduce((n, g) => n + g.hours, 0)),
    gross: round(groups.reduce((n, g) => n + g.gross, 0)),
    notes:
      "Gross pay is an estimate before taxes and deductions, using recorded hourly rates and weekly overtime where applicable. Pending attendance is included in overtime estimates. Paid external history is shown for reference, not as an amount due. Salary, missing rates, open shifts and overlapping attendance require payroll review. Times are shown as recorded at the work location. Period selection uses the clock-in date.",
  };
}
export type TimesheetReport = ReturnType<typeof buildTimesheetReport>;
export function reportPdf(report: TimesheetReport) {
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
  const widths = [27, 55, 27, 27, 26, 24, 26, 28, 33];
  const measure = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const fontSize = 11,
    lineHeight = 4.5;
  measure.setFontSize(fontSize);
  const rowsFor = (g: any) =>
    g.rows.map((r: any) => [
      r.date,
      r.location,
      r.clockIn,
      r.clockOut,
      r.breaks,
      r.hours === null ? "Review" : r.hours.toFixed(2),
      r.rate === null ? "Review" : money(r.rate),
      r.gross === null ? "Review" : money(r.gross),
      r.status +
        (r.paidExternally ? " / Paid externally" : "") +
        (r.warning ? " / " + r.warning : ""),
    ]);
  const layouts = groups.map((g) => {
    const rows = rowsFor(g).map((row: string[]) =>
      row.map((value, i) => measure.splitTextToSize(value, widths[i] - 4)),
    );
    const heights = rows.map((row: string[][]) =>
      Math.max(
        10,
        Math.max(...row.map((cell) => cell.length)) * lineHeight + 4,
      ),
    );
    return {
      rows,
      heights,
      height: Math.max(
        210,
        105 + heights.reduce((a: number, b: number) => a + b, 0),
      ),
    };
  });
  const firstHeight = layouts[0].height;
  const doc = new jsPDF({
    orientation: firstHeight > 297 ? "portrait" : "landscape",
    unit: "mm",
    format: [297, firstHeight],
  });
  groups.forEach((g, index) => {
    const layout = layouts[index],
      height = layout.height;
    if (index)
      doc.addPage([297, height], height > 297 ? "portrait" : "landscape");
    doc.setFillColor(36, 32, 72);
    doc.rect(0, 0, 297, 3, "F");
    let headingX = 12;
    if (report.logo) {
      const image = doc.getImageProperties(report.logo.dataUrl);
      const scale = Math.min(48 / image.width, 18 / image.height);
      doc.addImage(
        report.logo.dataUrl,
        report.logo.format,
        12,
        7,
        image.width * scale,
        image.height * scale,
      );
      headingX = 66;
    }
    doc.setTextColor(36, 32, 72);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(report.business.slice(0, 75), headingX, 13);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(report.address, 205 - headingX), headingX, 19);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("TIMESHEET", 285, 12, { align: "right" });
    doc.setFontSize(14);
    doc.text(g.name + (g.badge ? " | " + g.badge : ""), 12, 33);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      "Period: " +
        report.from +
        " through " +
        report.to +
        " | " +
        (report.status === "ALL" ? "Approved and pending" : report.status),
      12,
      39,
    );
    doc.setFillColor(243, 242, 250);
    doc.rect(12, 43, 273, 12, "F");
    doc.text("Entries: " + g.rows.length, 15, 49.5);
    const overtime = g.rows.reduce(
      (total: number, row: any) => total + (row.overtimeHours || 0),
      0,
    );
    doc.text(
      "Total hours: " +
        g.hours.toFixed(2) +
        (overtime > 0 ? " (" + overtime.toFixed(2) + " OT)" : ""),
      85,
      49.5,
    );
    doc.text(
      "Estimated gross: " + money(g.gross) + (g.missing ? " (incomplete)" : ""),
      174,
      49.5,
    );
    const headings = [
      "Work date",
      "Location",
      "Clock-in",
      "Clock-out",
      "Break",
      "Net hours",
      "Rate / hr",
      "Gross pay",
      "Status",
    ];
    let y = 60;
    const drawRow = (
      cells: string[][],
      rowHeight: number,
      kind: "head" | "body" | "total",
      alternate = false,
    ) => {
      doc.setFillColor(
        ...((kind === "head"
          ? [70, 53, 116]
          : kind === "total"
            ? [235, 232, 244]
            : alternate
              ? [247, 247, 251]
              : [255, 255, 255]) as [number, number, number]),
      );
      doc.rect(12, y, 273, rowHeight, "F");
      doc.setTextColor(
        ...((kind === "head" ? [255, 255, 255] : [36, 32, 72]) as [
          number,
          number,
          number,
        ]),
      );
      doc.setFont("helvetica", kind === "body" ? "normal" : "bold");
      doc.setFontSize(kind === "head" ? 9.5 : fontSize);
      doc.setLineHeightFactor(1.15);
      let x = 12;
      cells.forEach((lines, i) => {
        doc.text(lines, x + 2, y + 5.8);
        x += widths[i];
      });
      y += rowHeight;
    };
    drawRow(
      headings.map((h) => [h]),
      10,
      "head",
    );
    layout.rows.forEach((row: string[][], i: number) =>
      drawRow(row, layout.heights[i], "body", i % 2 === 0),
    );
    drawRow(
      [
        ["TOTAL"],
        [],
        [],
        [],
        [],
        [g.hours.toFixed(2)],
        [],
        [money(g.gross)],
        [],
      ],
      11,
      "total",
    );
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    doc.setFont("helvetica", "normal");
    doc.text(
      doc.splitTextToSize(
        "Gross pay is estimated before taxes and deductions and includes applicable weekly overtime. Pending entries require approval. Paid external history is for reference only. Review flagged entries in payroll.",
        273,
      ),
      12,
      height - 20,
    );
    doc.text(
      report.from +
        " - " +
        report.to +
        " | " +
        (index + 1) +
        " / " +
        groups.length,
      285,
      height - 4,
      { align: "right" },
    );
  });
  return Buffer.from(doc.output("arraybuffer"));
}
export async function reportExcel(report: TimesheetReport) {
  const book = new ExcelJS.Workbook();
  book.creator = report.business;
  book.created = new Date();
  const logoId = report.logo
    ? book.addImage({
        buffer: report.logo.bytes as any,
        extension: report.logo.format === "PNG" ? "png" : "jpeg",
      })
    : undefined;
  const currency =
    '"' +
    report.currency +
    '" #,##0.00;[Red]("' +
    report.currency +
    '" #,##0.00)';
  const brand = (sheet: ExcelJS.Worksheet, count: number) => {
    sheet.mergeCells(1, logoId === undefined ? 1 : 3, 1, count);
    sheet.getCell(1, logoId === undefined ? 1 : 3).value =
      report.business + " | TIMESHEET";
    sheet.getRow(1).height = 32;
    sheet.getRow(1).font = {
      bold: true,
      size: 16,
      color: { argb: "FF242048" },
    };
    if (logoId !== undefined)
      sheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 130, height: 45 },
      });
    sheet.mergeCells(2, logoId === undefined ? 1 : 3, 2, count);
    sheet.getCell(2, logoId === undefined ? 1 : 3).value = report.address;
    sheet.getRow(2).height = 22;
    sheet.mergeCells(3, 1, 3, count);
    sheet.getCell(3, 1).value =
      "Period: " +
      report.from +
      " through " +
      report.to +
      " | " +
      (report.status === "ALL" ? "Approved and pending" : report.status);
    sheet.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
    sheet.pageSetup = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.3,
        bottom: 0.3,
        header: 0.1,
        footer: 0.1,
      },
    };
    sheet.headerFooter = {
      oddFooter: "&L" + report.from + " - " + report.to + "&RPage &P of &N",
    };
  };
  const header = (row: ExcelJS.Row) => {
    row.height = 25;
    row.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF463574" },
      };
      c.alignment = { wrapText: true, vertical: "middle" };
    });
  };
  const summary = book.addWorksheet("Employee summary");
  brand(summary, 6);
  summary.addRow([]);
  header(
    summary.addRow([
      "Employee",
      "Employee ID",
      "Hourly rate",
      "Net hours",
      "Estimated gross",
      "Needs review",
    ]),
  );
  for (const g of report.groups) {
    const rates = [...new Set<number>(g.rows.map((r: any) => r.rate).filter((rate: any) => typeof rate === "number" && Number.isFinite(rate)))];
    summary.addRow([
      g.name,
      g.badge || g.employeeId,
      rates.length === 1 ? rates[0] : rates.length ? rates.map(rate => report.currency + " " + rate.toFixed(2)).join(" / ") : "Rate not set",
      g.hours,
      g.gross,
      g.missing ? g.missing + " entries" : "",
    ]);
  }
  summary.addRow([
    "TOTAL",
    "",
    "",
    report.hours,
    report.gross,
    "",
  ]).font = { bold: true };
  summary.getColumn(3).numFmt = currency;
  summary.getColumn(4).numFmt = "0.00";
  summary.getColumn(5).numFmt = currency;
  [32, 22, 24, 15, 22, 22].forEach(
    (w, i) => (summary.getColumn(i + 1).width = w),
  );
  summary.autoFilter = { from: "A5", to: "F" + (5 + report.groups.length) };
  for (const [index, g] of report.groups.entries()) {
    const sheet = book.addWorksheet(
      (
        g.name.replace(/[\/*?:\[\]]/g, " ").slice(0, 24) +
        " " +
        (index + 1)
      ).slice(0, 31),
    );
    brand(sheet, 10);
    sheet.mergeCells(4, 1, 4, 10);
    sheet.getCell(4, 1).value = g.name + (g.badge ? " | " + g.badge : "");
    sheet.getRow(4).font = { bold: true, size: 12 };
    header(
      sheet.addRow([
        "Work date",
        "Location",
        "Clock-in",
        "Clock-out",
        "Break (minutes)",
        "Net hours",
        "OT hours",
        "Hourly rate",
        "Estimated gross",
        "Status / notes",
      ]),
    );
    for (const r of g.rows) {
      const row = sheet.addRow([
        r.date,
        r.location,
        r.clockIn,
        r.clockOut,
        r.breaks,
        r.hours,
        r.overtimeHours,
        r.rate,
        r.gross,
        r.status +
          (r.paidExternally ? " / Paid externally" : "") +
          (r.warning ? " / " + r.warning : ""),
      ]);
      row.height = 28;
      row.alignment = { wrapText: true, vertical: "middle" };
    }
    const total = sheet.addRow([
      "TOTAL",
      "",
      "",
      "",
      "",
      g.hours,
      "",
      "",
      g.gross,
    ]);
    total.font = { bold: true };
    for (const col of [6, 7]) sheet.getColumn(col).numFmt = "0.00";
    for (const col of [8, 9]) sheet.getColumn(col).numFmt = currency;
    [15, 38, 18, 23, 22, 14, 14, 18, 20, 42].forEach(
      (w, i) => (sheet.getColumn(i + 1).width = w),
    );
    const noteRow = sheet.rowCount + 2;
    sheet.mergeCells(noteRow, 1, noteRow, 10);
    sheet.getCell(noteRow, 1).value = report.notes;
    sheet.getRow(noteRow).height = 45;
    sheet.getCell(noteRow, 1).alignment = { wrapText: true, vertical: "top" };
    sheet.getCell(noteRow, 1).font = { size: 9, color: { argb: "FF666666" } };
    sheet.pageSetup.printArea = "A1:J" + noteRow;
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
