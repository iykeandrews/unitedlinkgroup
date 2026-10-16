export const OFFICER_CATEGORIES = {
  ARMED_SPO: "Armed Special Police Officer (SPO)",
  UNARMED_SPO: "Unarmed Special Police Officer (SPO)",
  SO: "Security Officer (SO)",
  SG: "Security Guard (SG)",
  PD: "Private Detective (PD)",
  ASG: "Armed Security Guard (ASG)",
} as const;
export const SHIFT_CLASSIFICATIONS = [
  "MORNING",
  "AFTERNOON",
  "OVERNIGHT",
] as const;
export function billingPinList(value: any): string[] {
  try {
    const list = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(list)
      ? list
          .filter((v) => typeof v === "string" && v.trim())
          .map((v) => v.trim())
      : [];
  } catch {
    return [];
  }
}
export function shiftMatchesConfiguration(
  shift: any,
  config: any,
  location: any,
  employee: any,
): boolean {
  if (
    !config.isActive ||
    config.locationId !== shift.locationId ||
    employee?.officerCategory !== config.officerCategory
  )
    return false;
  const clock = (value: any) => {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: shift.timeZone || location.timeZone || "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(value));
    const part = (k: string) => p.find((x) => x.type === k)?.value;
    return {
      time: `${part("hour")}:${part("minute")}`,
      day: `${part("year")}-${part("month")}-${part("day")}`,
    };
  };
  const a = clock(shift.startTime),
    b = clock(shift.endTime);
  const next = config.endTime <= config.startTime ? 1 : 0;
  return (
    a.time === config.startTime &&
    b.time === config.endTime &&
    (Date.parse(b.day) - Date.parse(a.day)) / 86400000 === next
  );
}
export function resolveClientPin(
  shift: any,
  location: any,
  configs: any[],
  employee: any,
) {
  if (location?.status && location.status !== "ACTIVE")
    return { state: "LOCATION_INACTIVE", pin: null };
  if (employee?.status && employee.status !== "ACTIVE")
    return { state: "OFFICER_INACTIVE", pin: null };
  if (!billingPinList(location.billingPins).length)
    return { state: "NOT_REQUIRED", pin: null };
  if (!employee?.officerCategory)
    return { state: "CATEGORY_REQUIRED", pin: null };
  const matches = configs.filter((c) =>
    shiftMatchesConfiguration(shift, c, location, employee),
  );
  if (matches.length !== 1)
    return {
      state: matches.length ? "AMBIGUOUS_CONFIGURATION" : "NOT_CONFIGURED",
      pin: null,
    };
  const config = matches[0],
    pin = config.pin;
  const linked = pin?.configurations || [];
  const categories = new Set(linked.map((c: any) => c.officerCategory));
  if (
    !pin?.isActive ||
    pin.locationId !== location.id ||
    !billingPinList(location.billingPins).includes(pin.billingPin) ||
    (!pin.allowCrossCategory && categories.size > 1)
  )
    return {
      state: "PIN_UNAVAILABLE",
      pin: null,
      configurationId: config.id,
      classification: config.classification,
    };
  return {
    state: "ASSIGNED",
    pin: pin.billingPin,
    pinLabel: pin.label,
    configurationId: config.id,
    classification: config.classification,
    officerCategory: config.officerCategory,
    configurationName: config.name,
  };
}
