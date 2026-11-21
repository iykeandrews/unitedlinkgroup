import { BadRequestException } from '@nestjs/common';

export function availabilityInput(body: any, current?: any) {
  const value = { ...(current || {}), ...(body || {}) };
  if (typeof value.isAvailable !== 'boolean') throw new BadRequestException('Choose available or unavailable.');
  const startDate = new Date(value.startDate);
  const endDate = value.endDate ? new Date(value.endDate) : null;
  const allDay = value.allDay ?? true;
  const repeat = value.repeat || 'DOES_NOT_REPEAT';
  const days = (Array.isArray(value.repeatDays) ? value.repeatDays : String(value.repeatDays || '').split(',')).map((d: string)=>String(d).trim().toLowerCase()).filter(Boolean);
  if (!Number.isFinite(+startDate) || (endDate && (!Number.isFinite(+endDate) || endDate < startDate))) throw new BadRequestException('Choose valid start and end dates.');
  if (typeof allDay !== 'boolean' || !['DOES_NOT_REPEAT','WEEKLY'].includes(repeat)) throw new BadRequestException('Choose valid availability options.');
  if (!allDay && (!endDate || endDate <= startDate)) throw new BadRequestException('Timed availability needs an end after its start.');
  if (repeat === 'WEEKLY' && (!days.length || days.some((d: string)=>!['sun','mon','tue','wed','thu','fri','sat'].includes(d)))) throw new BadRequestException('Choose at least one valid repeat day.');
  const endOption = repeat === 'WEEKLY' ? value.endOption || 'NO_END' : null;
  const endOn = endOption === 'ENDS_ON' && value.endOn ? new Date(value.endOn) : null;
  if (repeat === 'WEEKLY' && !['NO_END','ENDS_ON'].includes(endOption)) throw new BadRequestException('Choose a valid repeat ending.');
  if (endOption === 'ENDS_ON' && (!endOn || !Number.isFinite(+endOn) || endOn.toISOString().slice(0,10) < startDate.toISOString().slice(0,10))) throw new BadRequestException('The repeat end date must be on or after the start date.');
  return {isAvailable:value.isAvailable,startDate,endDate,allDay,repeat,repeatDays:repeat==='WEEKLY'?[...new Set(days)].join(','):null,endOption,endOn,comment:typeof value.comment==='string'?value.comment.trim().slice(0,2000):null};
}
