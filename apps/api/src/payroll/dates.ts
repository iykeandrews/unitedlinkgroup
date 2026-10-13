import { BadRequestException } from "@nestjs/common";
export function calendarBoundary(
  day: string,
  timeZone: string,
  end = false,
): Date {
  let target = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(target))
    throw new BadRequestException("Invalid payroll date.");
  if (end) target += 86400000;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const parts: any = {};
    formatter
      .formatToParts(new Date(instant))
      .forEach((p) => (parts[p.type] = p.value));
    const wall = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    );
    const diff = target - wall;
    instant += diff;
    if (!diff) break;
  }
  return new Date(instant - (end ? 1 : 0));
}

export function fullSalaryPeriod(
  start: Date,
  end: Date,
  schedule: string,
  zone: string,
): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = (date: Date) =>
    Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const a = parts(start),
    b = parts(end);
  const from = Date.UTC(+a.year, +a.month - 1, +a.day);
  const to = Date.UTC(+b.year, +b.month - 1, +b.day);
  const days = (to - from) / 86400000 + 1;
  if (schedule === "WEEKLY") return days === 7;
  if (schedule === "BIWEEKLY") return days === 14;
  const sameMonth = a.year === b.year && a.month === b.month;
  const monthEnd = new Date(Date.UTC(+a.year, +a.month, 0)).getUTCDate();
  if (schedule === "MONTHLY")
    return sameMonth && +a.day === 1 && +b.day === monthEnd;
  if (schedule === "SEMIMONTHLY")
    return (
      sameMonth &&
      ((+a.day === 1 && +b.day === 15) ||
        (+a.day === 16 && +b.day === monthEnd))
    );
  return false;
}
