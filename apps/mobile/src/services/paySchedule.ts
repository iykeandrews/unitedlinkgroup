// US operating calendar; dates are civil dates, independent of the phone's zone.
export function nextPaycheck(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (key: string) =>
    Number(parts.find((p) => p.type === key)?.value);
  const year = read("year"),
    month = read("month") - 1,
    day = read("day");
  const civil = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  if (day === 1)
    return {
      due: civil(year, month, 1),
      start: civil(year, month - 1, 1),
      end: civil(year, month - 1, 15),
    };
  if (day <= 15)
    return {
      due: civil(year, month, 15),
      start: civil(year, month - 1, 16),
      end: civil(year, month, 0),
    };
  return {
    due: civil(year, month + 1, 1),
    start: civil(year, month, 1),
    end: civil(year, month, 15),
  };
}
export const payDateLabel = (value: string) => {
  const [y, m, d] = value.split("-");
  return `${m}/${d}/${y}`;
};
