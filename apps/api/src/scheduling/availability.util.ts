// Intervals are half-open: an employee may start another shift exactly when one ends.
export function fitsAvailability(records: any[], start: Date, end: Date): boolean {
  if (!records.length) return true;
  const windows: Array<{ start: number; end: number; available: boolean }> = [];
  for (const record of records) {
    const base = new Date(record.startDate);
    const finish = record.endDate ? new Date(record.endDate) : null;
    if (String(record.repeat).toUpperCase() !== 'WEEKLY') {
      const from = new Date(base);
      const to = finish ? new Date(finish) : new Date(base);
      if (record.allDay) {
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() + 1);
      }
      windows.push({ start: +from, end: +to, available: record.isAvailable });
      continue;
    }
    const days = String(record.repeatDays || '').toLowerCase().split(',').map(d => d.trim());
    const day = new Date(start);
    day.setHours(0, 0, 0, 0);
    // Include the preceding day for windows that continue overnight.
    day.setDate(day.getDate() - 1);
    for (; day < end; day.setDate(day.getDate() + 1)) {
      if (!days.includes(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][day.getDay()])) continue;
      if (record.endOption === 'ENDS_ON' && record.endOn) {
        const last = new Date(record.endOn);
        last.setHours(23, 59, 59, 999);
        if (day > last) continue;
      }
      const from = new Date(day);
      const to = new Date(day);
      if (record.allDay) {
        to.setDate(to.getDate() + 1);
      } else {
        from.setHours(base.getHours(), base.getMinutes(), 0, 0);
        to.setHours(finish?.getHours() ?? 23, finish?.getMinutes() ?? 59, 0, 0);
        if (to <= from) to.setDate(to.getDate() + 1);
      }
      windows.push({ start: +from, end: +to, available: record.isAvailable });
    }
  }
  if (windows.some(w => !w.available && w.start < +end && w.end > +start)) return false;
  // Positive windows define the employee's working availability; gaps remain unavailable.
  if (!records.some(r => r.isAvailable)) return true;
  const allowed = windows.filter(w => w.available).sort((a, b) => a.start - b.start);
  let coveredUntil = +start;
  for (const window of allowed) {
    if (window.start > coveredUntil) break;
    coveredUntil = Math.max(coveredUntil, window.end);
    if (coveredUntil >= +end) return true;
  }
  return false;
}

export function overlapsLeave(leave: any, start: Date, end: Date): boolean {
  const from = new Date(leave.startDate);
  const to = new Date(leave.endDate);
  if (leave.isAllDay) {
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);
    to.setDate(to.getDate() + 1);
  } else {
    if (leave.startTime) {
      const [h, m] = leave.startTime.split(':').map(Number);
      from.setHours(h, m, 0, 0);
    }
    if (leave.endTime) {
      const [h, m] = leave.endTime.split(':').map(Number);
      to.setHours(h, m, 0, 0);
      if (to <= from) to.setDate(to.getDate() + 1);
    }
  }
  const effectiveEnd = leave.resumedAt ? Math.min(+to, +new Date(leave.resumedAt)) : +to;
  return +start < effectiveEnd && +end > +from;
}
