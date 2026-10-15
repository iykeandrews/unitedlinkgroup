import { recordInputDate, formatRecordTime } from './record-zone';
export function recordPeriodBounds(startDay: string, endDay: string) {
  const nextDay = new Date(Date.parse(endDay) + 86400000).toISOString().slice(0,10);
  return { start: recordInputDate(`${startDay}T00:00`), end: new Date(+recordInputDate(`${nextDay}T00:00`) - 1) };
}
export function startsInWorkPeriod(record: {startTime:string;timeZone?:string|null}, startDay:string,endDay:string) {
  const day = formatRecordTime(record.startTime,'yyyy-MM-dd',record.timeZone);
  return day >= startDay && day <= endDay;
}
export function calendarEmployees<T extends {id:string;status?:string}>(active: T[], shifts: Array<{status?:string;employee?:T|null}>) {
  const people=new Map(active.map(employee=>[employee.id,employee]));
  for(const shift of shifts) if(shift.status==='COMPLETED' && shift.employee && !people.has(shift.employee.id)) people.set(shift.employee.id,shift.employee);
  return Array.from(people.values());
}

export function shiftDayPresentation(shift: {startTime:string;endTime?:string|null;timeZone?:string|null}, day?: Date) {
  const startDay=formatRecordTime(shift.startTime,'yyyy-MM-dd',shift.timeZone);
  const endDay=shift.endTime ? formatRecordTime(shift.endTime,'yyyy-MM-dd',shift.timeZone) : startDay;
  const dayKey=day ? `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}` : startDay;
  const overnight=endDay>startDay;
  const continuation=overnight && dayKey>startDay;
  const days=Math.round((Date.parse(endDay)-Date.parse(startDay))/86400000);
  return {dayKey,overnight,continuation,label: !overnight ? '' : continuation
    ? `Continued from ${formatRecordTime(shift.startTime,'EEE, MM/dd',shift.timeZone)}`
    : `Ends ${formatRecordTime(shift.endTime!,'EEE, MM/dd',shift.timeZone)} (+${days} ${days===1?'day':'days'})`};
}
