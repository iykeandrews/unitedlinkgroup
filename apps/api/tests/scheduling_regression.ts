import assert from 'node:assert/strict';
import { fitsAvailability, overlapsLeave } from '../src/scheduling/availability.util';
import { SchedulingService } from '../src/scheduling/scheduling.service';
import { parseScheduleCsv } from '../../web/src/components/scheduling/csv';

const date = (value: string) => new Date(value);
const monday = date('2030-01-07T09:00:00');
const weekly = (days: string, available = true, allDay = true, start = '09:00', end = '17:00') => ({
  repeat: 'WEEKLY', repeatDays: days, isAvailable: available, allDay,
  startDate: date(`2030-01-07T${start}:00`), endDate: date(`2030-01-07T${end}:00`),
});
let checks = 0;
function check(actual: unknown, expected: unknown) { assert.deepEqual(actual, expected); checks++; }

async function main() {
  check(fitsAvailability([], monday, date('2030-01-07T17:00:00')), true);
  check(fitsAvailability([weekly(' Mon ,TUE')], monday, date('2030-01-07T17:00:00')), true);
  check(fitsAvailability([weekly('tue')], monday, date('2030-01-07T17:00:00')), false);
  check(fitsAvailability([weekly('mon', false)], monday, date('2030-01-07T17:00:00')), false);
  check(fitsAvailability([weekly('mon', true, false)], date('2030-01-07T08:00:00'), date('2030-01-07T17:00:00')), false);
  check(fitsAvailability([weekly('mon', true, false)], monday, date('2030-01-07T17:00:00')), true);
  check(fitsAvailability([weekly('mon', true, false, '22:00', '06:00')], date('2030-01-07T23:00:00'), date('2030-01-08T05:00:00')), true);
  check(fitsAvailability([weekly('mon', true, false, '22:00', '06:00')], date('2030-01-08T04:00:00'), date('2030-01-08T07:00:00')), false);
  check(fitsAvailability([weekly('mon'), weekly('tue')], date('2030-01-07T22:00:00'), date('2030-01-08T06:00:00')), true);
  check(fitsAvailability([weekly('mon'), weekly('tue', false)], date('2030-01-07T22:00:00'), date('2030-01-08T06:00:00')), false);
  check(fitsAvailability([weekly('mon'), weekly('mon', false, false, '12:00', '13:00')], monday, date('2030-01-07T17:00:00')), false);
  check(fitsAvailability([{ ...weekly('mon'), endOption: 'ENDS_ON', endOn: date('2030-01-06') }], monday, date('2030-01-07T17:00:00')), false);
  check(fitsAvailability([weekly('mon', true, false, '09:00', '12:00'), weekly('mon', true, false, '12:00', '17:00')], monday, date('2030-01-07T17:00:00')), true);
  check(fitsAvailability([weekly('mon', true, false, '09:00', '12:00'), weekly('mon', true, false, '13:00', '17:00')], monday, date('2030-01-07T17:00:00')), false);
  const leave = { startDate: date('2030-01-07'), endDate: date('2030-01-07'), isAllDay: true };
  check(overlapsLeave(leave, date('2030-01-07T22:00:00'), date('2030-01-08T06:00:00')), true);
  check(overlapsLeave(leave, date('2030-01-08T00:00:00'), date('2030-01-08T06:00:00')), false);
  check(overlapsLeave({ ...leave, resumedAt: date('2030-01-07T12:00:00') }, date('2030-01-07T12:00:00'), date('2030-01-07T17:00:00')), false);
  check(overlapsLeave({ ...leave, isAllDay: false, startTime: '22:00', endTime: '06:00' }, date('2030-01-08T01:00:00'), date('2030-01-08T05:00:00')), true);
  check(parseScheduleCsv('employeeId,locationId,startTime,endTime,breakMinutes,notes\r\n,loc,2030-01-07T09:00:00Z,2030-01-07T17:00:00Z,30,"Gate, north"')[0][5], 'Gate, north');
  assert.throws(() => parseScheduleCsv(',loc,bad,date,0')); checks++;
  assert.throws(() => parseScheduleCsv(',loc,2030-01-07T09:00:00Z,2030-01-07T17:00:00Z,0,"open')); checks++;

  let query: any;
  const prisma: any = {
    business: { findUnique: async () => ({ id: 'business' }) },
    employee: { findUnique: async () => ({ id: 'employee', businessId: 'business', status: 'ACTIVE' }) },
    location: { findUnique: async () => ({ id: 'location', businessId: 'other-business', status: 'ACTIVE' }) },
    shift: { findFirst: async (args: any) => { query = args.where; return null; }, findMany: async (args: any) => { query = args.where; return []; } },
  };
  const service: any = new SchedulingService(prisma, {} as any, {} as any, {} as any);
  await service.assertNoShiftOverlap({ employeeId: 'employee', start: monday, end: date('2030-01-07T17:00:00') });
  check(query.startTime, { lt: date('2030-01-07T17:00:00') });
  check(query.endTime, { gt: monday });
  await assert.rejects(() => service.createShift({ business: { connect: { id: 'business' } }, location: { connect: { id: 'location' } }, startTime: monday, endTime: date('2030-01-07T17:00:00') }, { role: 'SUPER_ADMIN' }), /active location from this business/); checks++;
  await assert.rejects(() => service.validatePlacement('business', null, null, monday, date('invalid'), 0), /valid start and end/); checks++;
  await assert.rejects(() => service.validatePlacement('business', null, null, monday, date('2030-01-07T17:00:00'), 480), /shorter than the shift/); checks++;
  prisma.employee.findFirst = async () => ({ id: 'employee', businessId: 'business' });
  await service.getMyPeerShifts('user', monday, date('2030-01-07T17:00:00'));
  check(query.startTime, { lt: date('2030-01-07T17:00:00') });
  check(query.endTime, { gt: monday });
  prisma.availability = { findMany: async () => [] };
  prisma.leaveRequest = { findMany: async () => [leave] };
  check((await service.validateAvailability('employee', monday, date('2030-01-07T17:00:00'))).ok, false);
  prisma.shiftApplication = { findUnique: async () => ({ status: 'APPROVED', shift: { businessId: 'business' } }) };
  await assert.rejects(() => service.approveShiftApplication('application', { role: 'SUPER_ADMIN' }), /already been processed/); checks++;
  const people = [
    { id: 'worker-a', businessId: 'business', status: 'ACTIVE', role: 'EMPLOYEE', defaultLocationId: 'site-a', supervisorId: 'supervisor-a', userId: 'user-a', user: { email: 'a@example.test' } },
    { id: 'worker-b', businessId: 'business', status: 'ACTIVE', role: 'EMPLOYEE', defaultLocationId: 'site-a', userId: 'user-b', user: { email: 'b@example.test' } },
    { id: 'supervisor-a', businessId: 'business', status: 'ACTIVE', role: 'SUPERVISOR', defaultLocationId: 'site-a', userId: 'user-supervisor-a', user: { email: 'supervisor-a@example.test' } },
    { id: 'supervisor-b', businessId: 'business', status: 'ACTIVE', role: 'SUPERVISOR', defaultLocationId: 'site-b', userId: 'user-supervisor-b', user: { email: 'supervisor-b@example.test' } },
    { id: 'inactive', businessId: 'business', status: 'TERMINATED', role: 'SUPERVISOR', defaultLocationId: 'site-a', userId: 'user-inactive', user: { email: 'inactive@example.test' } },
    { id: 'other', businessId: 'other-business', status: 'ACTIVE', role: 'SUPERVISOR', defaultLocationId: 'site-a', userId: 'user-other', user: { email: 'other@example.test' } },
  ];
  prisma.employee.findMany = async ({ where }: any) => people.filter(person =>
    person.businessId === where.businessId && person.status === where.status &&
    (where.OR ? where.OR.some((condition: any) => condition.id?.in.includes(person.id) || condition.defaultLocationId?.in.includes(person.defaultLocationId)) : where.id.in.includes(person.id)));
  const recipientIds = (recipients: any[]) => recipients.map(recipient => recipient.id).sort();
  check(recipientIds(await service.getScheduleRecipients('business', [{ employeeId: 'worker-a', locationId: 'site-a' }])), ['user-a', 'user-supervisor-a']);
  check(recipientIds(await service.getScheduleRecipients('business', [{ employeeId: 'worker-a', locationId: 'site-a' }, { employeeId: 'supervisor-a', locationId: 'site-a' }])), ['user-a', 'user-supervisor-a']);
  check(recipientIds(await service.getScheduleRecipients('business', [{ employeeId: null, locationId: 'site-a' }])), ['user-supervisor-a']);
  check(await service.getScheduleRecipients('business', []), []);

  const draft = { id: 'draft', businessId: 'business', employeeId: 'worker-a', locationId: 'site-a', startTime: monday, endTime: date('2030-01-07T17:00:00'), breakMinutes: 30, status: 'DRAFT', groupId: 'group', employee: { firstName: 'Worker', lastName: 'A' } };
  prisma.shift.findMany = async () => [draft];
  prisma.location.findUnique = async () => ({ businessId: 'business', status: 'ACTIVE' });
  prisma.leaveRequest.findMany = async () => [];
  prisma.$transaction = async (callback: any) => callback({ shift: { findFirst: async () => null, update: async () => draft } });
  const notified: string[] = [];
  service.notifications = { createNotification: async (id: string) => notified.push(id), sendPush: async () => {}, sendEmail: async () => {} };
  service.push = { send: async () => {} };
  await service.publishShifts('business', monday, date('2030-01-08T00:00:00'), { role: 'SUPER_ADMIN' });
  check(notified.sort(), ['user-a', 'user-supervisor-a']);
  notified.length = 0;
  prisma.shift.findMany = async () => [];
  await service.publishShifts('business', monday, date('2030-01-08T00:00:00'), { role: 'SUPER_ADMIN' });
  check(notified, []);
  prisma.shiftApplication.findUnique = async () => ({ status: 'PENDING', employeeId: 'worker-a', shiftId: 'open', shift: { ...draft, status: 'OPEN', employeeId: null, startTime: date('2099-01-07T09:00:00'), endTime: date('2099-01-07T17:00:00') } });
  prisma.$transaction = async (callback: any) => callback({ shift: { updateMany: async () => ({ count: 0 }) } });
  await assert.rejects(() => service.approveShiftApplication('application', { role: 'SUPER_ADMIN' }), /already been assigned/); checks++;
  console.log(`Passed ${checks} scheduling regression checks`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
