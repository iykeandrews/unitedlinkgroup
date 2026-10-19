import assert from 'node:assert/strict';
import {enteredBreakRange, recordInputDate} from '../../web/src/lib/time/record-zone';
import {TimeTrackingService} from '../src/time-tracking/time-tracking.service';
import {SchedulingService} from '../src/scheduling/scheduling.service';

async function main() {
  const zone = 'America/New_York';
  const input = (s: string) => recordInputDate(s, zone);
  for (const tz of ['Africa/Lagos', 'America/Los_Angeles']) {
    process.env.TZ = tz;
    const from = input('2026-09-18T23:00'), until = input('2026-09-19T07:00');
    const after = enteredBreakRange(from, until, '01:00', '01:30', zone);
    assert.equal(after.start.toISOString(), '2026-09-19T05:00:00.000Z');
    assert.equal(+after.end! - +after.start, 1800000);
    const crossing = enteredBreakRange(from, until, '23:45', '00:15', zone);
    assert.equal(+crossing.end! - +crossing.start, 1800000);
    assert.throws(() => enteredBreakRange(from, until, '08:00', '08:30', zone));
    assert.throws(() => enteredBreakRange(from, until, '01:00', '01:00', zone));
    assert.throws(() => enteredBreakRange(from, until, '25:00', '01:30', zone));
    assert.equal(enteredBreakRange(from, until, '01:00', '', zone).end, null);
  }
  let created: any, audit: any, overlap: any = null;
  const employee = {id:'employee', businessId:'business', workerType:'W2'};
  const tx: any = {
    $queryRawUnsafe: async () => [],
    timesheet: {findFirst: async () => overlap, create: async (args:any) => {created=args.data; return {id:'timesheet',...created};}},
    auditLog: {create: async (args:any) => {audit=args.data;}},
  };
  const prisma: any = {
    employee:{findUnique:async()=>employee, findFirst:async()=>null},
    business:{findFirst:async()=>null},
    location:{findFirst:async()=>({id:'location', timeZone:zone})},
    $transaction:async(fn:any)=>fn(tx), timesheet:{findMany:async()=>[]},
  };
  const service = new TimeTrackingService(prisma, {} as any, {} as any);
  const data = {employeeId:'employee',locationId:'location', startTime:'2026-09-18T10:00:00Z',endTime:'2026-09-18T18:00:00Z',breaks:[{startTime:'2026-09-18T14:00:00Z',endTime:'2026-09-18T14:30:00Z',type:'UNPAID'}]};
  const admin = {role:'SUPER_ADMIN',userId:'admin'};
  const shift = {id:'shift', groupId:'group', employeeId:'employee', businessId:'business', locationId:'location', location:{name:'Site',timeZone:zone}, startTime:new Date(data.startTime), endTime:new Date(data.endTime),status:'PUBLISHED',breakMinutes:30};
  let drafts: any[] = [];
  prisma.shift = {findMany: async (args:any) => args.where.employeeId ? [shift] : drafts};
  assert.equal((await service.getUntrackedShifts('employee',admin))[0].locationName,'Site');
  drafts = [{...shift,id:'draft',employeeId:'different'}];
  assert.deepEqual(await service.getUntrackedShifts('employee',admin),[]);
  drafts = [];
  prisma.timesheet.findMany=async()=>[{...shift,startTime:shift.startTime,endTime:shift.endTime}];
  assert.deepEqual(await service.getUntrackedShifts('employee',admin),[]);
  prisma.timesheet.findMany=async()=>[{...shift,startTime:new Date(+shift.startTime-3600000),endTime:shift.startTime}];
  assert.equal((await service.getUntrackedShifts('employee',admin)).length,1);
  prisma.timesheet.findMany=async()=>[];
  await assert.rejects(()=>service.getUntrackedShifts('employee',{role:'EMPLOYEE'}), /Only administrators/);
  await assert.rejects(()=>service.getUntrackedShifts('employee',{role:'BUSINESS_ADMIN',userId:'other'}), /Access denied/);
  tx.shift={findFirst:async()=>shift};
  await service.createManualTimesheet({...data,shiftId:'shift'},admin);
  assert.equal(JSON.parse(audit.details).shiftId,'shift');
  tx.shift.findFirst=async()=>({...shift,employeeId:'reassigned'});
  await assert.rejects(()=>service.createManualTimesheet({...data,shiftId:'shift'},admin), /assignment changed/);
  tx.shift.findFirst=async()=>shift;
  overlap={id:'tracked'};
  await assert.rejects(()=>service.createManualTimesheet({...data,shiftId:'shift'},admin), /already has a clock-in/);
  overlap=null;
  await service.createManualTimesheet(data,admin);
  assert.equal(created.status,'PENDING'); assert.equal(created.workerType,'W2');
  assert.equal(created.breaks.create.length,1); assert.equal(audit.action,'CREATE_MANUAL_TIMESHEET');
  await assert.rejects(()=>service.createManualTimesheet(data,{role:'EMPLOYEE'}), /Only administrators/);
  await assert.rejects(()=>service.createManualTimesheet(data,{role:'BUSINESS_ADMIN',userId:'other'}), /Access denied/);
  await assert.rejects(()=>service.createManualTimesheet({...data,endTime:data.startTime},admin), /completed/);
  await assert.rejects(()=>service.createManualTimesheet({...data,breaks:[...data.breaks,...data.breaks]},admin), /overlap/);
  overlap={id:'existing'};
  await assert.rejects(()=>service.createManualTimesheet(data,admin), /overlapping/);
  const scheduling: any = new SchedulingService(prisma,{} as any,{} as any,{} as any);
  const past = {employeeId:'employee',locationId:'location',startTime:new Date(data.startTime),endTime:new Date(data.endTime)};
  await scheduling.assertShiftPlacementUnlocked(past,admin);
  await assert.rejects(()=>scheduling.assertShiftPlacementUnlocked(past,{role:'MANAGER'}), /already started/);
  await assert.rejects(()=>scheduling.assertShiftPlacementUnlocked({...past,endTime:new Date(Date.now()+3600000)},admin), /already started/);
  prisma.timesheet.findMany=async()=>[{startTime:past.startTime,endTime:past.endTime,breaks:[]}];
  await assert.rejects(()=>scheduling.assertShiftPlacementUnlocked(past,admin), /locked/);
  prisma.timesheet.findMany=async()=>[{startTime:new Date(+past.startTime-3600000),endTime:past.startTime,breaks:[]}];
  await scheduling.assertShiftPlacementUnlocked(past,admin);
  console.log('Manual attendance and overnight break regression checks passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
