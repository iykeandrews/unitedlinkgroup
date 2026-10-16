import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadInvoiceLogo } from "../invoices/invoice-logo";
import type { scheduleRows } from "./schedule-export";
type Row = ReturnType<typeof scheduleRows>[number];
const dayMs = 86400000;
const dayLabel = (day: string) =>
  `${new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long" })}\n${dateLabel(day)}`;
const dateLabel = (day: string) =>
  `${day.slice(5, 7)}/${day.slice(8, 10)}/${day.slice(0, 4)}`;
const military = (time: string) => {
  const match = /^(\d+):(\d+)\s*(AM|PM)$/.exec(time);
  if (!match) return time;
  return `${String((Number(match[1]) % 12) + (match[3] === "PM" ? 12 : 0)).padStart(2, "0")}:${match[2]}`;
};
const offset = (r: Row) =>
  Math.round((Date.parse(r.endDay) - Date.parse(r.startDay)) / dayMs);
const slotKey = (r: Row) =>
  `${military(r.startTime)}|${military(r.endTime)}|${offset(r)}|${r.officerCategory || ""}|${r.clientPin || ""}`;
export function scheduleOfficerRgb(id: string): [number, number, number] {
  // Same stable employee palette as the on-screen calendar.
  let hash = 2166136261;
  for (const ch of id)
    hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
  const h = (hash % 3600) / 10,
    s = (65 + ((hash >>> 12) % 20)) / 100,
    l = (86 + ((hash >>> 20) % 8)) / 100;
  const a = s * Math.min(l, 1 - l);
  const color = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [color(0), color(8), color(4)];
}
export type ScheduleGrid = {
  days: string[];
  columns: Array<{ label: string; key: string; lane: number }>;
  cells: Array<Array<Row | null>>;
  rows: Row[];
  part: number;
  parts: number;
};
export function calendarScheduleGrids(
  rows: Row[],
  start: string,
  end: string,
): ScheduleGrid[] {
  const daysInRange =
    Math.floor((Date.parse(end) - Date.parse(start)) / dayMs) + 1;
  const pageCount = Math.ceil(daysInRange / 16);
  const daysPerPage = Math.ceil(daysInRange / pageCount);
  const weeks: string[][] = [];
  for (let n = 0; n < daysInRange; n++) {
    if (n % daysPerPage === 0) weeks.push([]);
    weeks[weeks.length - 1].push(
      new Date(Date.parse(start) + n * dayMs).toISOString().slice(0, 10),
    );
  }
  return weeks.flatMap((days) => {
    const weekRows = rows.filter(
      (r) => r.startDay >= days[0] && r.startDay <= days[days.length - 1],
    );
    const keys = [...new Set(weekRows.map(slotKey))].sort();
    const columns: ScheduleGrid["columns"] = [];
    for (const key of keys) {
      const matches = weekRows.filter((r) => slotKey(r) === key);
      const count = Math.max(
        ...days.map((d) => matches.filter((r) => r.startDay === d).length),
      );
      const sample = matches[0];
      const next = offset(sample)
        ? ` (+${offset(sample)} day${offset(sample) > 1 ? "s" : ""})`
        : "";
      for (let lane = 0; lane < count; lane++)
        columns.push({
          key,
          lane,
          label: `${[sample.clientPin ? `PIN: ${sample.clientPin}` : "", sample.officerCategory?.replaceAll("_", " ")].filter(Boolean).join(" | ")}${sample.clientPin || sample.officerCategory ? "\n" : ""}${military(sample.startTime)} - ${military(sample.endTime)}${next}\n(${sample.startTime} - ${sample.endTime})${count > 1 ? `\nCoverage ${lane + 1}` : ""}`,
        });
    }
    if (!columns.length)
      columns.push({ key: "empty", lane: 0, label: "No scheduled shifts" });
    const parts = 1;
    return Array.from({ length: parts }, (_, part) => {
      const subset = columns;
      const cells = days.map((day) =>
        subset.map(
          (c) =>
            weekRows
              .filter((r) => r.startDay === day && slotKey(r) === c.key)
              .sort(
                (a, b) =>
                  String(a.employeeId || a.officer).localeCompare(
                    String(b.employeeId || b.officer),
                  ) || a.id.localeCompare(b.id),
              )[c.lane] || null,
        ),
      );
      return {
        days,
        columns: subset,
        cells,
        rows: cells.flat().filter((r): r is Row => !!r),
        part: part + 1,
        parts,
      };
    });
  });
}
const cellText = (r: Row | null, compact = false) =>
  r
    ? compact
      ? `${r.officer.toUpperCase()}${r.status === "DRAFT" ? " (DRAFT)" : ""}`
      : `${r.officer.toUpperCase()}\n${r.hours.toFixed(2)} hrs${r.breakMinutes ? ` | Break ${r.breakMinutes} min` : ""}${r.status === "DRAFT" ? " | DRAFT" : ""}`
    : "—";
