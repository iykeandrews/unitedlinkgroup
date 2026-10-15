import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BadRequestException } from "@nestjs/common";
import { loadInvoiceLogo } from "../invoices/invoice-logo";

export function validateScheduleDates(start: string, end: string) {
  const valid = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s || "") &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (
    !valid(start) ||
    !valid(end) ||
    end < start ||
    Date.parse(end) - Date.parse(start) > 366 * 86400000
  )
    throw new BadRequestException(
      "Choose a valid date range of up to 367 days.",
    );
}
export function scheduleClock(date: Date | string, zone?: string | null) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone || "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(date));
  const part = (key: string) => parts.find((p) => p.type === key)?.value || "";
  return {
    day: `${part("year")}-${part("month")}-${part("day")}`,
    date: `${part("month")}/${part("day")}/${part("year")}`,
    time: `${part("hour")}:${part("minute")} ${part("dayPeriod")}`,
  };
}
export function scheduleRows(
  shifts: any[],
  start: string,
  end: string,
  locationId?: string,
) {
  return shifts
    .filter(
      (s) =>
        !["ARCHIVED", "CANCELLED"].includes(s.status) &&
        (!locationId || s.locationId === locationId) &&
        scheduleClock(s.startTime, s.timeZone).day >= start &&
        scheduleClock(s.startTime, s.timeZone).day <= end,
    )
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime() ||
        String(a.id).localeCompare(String(b.id)),
    )
    .map((s) => {
      const a = scheduleClock(s.startTime, s.timeZone),
        b = scheduleClock(s.endTime, s.timeZone);
      return {
        id: s.id,
        locationId: s.locationId,
        location: s.location?.name || "Unassigned location",
        officer: s.employee
          ? `${s.employee.firstName} ${s.employee.lastName}`
          : "Unassigned",
        startDate: a.date,
        startTime: a.time,
        endDate: b.date,
        endTime: b.time,
        breakMinutes: s.breakMinutes || 0,
        hours: Math.max(
          0,
          (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) /
            3600000 -
            (s.breakMinutes || 0) / 60,
        ),
        status: s.status,
      };
    });
}
export async function buildScheduleExport(
  business: any,
  location: any,
  rows: ReturnType<typeof scheduleRows>,
  start: string,
  end: string,
  format: "xlsx" | "pdf",
) {
  const logo = await loadInvoiceLogo(business.logoUrl);
  const address = [
    business.address,
    [business.city, business.state, business.zip].filter(Boolean).join(", "),
    business.country,
    business.mobile,
  ]
    .filter(Boolean)
    .join(" • ");
  const period = `${start.slice(5, 7)}/${start.slice(8)}/${start.slice(0, 4)} – ${end.slice(5, 7)}/${end.slice(8)}/${end.slice(0, 4)}`;
  const headers = [
    "Officer",
    "Start date",
    "Start time",
    "Finish date",
    "Finish time",
    "Break (min)",
    "Net hours",
    "Status",
  ];
  const values = rows.map((r) => [
    r.officer,
    r.startDate,
    r.startTime,
    r.endDate,
    r.endTime,
    r.breakMinutes,
    r.hours,
    r.status,
  ]);
  const total = rows.reduce((n, r) => n + r.hours, 0);
  if (format === "xlsx") {
    const book = new ExcelJS.Workbook();
    book.creator = business.name;
    book.created = new Date();
    const sheet = book.addWorksheet("Location schedule", {
      views: [{ state: "frozen", ySplit: 8 }],
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: "1:8",
      },
    });
    sheet.columns = [
      { width: 32 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 15 },
      { width: 14 },
      { width: 17 },
    ];
    sheet.mergeCells("A1:E1");
    sheet.mergeCells("F1:H1");
    for (let n = 2; n <= 6; n++) sheet.mergeCells(n, 1, n, 8);
    sheet.getCell("A1").value = business.name || "Business";
    sheet.getRow(1).height = logo ? 82 : 34;
    sheet.getCell("A2").value = address;
    sheet.getRow(2).height = 32;
    sheet.getCell("A3").value = "LOCATION SCHEDULE";
    sheet.getCell("A4").value = `${location.name} • ${period}`;
    sheet.getCell("A5").value = location.address || "";
    sheet.getRow(5).height = 30;
    sheet.getCell("A6").value =
      "Times shown as recorded. Overnight shifts belong to their start date. Breaks are unpaid minutes.";
    sheet.getRow(6).height = 30;
    if (logo) {
      const id = book.addImage({
        buffer: logo.bytes as any,
        extension: logo.format === "PNG" ? "png" : "jpeg",
      });
      sheet.addImage(id, {
        tl: { col: 5.5, row: 0.1 },
        ext: (() => {
          const image = new jsPDF().getImageProperties(logo.dataUrl);
          const scale = Math.min(220 / image.width, 90 / image.height);
          return { width: image.width * scale, height: image.height * scale };
        })(),
      });
    }
    sheet.getRow(8).values = headers;
    values.forEach((v) => sheet.addRow(v));
    const last = sheet.rowCount;
    const summary = sheet.addRow([
      "TOTAL",
      `${rows.length} shift${rows.length === 1 ? "" : "s"}`,
      "",
      "",
      "",
      "",
      rows.length ? { formula: `SUM(G9:G${last})`, result: total } : 0,
      "",
    ]);
    sheet.eachRow((row, i) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Calibri", size: 11, color: { argb: "FF17324D" } };
        cell.alignment = { vertical: "middle", wrapText: true };
        if (i === 8 || i === summary.number) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF17324D" },
          };
          cell.font = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: "FFFFFFFF" },
          };
        } else if (i > 8 && i % 2 === 0)
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F5FA" },
          };
      });
      if (i >= 8) row.height = 30;
    });
    sheet.getCell("A1").font = {
      name: "Calibri",
      size: 22,
      bold: true,
      color: { argb: "FF17324D" },
    };
    sheet.getCell("A3").font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: "FF17324D" },
    };
    for (let i = 9; i <= sheet.rowCount; i++)
      sheet.getCell(i, 7).numFmt = "0.00";
    if (rows.length) sheet.autoFilter = `A8:H${last}`;
    sheet.pageSetup.printArea = `A1:H${sheet.rowCount}`;
    sheet.headerFooter.oddFooter =
      "&L" + (business.name || "Schedule") + "&RPage &P of &N";
    return Buffer.from(await book.xlsx.writeBuffer());
  }
  const doc = new jsPDF({ orientation: "landscape", format: "letter" });
  const width = doc.internal.pageSize.getWidth();
  doc.setTextColor(23, 50, 77);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(business.name || "Business", 14, 18, { maxWidth: 175 });
  if (logo) {
    const props = doc.getImageProperties(logo.dataUrl);
    const w = Math.min(65, (24 * props.width) / props.height);
    doc.addImage(
      logo.dataUrl,
      logo.format,
      width - 14 - w,
      9,
      w,
      (w * props.height) / props.width,
    );
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(address, 175), 14, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("LOCATION SCHEDULE", 14, 43);
  doc.setFontSize(10);
  doc.text(
    doc.splitTextToSize(`${location.name} | ${period}`, width - 28),
    14,
    50,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const locLines = doc.splitTextToSize(location.address || "", width - 28);
  doc.text(locLines, 14, 57);
  autoTable(doc, {
    startY: 62 + locLines.length * 4,
    head: [headers],
    body: values.map((v) =>
      v.map((x, i) => (i === 6 ? Number(x).toFixed(2) : String(x))),
    ),
    foot: [
      [
        "TOTAL",
        `${rows.length} shift${rows.length === 1 ? "" : "s"}`,
        "",
        "",
        "",
        "",
        total.toFixed(2),
        "",
      ],
    ],
    showFoot: "lastPage",
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [23, 50, 77] },
    footStyles: { fillColor: [23, 50, 77] },
    alternateRowStyles: { fillColor: [240, 245, 250] },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(
        "Recorded local times • Overnight shifts belong to their start date • Breaks are unpaid minutes",
        14,
        doc.internal.pageSize.getHeight() - 12,
      );
      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        width - 30,
        doc.internal.pageSize.getHeight() - 12,
      );
    },
  });
  return Buffer.from(doc.output("arraybuffer"));
}
