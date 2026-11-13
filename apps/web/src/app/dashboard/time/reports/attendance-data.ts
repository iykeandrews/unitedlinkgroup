import { formatRecordTime } from '../../../../lib/time/record-zone';

export type Person = { id: string; firstName?: string; lastName?: string; role?: string };
export type Site = { id: string; name: string };
export type Punch = {
  id: string; startTime: string; endTime?: string | null; timeZone?: string | null;
  status: string; location?: Site | null; employee?: Person | null;
  breaks?: { startTime: string; endTime?: string | null; type: string }[];
};
export type Callout = {
  id: string; noticeAt: string; status: string; type: string; reasonCode: string; reasonNote?: string;
  employee?: Person | null;
  shift?: { startTime: string; endTime?: string; timeZone?: string; location?: Site | null } | null;
};
export type Assessment = {
  id: string; observedAt: string; score: number; notes: string; action: string;
  followUpAt?: string | null; ratings: string; checklist: string;
  employee: Person; evaluator?: Omit<Person, 'id'> | null; location: Site;
};
export type Report = { timesheets: Punch[]; callouts: Callout[]; assessments: Assessment[] };
export type Officer = { employee: Person; punches: Punch[]; callouts: Callout[]; assessments: Assessment[] };

export const label = (value?: string) => value?.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) || '—';
export const name = (person?: Omit<Person, 'id'> | null) => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Unknown officer';
export const displayDate = (day: string) => day ? day.slice(5, 7) + '/' + day.slice(8, 10) + '/' + day.slice(0, 4) : '—';
export const hours = (minutes: number) => (minutes / 60).toFixed(2);

export function punchMinutes(punch: Punch) {
  const start = Date.parse(punch.startTime);
  const end = Date.parse(punch.endTime ?? '');
  if (!(end > start)) return { worked: null, unpaid: 0 };
  const breaks = (punch.breaks ?? []).filter(entry => entry.type === 'UNPAID')
    .map(entry => [Math.max(start, Date.parse(entry.startTime)), Math.min(end, Date.parse(entry.endTime ?? ''))])
    .filter(([from, to]) => to > from).sort(([a], [b]) => a - b);
  let lastEnd = start;
  let deducted = 0;
  for (const [from, to] of breaks) {
    deducted += Math.max(0, to - Math.max(lastEnd, from));
    lastEnd = Math.max(lastEnd, to);
  }
  return { worked: (end - start - deducted) / 60000, unpaid: Math.round(deducted / 60000) };
}

export function officerTotals(punches: Punch[]) {
  let worked = 0;
  let approved = 0;
  let open = 0;
  const dates = new Set<string>();
  for (const punch of punches) {
    dates.add(formatRecordTime(punch.startTime, 'yyyy-MM-dd', punch.timeZone));
    const duration = punchMinutes(punch).worked;
    if (duration === null) open++;
    else {
      worked += duration;
      if (punch.status === 'APPROVED' || punch.status === 'PAID') approved += duration;
    }
  }
  return { worked, approved, open, days: dates.size };
}

export function assessmentEntries(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return Object.entries(parsed) as [string, string | number][];
  } catch { /* An unreadable detail field does not invalidate the recorded score. */ }
  return [];
}

export function punchRow(punch: Punch) {
  const { worked, unpaid } = punchMinutes(punch);
  const date = formatRecordTime(punch.startTime, 'MM/dd/yyyy', punch.timeZone);
  const endDate = punch.endTime && formatRecordTime(punch.endTime, 'MM/dd/yyyy', punch.timeZone);
  return [date, punch.location?.name || 'Unassigned', formatRecordTime(punch.startTime, 'h:mm a', punch.timeZone),
    punch.endTime ? formatRecordTime(punch.endTime, 'h:mm a', punch.timeZone) + (endDate !== date ? ' (' + endDate + ')' : '') : '—',
    worked === null ? '—' : String(unpaid), worked === null ? '—' : hours(worked), label(punch.status)];
}

export function calloutRow(entry: Callout) {
  return [formatRecordTime(entry.shift?.startTime || entry.noticeAt, 'MM/dd/yyyy h:mm a', entry.shift?.timeZone),
    entry.shift?.location?.name || 'Unassigned', label(entry.type), label(entry.status),
    [label(entry.reasonCode), entry.reasonNote].filter(Boolean).join(' / ')];
}

export const punchHeaders = ['Date', 'Location', 'Clock in', 'Clock out', 'Unpaid break (min)', 'Worked (h)', 'Status'];
export const calloutHeaders = ['Shift / notice', 'Location', 'Type', 'Status', 'Reason'];
export const summaryHeaders = ['Officer', 'Days with punches', 'Worked (h)', 'Approved (h)', 'Incomplete', 'Call-outs', 'Assessments'];

export function summaryRow(officer: Officer) {
  const totals = officerTotals(officer.punches);
  return [name(officer.employee), String(totals.days), hours(totals.worked), hours(totals.approved),
    String(totals.open), String(officer.callouts.length), String(officer.assessments.length)];
}
