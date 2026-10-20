import assert from 'node:assert/strict';
import {SchedulingService} from '../src/scheduling/scheduling.service';
async function main() {
  const now=Date.now();
  const shift={id:'old-shift',employeeId:'officer',locationId:'site',startTime:new Date(now-10*3600000),endTime:new Date(now-2*3600000)};
  let active:any, changes=0, breakEnd:any;
  const tx:any={
    $queryRawUnsafe:async()=>[],
    timesheet:{findFirst:async({where}:any)=>{
      if(!active || active.locationId!==where.locationId || active.startTime<where.startTime.gte || active.startTime>=where.startTime.lt) return null;
      return active;
    },updateMany:async()=>{changes++;return {count:1};}},
    break:{updateMany:async({data}:any)=>{breakEnd=data.endTime;}},shift:{update:async()=>({})},
  };
  const prisma:any={shift:{findMany:async({where}:any)=>where.autoClockout1hDone===false?[shift]:[]},$transaction:async(fn:any)=>fn(tx)};
  const service=new SchedulingService(prisma,{} as any,{} as any,{} as any);
  active={id:'new-today',locationId:'site',startTime:new Date(now-60000),updatedAt:new Date()};
  await service.handleShiftReminders();assert.equal(changes,0,'Old schedule must not close a new clock-in');
  active={...active,startTime:new Date(now-9*3600000),locationId:'another-site'};
  await service.handleShiftReminders();assert.equal(changes,0,'Other location must remain open');
  active.locationId='site';
  await service.handleShiftReminders();assert.equal(changes,1);
  assert.equal(+breakEnd,+shift.endTime+3600000);
  console.log('Auto clock-out protects new attendance and other sites; matching attendance and breaks close correctly');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