const headerColors: [number, number, number][] = [
  [226, 240, 217],
  [221, 235, 247],
  [255, 242, 204],
];
const hex = (rgb: number[]) =>
  "FF" +
  rgb
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
function pins(value: any): string[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string" && v.trim())
      : [];
  } catch {
    return [];
  }
}
export async function buildCalendarScheduleExport(
  business: any,
  location: any,
  rows: Row[],
  start: string,
  end: string,
  format: "xlsx" | "pdf",
) {
  const logo = await loadInvoiceLogo(business.logoUrl);
  const businessAddress = [
    business.address,
    [business.city, business.state, business.zip].filter(Boolean).join(", "),
    business.mobile,
  ]
    .filter(Boolean)
    .join(" | ");
  const locationHeading = [location.address, `(${location.name})`]
    .filter(Boolean)
    .join(" ");
  const references = [
    location.workOrder ? `Work order: ${location.workOrder}` : "",
    pins(location.billingPins).length
      ? `Billing PINs: ${pins(location.billingPins).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const grids = calendarScheduleGrids(rows, start, end);
  const heading = (g: ScheduleGrid) =>
    `SCHEDULE FOR ${dateLabel(g.days[0])} - ${dateLabel(g.days[g.days.length - 1])}${g.parts > 1 ? ` | Columns ${g.part} of ${g.parts}` : ""}`;
  const summary = (g: ScheduleGrid) =>
    `${g.rows.length} shifts | Net hours: ${g.rows.reduce((sum, r) => sum + r.hours, 0).toFixed(2)} | Unpaid breaks: ${g.rows.reduce((sum, r) => sum + r.breakMinutes, 0)} min`;
  const note =
    "Recorded local times. +1 day means the shift finishes the following day. A dash means no scheduled shift.";
  if (format === "xlsx") {
    const book = new ExcelJS.Workbook();
    book.creator = business.name;
    book.created = new Date();
    const logoId = logo
      ? book.addImage({
          buffer: logo.bytes as any,
          extension: logo.format === "PNG" ? "png" : "jpeg",
        })
      : undefined;
    for (const grid of grids) {
      const cols = grid.columns.length + 1;
      const sheet = book.addWorksheet(
        `${grid.days[0]}${grid.parts > 1 ? `-${grid.part}` : ""}`,
        {
          views: [
            { state: "frozen", xSplit: 1, ySplit: 7, showGridLines: false },
          ],
          pageSetup: {
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            paperSize: 1 as ExcelJS.PaperSize,
            horizontalCentered: true,
            margins: {
              left: 0.25,
              right: 0.25,
              top: 0.3,
              bottom: 0.35,
              header: 0.1,
              footer: 0.15,
            },
          },
        },
      );
      sheet.columns = [
        { width: 18 },
        ...grid.columns.map(() => ({ width: 21 })),
      ];
      for (let i = 1; i <= 6; i++) sheet.mergeCells(i, 1, i, cols);
      sheet.getRow(1).height = logo ? 46 : 8;
      if (logo && logoId !== undefined) {
        const props = new jsPDF().getImageProperties(logo.dataUrl);
        const total = 126 + grid.columns.length * 147;
        const scale = Math.min(
          Math.min(450, total - 20) / props.width,
          52 / props.height,
        );
        const w = props.width * scale;
        const left = (total - w) / 2;
        const col = left < 126 ? left / 126 : 1 + (left - 126) / 147;
        const wholeCol = Math.floor(col);
        const anchor = {
          col,
          row: 0,
          nativeCol: wholeCol,
          nativeRow: 0,
          nativeColOff: Math.round(
            (left - (wholeCol === 0 ? 0 : 126 + (wholeCol - 1) * 147)) * 9525,
          ),
          nativeRowOff: 19050,
        };
        sheet.addImage(logoId, {
          tl: anchor,
          ext: { width: w, height: props.height * scale },
        });
      }
      sheet.getCell("A2").value = business.name || "Business";
      sheet.getRow(2).height = 18;
      sheet.getCell("A3").value = businessAddress;
      sheet.getRow(3).height = 20;
      sheet.getCell("A4").value = locationHeading;
      sheet.getRow(4).height = Math.max(
        28,
        Math.ceil(locationHeading.length / (cols * 16)) * 12,
      );
      sheet.getCell("A5").value = heading(grid);
      sheet.getRow(5).height = 22;
      sheet.getCell("A6").value = references || "LOCATION SCHEDULE";
      sheet.getRow(6).height = Math.max(
        18,
        Math.ceil(references.length / (cols * 18)) * 11,
      );
      sheet.getRow(7).values = [
        "Schedule dates",
        ...grid.columns.map((c) => c.label),
      ];
      sheet.getRow(7).height = 44;
      for (let index = 0; index < grid.days.length; index++) {
        const row = sheet.getRow(8 + index);
        row.values = [
          dayLabel(grid.days[index]),
          ...grid.cells[index].map((r) => cellText(r, grid.days.length > 8)),
        ];
        const headerHeight = Array.from(
          { length: 7 },
          (_, i) => sheet.getRow(i + 1).height || 15,
        ).reduce((n, h) => n + h, 0);
        row.height = Math.max(16, (535 - headerHeight - 42) / grid.days.length);
      }
      const bottom = 8 + grid.days.length;
      sheet.mergeCells(bottom, 1, bottom, cols);
      sheet.getCell(bottom, 1).value = summary(grid);
      sheet.getRow(bottom).height = 20;
      sheet.mergeCells(bottom + 1, 1, bottom + 1, cols);
      sheet.getCell(bottom + 1, 1).value = note;
      sheet.getRow(bottom + 1).height = 22;
      sheet.eachRow((row, i) =>
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.font = {
            name: "Arial",
            size:
              i === 2 || i === 4 || i === 5 ? 11 : grid.days.length > 8 ? 8 : 9,
            bold: i !== 3 && i !== bottom + 1,
            color: { argb: "FF111111" },
          };
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          if (i >= 4 && i <= bottom) {
            cell.border = {
              top: { style: "thin", color: { argb: "FF222222" } },
              bottom: { style: "thin", color: { argb: "FF222222" } },
              left: { style: "thin", color: { argb: "FF222222" } },
              right: { style: "thin", color: { argb: "FF222222" } },
            };
          }
          if (i === 7 && col > 1)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: hex(headerColors[Math.floor((col - 2) / 2) % 3]),
              },
            };
          if (i >= 8 && i < bottom) {
            const officer = col > 1 ? grid.cells[i - 8][col - 2] : null;
            const color =
              col === 1
                ? [255, 232, 219]
                : officer
                  ? officer.employeeId
                    ? scheduleOfficerRgb(officer.employeeId)
                    : [235, 235, 235]
                  : [247, 247, 247];
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: hex(color) },
            };
          }
        }),
      );
      sheet.pageSetup.printArea = `A1:${sheet.getColumn(cols).letter}${bottom + 1}`;
      sheet.headerFooter.oddFooter = `&L${String(business.name || "Schedule").replace(/&/g, "&&")}&RPage &P of &N`;
    }
    return Buffer.from(await book.xlsx.writeBuffer());
  }
  const doc = new jsPDF({ orientation: "landscape", format: "letter" });
  const w = doc.internal.pageSize.getWidth(),
    h = doc.internal.pageSize.getHeight();
  for (let index = 0; index < grids.length; index++) {
    const grid = grids[index];
    if (index) doc.addPage();
    let y = 10;
    if (logo) {
      const props = doc.getImageProperties(logo.dataUrl);
      const scale = Math.min(110 / props.width, 16 / props.height);
      const lw = props.width * scale,
        lh = props.height * scale;
      doc.addImage(logo.dataUrl, logo.format, (w - lw) / 2, y, lw, lh);
      y += lh + 3;
    }
    doc.setTextColor(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(business.name || "Business", w / 2, y + 4, {
      align: "center",
      maxWidth: w - 20,
    });
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const companyLines = doc.splitTextToSize(businessAddress, w - 24);
    doc.text(companyLines, w / 2, y, { align: "center" });
    y += companyLines.length * 3 + 3;
    const banner = (text: string, size: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, w - 28);
      const bh = lines.length * 4.3 + 5;
      doc.setDrawColor(30);
      doc.rect(10, y, w - 20, bh);
      doc.text(lines, w / 2, y + 5, { align: "center" });
      y += bh;
    };
    banner(locationHeading, 10);
    banner(heading(grid), 10);
    if (references) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const lines = doc.splitTextToSize(references, w - 24);
      doc.text(lines, w / 2, y + 4, { align: "center" });
      y += lines.length * 3 + 5;
    }
    const columnWidth = (w - 20 - 32) / grid.columns.length;
    const rowHeight = (h - 23 - y - 14) / grid.days.length;
    const body = grid.days.map((day, i) => [
      dayLabel(day),
      ...grid.cells[i].map((r) => cellText(r, grid.days.length > 8)),
    ]);
    let bodyFont = grid.days.length > 8 ? 7 : 8.5;
    doc.setFont("helvetica", "bold");
    while (bodyFont > 3) {
      doc.setFontSize(bodyFont);
      const maxLines = Math.max(
        ...body.flatMap((row) =>
          row.map(
            (value, col) =>
              doc.splitTextToSize(value, (col === 0 ? 32 : columnWidth) - 1.2)
                .length,
          ),
        ),
      );
      if (maxLines * bodyFont * 0.35278 * 1.15 + 1.2 <= rowHeight) break;
      bodyFont -= 0.25;
    }
    let headerFont = 7;
    while (headerFont > 3) {
      doc.setFontSize(headerFont);
      const lines = Math.max(
        ...["Schedule dates", ...grid.columns.map((c) => c.label)].map(
          (t, i) =>
            doc.splitTextToSize(t, (i === 0 ? 32 : columnWidth) - 1.2).length,
        ),
      );
      if (lines * headerFont * 0.35278 * 1.15 + 1.2 <= 14) break;
      headerFont -= 0.25;
    }
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["Schedule dates", ...grid.columns.map((c) => c.label)]],
      body,
      styles: {
        font: "helvetica",
        fontSize: bodyFont,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        cellPadding: 0.6,
        lineWidth: 0.2,
        lineColor: [30, 30, 30],
        textColor: [15, 15, 15],
        overflow: "linebreak",
        minCellHeight: rowHeight,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [15, 15, 15],
        fontSize: headerFont,
        minCellHeight: 14,
      },
      columnStyles: Object.fromEntries(
        Array.from({ length: grid.columns.length + 1 }, (_, i) => [
          i,
          { cellWidth: i === 0 ? 32 : columnWidth },
        ]),
      ),
      margin: { left: 10, right: 10, top: 12, bottom: 21 },
      rowPageBreak: "avoid",
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index > 0)
          data.cell.styles.fillColor =
            headerColors[Math.floor((data.column.index - 1) / 2) % 3];
        if (data.section === "body") {
          const row =
            data.column.index > 0
              ? grid.cells[data.row.index][data.column.index - 1]
              : null;
          data.cell.styles.fillColor =
            data.column.index === 0
              ? [255, 232, 219]
              : row?.employeeId
                ? scheduleOfficerRgb(row.employeeId)
                : [247, 247, 247];
        }
      },
      didDrawPage: () => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(40);
        doc.text(summary(grid), 10, h - 14);
        doc.text(note, 10, h - 9, { maxWidth: w - 40 });
        doc.text(String(doc.getNumberOfPages()), w - 12, h - 9, {
          align: "right",
        });
      },
    });
  }
  return Buffer.from(doc.output("arraybuffer"));
}
