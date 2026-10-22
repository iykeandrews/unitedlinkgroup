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
  const buckets = new Map<number, number>();
  const all = timesheets
    .flatMap((sheet) => {
      return paidIntervals(sheet).map(([a, z]) => ({
        a,
        z,
        paidExternally: sheet.paidExternally === true,
        shiftRate: sheet.shiftHourlyRate ?? rate,
      }));
    })
    .sort((a, b) => a.a - b.a);
  for (let i = 1; i < all.length; i++)
    if (all[i].a < all[i - 1].z)
      throw new BadRequestException(
        "Approved timesheets overlap. Correct them before payroll.",
      );
  let regularHours = 0,
    overtimeHours = 0,
    regularEarnings = 0,
    overtimeEarnings = 0;
  for (const { a, z, paidExternally, shiftRate } of all) {
    let cursor = a;
    while (cursor < z) {
      const week = Math.floor((cursor - origin) / weekMs);
      const next = Math.min(
        z,
        origin + (week + 1) * weekMs,
        cursor < lower ? lower : cursor < upper ? upper : z,
      );
      const hours = (next - cursor) / 3600000;
      const consumed = buckets.get(week) || 0;
      const regular = eligible
        ? Math.min(hours, Math.max(0, 40 - consumed))
        : hours;
      // Paid historical work still counts toward weekly overtime, but is never paid twice.
      if (cursor >= lower && cursor < upper && !paidExternally) {
        regularEarnings += regular * shiftRate;
        overtimeEarnings += (hours - regular) * shiftRate * 1.5;
        regularHours += regular;
        overtimeHours += hours - regular;
      }
      buckets.set(week, consumed + hours);
      cursor = next;
    }
  }
  // Fixed additional compensation has equivalent paid hours, without fabricated attendance.
  for (const sheet of timesheets) {
    if (
      sheet.paidExternally ||
      +new Date(sheet.startTime) < lower ||
      +new Date(sheet.startTime) >= upper
    )
      continue;
    const extra = Number(sheet.additionalWorkAmount || 0),
      shiftRate = sheet.shiftHourlyRate ?? rate;
    if (extra > 0 && shiftRate > 0) {
      regularHours += extra / shiftRate;
      regularEarnings += extra;
    }
  }
  const regularPay = money(regularEarnings),
    overtimePay = money(overtimeEarnings);
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
