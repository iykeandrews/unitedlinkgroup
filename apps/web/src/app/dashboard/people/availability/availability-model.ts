export interface Availability {
  id: string;
  employeeId: string;
  isAvailable: boolean;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  startDate: string;
  endDate?: string | null;
  allDay: boolean;
  repeat: string;
  repeatDays?: string | null;
  endOption?: string | null;
  endOn?: string | null;
  comment?: string | null;
}

const valid = (value: Date) => Number.isFinite(+value);
const civil = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const recordDay = (value: string, allDay: boolean) => {
  const date = new Date(value);
  if (!valid(date)) return '';
  if (allDay) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const part = (type: string) => parts.find(p=>p.type===type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export function isAvailableOnDate(record: Availability, date: Date): boolean {
  if (!valid(date) || (record.status && record.status !== 'APPROVED')) return false;
  const day = civil(date), start = recordDay(record.startDate,record.allDay);
  if (!start || day < start) return false;
  if (record.repeat === 'WEEKLY') {
    if (record.endOption === 'ENDS_ON' && record.endOn && day > record.endOn.slice(0,10)) return false;
    return String(record.repeatDays || '').toLowerCase().split(',').map(d=>d.trim()).includes(['sun','mon','tue','wed','thu','fri','sat'][date.getDay()]);
  }
  if (record.repeat !== 'DOES_NOT_REPEAT') return false;
  const end = record.endDate ? recordDay(record.endDate,record.allDay) : start;
  if (!end || day > end) return false;
  // Timed intervals end exclusively; midnight on the next day is not an extra available day.
  if (!record.allDay && record.endDate && day === end) {
    const clock = new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(record.endDate));
    if (clock === '00:00:00') return false;
  }
  return true;
}

export function availabilityForDay(records: Availability[], date: Date): Availability[] {
  const matches = records.filter(record=>isAvailableOnDate(record,date));
  const dated = matches.filter(record=>record.repeat !== 'WEEKLY');
  return dated.length ? dated : matches;
}

export function employeeAvailableOnDate(records: Availability[], date: Date): boolean {
  records = records.filter(record=>!record.status || record.status==='APPROVED');
  const matches = availabilityForDay(records,date);
  if (matches.some(record=>!record.isAvailable)) return false;
  if (matches.some(record=>record.isAvailable)) return true;
  return !records.some(record=>record.isAvailable);
}
