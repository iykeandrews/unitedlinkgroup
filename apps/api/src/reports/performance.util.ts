/** Descriptive attendance metrics, never an automated employee rating. */
export function reportHours(sheet: any, start: number, end: number): number {
  if (!sheet.endTime) return 0;
  const from = Math.max(+new Date(sheet.startTime), start),
    to = Math.min(+new Date(sheet.endTime), end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  const intervals = (sheet.breaks || [])
    .filter((b: any) => b.type !== "PAID")
    .map((b: any) => [
      Math.max(from, +new Date(b.startTime)),
      Math.min(to, b.endTime ? +new Date(b.endTime) : to),
    ])
    .filter(
      (v: number[]) =>
        Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[1] > v[0],
    )
    .sort((a: number[], b: number[]) => a[0] - b[0]);
  let removed = 0,
    cursor = from;
  for (const [a, b] of intervals) {
    removed += Math.max(0, b - Math.max(cursor, a));
    cursor = Math.max(cursor, b);
  }
  return Math.max(0, (to - from - removed) / 3600000);
}
export function performanceMetrics(
  sheets: any[],
  shifts: any[],
  start: Date,
  end: Date,
  now = new Date(),
) {
  const people = new Map<string, any>();
  const ensure = (id: string, employee: any) => {
    if (!people.has(id))
      people.set(id, {
        employeeId: id,
        name: employee
          ? `${employee.firstName} ${employee.lastName}`.trim()
          : id,
        email: employee?.email || "",
        hours: 0,
        plannedHours: 0,
        onTime: 0,
        late: 0,
        missed: 0,
        upcoming: 0,
        openTimesheets: 0,
        lateMinutes: 0,
        timesheets: 0,
      });
    return people.get(id);
  };
  const valid = sheets.filter(
    (t) =>
      !["DISCARDED", "REJECTED"].includes(t.status) &&
      Number.isFinite(+new Date(t.startTime)),
  );
  for (const t of valid) {
    const row = ensure(t.employeeId, t.employee);
    row.timesheets++;
    row.hours += reportHours(t, +start, +end);
    if (!t.endTime) row.openTimesheets++;
  }
  const used = new Set<string>();
  for (const shift of [...shifts].sort(
    (a, b) => +new Date(a.startTime) - +new Date(b.startTime),
  )) {
    if (
      !shift.employeeId ||
      !["PUBLISHED", "COMPLETED"].includes(shift.status) ||
      !shift.endTime
    )
      continue;
    const from = +new Date(shift.startTime),
      to = +new Date(shift.endTime);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) continue;
    const row = ensure(shift.employeeId, shift.employee);
    row.plannedHours += Math.max(
      0,
      (Math.min(to, +end) - Math.max(from, +start)) / 3600000 -
        (shift.breakMinutes || 0) / 60,
    );
    if (from > +now) {
      row.upcoming++;
      continue;
    }
    const matching = valid
      .filter(
        (t) =>
          t.employeeId === shift.employeeId &&
          !used.has(t.id) &&
          (!shift.locationId ||
            !t.locationId ||
            shift.locationId === t.locationId) &&
          +new Date(t.startTime) >= from - 4 * 3600000 &&
          +new Date(t.startTime) < to,
      )
      .sort(
        (a, b) =>
          Math.abs(+new Date(a.startTime) - from) -
          Math.abs(+new Date(b.startTime) - from),
      )[0];
    if (!matching) {
      if (to <= +now) row.missed++;
      else row.upcoming++;
      continue;
    }
    used.add(matching.id);
    const minutes = Math.max(
      0,
      Math.round((+new Date(matching.startTime) - from) / 60000),
    );
    if (minutes <= 5) row.onTime++;
    else {
      row.late++;
      row.lateMinutes += minutes;
    }
  }
  const rows = Array.from(people.values())
    .map((row) => ({
      ...row,
      hours: Math.round(row.hours * 100) / 100,
      plannedHours: Math.round(row.plannedHours * 100) / 100,
      averageLateMinutes: row.late
        ? Math.round((row.lateMinutes / row.late) * 10) / 10
        : 0,
      punctuality:
        row.onTime + row.late + row.missed
          ? Math.round(
              (row.onTime / (row.onTime + row.late + row.missed)) * 1000,
            ) / 10
          : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const totals = rows.reduce(
    (a, r) => {
      for (const key of [
        "hours",
        "plannedHours",
        "onTime",
        "late",
        "missed",
        "upcoming",
        "openTimesheets",
        "timesheets",
      ])
        a[key] += r[key];
      return a;
    },
    {
      hours: 0,
      plannedHours: 0,
      onTime: 0,
      late: 0,
      missed: 0,
      upcoming: 0,
      openTimesheets: 0,
      timesheets: 0,
    } as any,
  );
  totals.hours = Math.round(totals.hours * 100) / 100;
  totals.plannedHours = Math.round(totals.plannedHours * 100) / 100;
  totals.punctuality =
    totals.onTime + totals.late + totals.missed
      ? Math.round(
          (totals.onTime / (totals.onTime + totals.late + totals.missed)) *
            1000,
        ) / 10
      : null;
  return {
    rows,
    totals,
    range: { start: start.toISOString(), end: end.toISOString() },
    graceMinutes: 5,
  };
}
