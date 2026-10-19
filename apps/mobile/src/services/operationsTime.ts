// Work-site wall times must not move when the phone changes time zone.
export function wallParts(value: string, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const read = (type: string) =>
    parts.find((p) => p.type === type)?.value || "00";
  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${read("hour")}:${read("minute")}`,
    second: read("second"),
  };
}
export function wallToIso(
  date: string,
  time: string,
  zone: string,
  original?: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw Error("Choose a valid date and time");
  if (original) {
    const old = wallParts(original, zone);
    if (old.date === date && old.time === time) return original;
  }
  const target = Date.parse(date + "T" + time + ":00Z");
  if (!Number.isFinite(target)) throw Error("Choose a valid date and time");
  let guess = target;
  for (let i = 0; i < 5; i++) {
    const p = wallParts(new Date(guess).toISOString(), zone);
    const shown = Date.parse(p.date + "T" + p.time + ":" + p.second + "Z");
    guess += target - shown;
  }
  const result = new Date(guess).toISOString(),
    check = wallParts(result, zone);
  if (check.date !== date || check.time !== time)
    throw Error(
      "This time does not exist at the work site because of daylight saving time. Choose another time.",
    );
  return result;
}
export function siteLabel(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
