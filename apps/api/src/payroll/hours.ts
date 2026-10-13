import { BadRequestException } from "@nestjs/common";
import { money } from "./us-tax";
export function paidIntervals(timesheet: any): Array<[number, number]> {
  const start = +new Date(timesheet.startTime),
    end = +new Date(timesheet.endTime);
  if (
    !timesheet.endTime ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  )
    throw new BadRequestException(
      "Approved timesheets must have valid completed time ranges.",
    );
  const breaks: Array<[number, number]> = (timesheet.breaks || [])
    .filter((b: any) => String(b.type).toUpperCase() !== "PAID")
    .map((b: any) => {
      const a = +new Date(b.startTime),
        z = +new Date(b.endTime);
      if (!b.endTime || !Number.isFinite(a) || !Number.isFinite(z) || z < a)
        throw new BadRequestException(
          "Unpaid breaks must have valid completed ranges.",
        );
      return [Math.max(a, start), Math.min(z, end)] as [number, number];
    })
    .filter((b: [number, number]) => b[1] > b[0])
    .sort((a: [number, number], b: [number, number]) => a[0] - b[0]);
  let cursor = start;
  const segments: Array<[number, number]> = [];
  for (const [a, z] of breaks) {
    if (a > cursor) segments.push([cursor, a]);
    cursor = Math.max(cursor, z);
  }
  if (cursor < end) segments.push([cursor, end]);
  return segments;
}
// A workweek is a fixed recurring 168-hour period; boundaries cannot reset at payroll dates.
export function calculateHours(
  timesheets: any[],
  start: Date,
  end: Date,
  rate: number,
  eligible: boolean,
  anchor: Date,
) {
  const weekMs = 168 * 3600000,
    lower = +start,
    upper = +end + 1,
    origin = +anchor;
  const buckets = new Map<number, { prior: number; current: number }>();
  const all = timesheets.flatMap(paidIntervals).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < all.length; i++)
    if (all[i][0] < all[i - 1][1])
      throw new BadRequestException(
        "Approved timesheets overlap. Correct them before payroll.",
      );
  for (const [a, z] of all) {
    let cursor = a;
    while (cursor < z) {
      const week = Math.floor((cursor - origin) / weekMs);
      const next = Math.min(z, origin + (week + 1) * weekMs);
      const bucket = buckets.get(week) || { prior: 0, current: 0 };
      bucket.prior += Math.max(0, Math.min(next, lower) - cursor) / 3600000;
      bucket.current +=
        Math.max(0, Math.min(next, upper) - Math.max(cursor, lower)) / 3600000;
      buckets.set(week, bucket);
      cursor = next;
    }
  }
  let regularHours = 0,
    overtimeHours = 0;
  for (const b of buckets.values()) {
    const regular = eligible
      ? Math.min(b.current, Math.max(0, 40 - b.prior))
      : b.current;
    regularHours += regular;
    overtimeHours += b.current - regular;
  }
  const regularPay = money(regularHours * rate),
    overtimePay = money(overtimeHours * rate * 1.5);
  return {
    regularHours,
    overtimeHours,
    regularPay,
    overtimePay,
    grossPay: money(regularPay + overtimePay),
    bonus: 0,
    commission: 0,
    reimbursement: 0,
  };
}
