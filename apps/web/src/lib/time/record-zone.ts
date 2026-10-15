const DEFAULT_RECORD_ZONE = 'America/New_York';
function clockParts(value: string | Date, timeZone?: string | null) {
  const instant = new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || DEFAULT_RECORD_ZONE, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23', weekday:'short' }).formatToParts(instant);
  const text = (name: string) => parts.find(p => p.type === name)?.value || '';
  return {year:+text('year'),month:+text('month'),day:+text('day'),hour:+text('hour'),minute:+text('minute'),second:+text('second'),weekday:text('weekday')};
}
/** Wall-clock copy for calendar grouping only; never use it for elapsed hours. */
export function recordWallDate(value: string | Date, timeZone?: string | null): Date {
  const p = clockParts(value,timeZone);
  return new Date(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
}
/** Format the source clock directly, without passing through the viewer's local Date. */
export function formatRecordTime(value: string | Date, pattern: string, timeZone?: string | null): string {
  const p = clockParts(value,timeZone);
  const pad = (n:number) => String(n).padStart(2,'0');
  const tokens: Record<string,string> = {
    yyyy:String(p.year), MMM:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.month-1],
    MM:pad(p.month), dd:pad(p.day), d:String(p.day), EEE:p.weekday,
    HH:pad(p.hour), h:String(p.hour % 12 || 12), mm:pad(p.minute), a:p.hour<12?'AM':'PM',
  };
  return pattern.replace(/'([^']*)'|yyyy|MMM|MM|dd|EEE|HH|mm|d|h|a/g,(token,literal)=>literal === undefined ? tokens[token] : literal);
}
/** Convert the record's displayed input back into an instant, independently of the device zone. */
export function recordInputDate(value: string, timeZone?: string | null): Date {
  timeZone ||= DEFAULT_RECORD_ZONE;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return new Date(NaN);
  const [, y, m, d, h, min, sec] = match;
  const desired = Date.UTC(+y,+m-1,+d,+h,+min,+(sec || 0));
  let instant = new Date(desired);
  for (let i=0;i<3;i++) {
    const p = clockParts(instant,timeZone);
    const actual = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
    instant = new Date(+instant + desired - actual);
  }
  if (formatRecordTime(instant,"yyyy-MM-dd'T'HH:mm",timeZone) !== value.slice(0,16)) return new Date(NaN);
  return instant;
}

/** Reposition a shift by calendar day while retaining both entered clock values. */
export function moveRecordRange(start: string | Date, end: string | Date, date: string, timeZone?: string | null) {
  const startDay = formatRecordTime(start,'yyyy-MM-dd',timeZone);
  const endDay = formatRecordTime(end,'yyyy-MM-dd',timeZone);
  const days = Math.round((Date.parse(endDay) - Date.parse(startDay)) / 86400000);
  const targetEndDay = new Date(Date.parse(date) + days * 86400000).toISOString().slice(0,10);
  return {
    start: recordInputDate(`${date}T${formatRecordTime(start,'HH:mm',timeZone)}`,timeZone),
    end: recordInputDate(`${targetEndDay}T${formatRecordTime(end,'HH:mm',timeZone)}`,timeZone),
  };
}

export function enteredShiftRange(date: string, start: string, end: string, timeZone?: string | null) {
  if (!Number.isFinite(Date.parse(date))) return { start: new Date(NaN), end: new Date(NaN) };
  const endDay = end < start ? new Date(Date.parse(date) + 86400000).toISOString().slice(0,10) : date;
  return { start: recordInputDate(`${date}T${start}`,timeZone), end: recordInputDate(`${endDay}T${end}`,timeZone) };
}
