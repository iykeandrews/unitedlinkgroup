import assert from "node:assert/strict";
import fs from "node:fs";
import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import {
  validateScheduleDates,
  scheduleRows,
  buildScheduleExport,
} from "../src/scheduling/schedule-export";
import {
  calendarScheduleGrids,
  scheduleOfficerRgb,
} from "../src/scheduling/schedule-grid";
async function main() {
  assert.throws(() => validateScheduleDates("2026-02-30", "2026-03-01"));
  assert.throws(() => validateScheduleDates("2026-10-01", "2026-09-30"));
  validateScheduleDates("2026-09-16", "2026-09-30");
  const night = {
    id: "night",
    employeeId: "sample-officer",
    locationId: "a",
    startTime: "2026-10-01T03:00Z",
    endTime: "2026-10-01T11:00Z",
    timeZone: "America/New_York",
    breakMinutes: 30,
    status: "COMPLETED",
    employee: { firstName: "Sample", lastName: "Officer" },
    location: { name: "Sample site" },
  };
  const rows = scheduleRows(
    [
      night,
      { ...night, id: "other", locationId: "b" },
      { ...night, id: "cancelled", status: "CANCELLED" },
      { ...night, id: "next", startTime: "2026-10-01T05:00Z" },
    ],
    "2026-09-16",
    "2026-09-30",
    "a",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hours, 7.5);
  assert.equal(rows[0].startDate, "09/30/2026");
  assert.equal(rows[0].endDate, "10/01/2026");
  assert.equal(rows[0].startTime, "11:00 PM");
  const business = {
    name: "Sample Business",
    logoUrl:
      "data:image/png;base64,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",
    address: "123 Sample Street",
    city: "Washington",
    state: "DC",
    zip: "20001",
  };
  const location = {
    name: "Sample site",
    address: "456 Example Avenue, Washington, DC 20001",
  };
  const overnightGrid = calendarScheduleGrids(rows, "2026-09-30", "2026-09-30");
  assert.match(overnightGrid[0].columns[0].label, /23:00 - 07:00 \(\+1 day\)/);
  assert.equal(overnightGrid[0].cells[0][0]?.hours, 7.5);
  const concurrent = calendarScheduleGrids(
    [
      ...rows,
      {
        ...rows[0],
        id: "second",
        employeeId: "other",
        officer: "Second Officer",
      },
    ],
    "2026-09-30",
    "2026-09-30",
  );
  assert.equal(concurrent[0].columns.length, 2);
  assert.equal(concurrent[0].rows.length, 2);
  assert.deepEqual(scheduleOfficerRgb("stable"), scheduleOfficerRgb("stable"));
  assert.notDeepEqual(
    scheduleOfficerRgb("stable"),
    scheduleOfficerRgb("different"),
  );
  const fixture = [];
  for (let day = 27; day <= 30; day++)
    for (let position = 0; position < 6; position++) {
      const startHour = position % 2 ? 14 : 6;
      fixture.push({
        ...night,
        id: `day-${day}-post-${position}`,
        employeeId: `officer-${position}`,
        employee: {
          id: `officer-${position}`,
          firstName: ["Alex", "Jordan", "Morgan", "Taylor", "Casey", "Sam"][
            position
          ],
          lastName: "Sample",
        },
        startTime: `2026-09-${day}T${String(startHour + 4).padStart(2, "0")}:00:00Z`,
        endTime: new Date(
          Date.parse(
            `2026-09-${day}T${String(startHour + 4).padStart(2, "0")}:00:00Z`,
          ) +
            8 * 3600000,
        ).toISOString(),
      });
    }
  const matrixRows = scheduleRows(fixture, "2026-09-27", "2026-10-03", "a");
  const grids = calendarScheduleGrids(matrixRows, "2026-09-27", "2026-10-03");
  assert.equal(grids.length, 1);
  assert.equal(grids[0].days.length, 7);
  assert.equal(grids[0].columns.length, 6);
  assert.equal(grids[0].rows.length, 24);
  assert.equal(new Set(grids.flatMap((g) => g.rows.map((r) => r.id))).size, 24);
  const manyColumns = calendarScheduleGrids(
    Array.from({ length: 9 }, (_, i) => ({
      ...rows[0],
      id: `concurrent-${i}`,
      employeeId: `person-${i}`,
    })),
    "2026-09-30",
    "2026-09-30",
  );
  assert.equal(manyColumns.length, 2);
  assert.equal(
    manyColumns.reduce((n, g) => n + g.rows.length, 0),
    9,
  );
  const xlsx = await buildScheduleExport(
    business,
    { ...location, billingPins: '["0388","3118"]' },
    matrixRows,
    "2026-09-27",
    "2026-10-03",
    "xlsx",
  );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx as any);
  const sheet = workbook.worksheets[0];
  assert.equal(workbook.worksheets.length, 1);
  assert.equal(sheet.pageSetup.orientation, "landscape");
  assert.equal(sheet.getImages().length, 1);
  assert.equal(sheet.getCell("A2").value, business.name);
  assert.match(String(sheet.getCell("A3").value), /20001/);
  assert.match(String(sheet.getCell("A6").value), /0388, 3118/);
  assert.equal(sheet.getCell("A7").value, "Schedule dates");
  assert.match(String(sheet.getCell("A8").value), /Sunday/);
  assert.match(String(sheet.getCell("B8").value), /SAMPLE/);
  assert.match(String(sheet.getCell("A15").value), /Net hours: 180.00/);
  assert.deepEqual(sheet.getCell("B8").fill, sheet.getCell("B9").fill);
  assert.notDeepEqual(sheet.getCell("B8").fill, sheet.getCell("C8").fill);
  const pdf = await buildScheduleExport(
    business,
    location,
    matrixRows,
    "2026-09-27",
    "2026-10-10",
    "pdf",
  );
  const document = await PDFDocument.load(pdf);
  assert.equal(document.getPages().length, 2);
  for (const page of document.getPages())
    assert(page.getWidth() > page.getHeight());
  fs.writeFileSync("/private/tmp/schedule-export-sample.xlsx", xlsx);
  fs.writeFileSync("/private/tmp/schedule-export-sample.pdf", pdf);
  console.log(
    `Calendar export checks passed (${process.env.TZ}): weekly matrix, source dates, overnight shifts, concurrent officers, colors, totals, logo, billing PINs and landscape pages.`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
