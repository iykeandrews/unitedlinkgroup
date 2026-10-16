import { buildCalendarScheduleExport } from "./schedule-grid";
import { BadRequestException } from "@nestjs/common";

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
        officerCategory: s.employee?.officerCategory || null,
        clientPin: s.clientPinAssignment?.pin || null,
        classification: s.clientPinAssignment?.classification || null,
        employeeId: s.employeeId || s.employee?.id || null,
        startDay: a.day,
        endDay: b.day,
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
  return buildCalendarScheduleExport(
    business,
    location,
    rows,
    start,
    end,
    format,
  );
}
