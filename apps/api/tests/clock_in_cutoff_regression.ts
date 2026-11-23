import assert from 'node:assert/strict';
import { TimeTrackingService } from '../src/time-tracking/time-tracking.service';

const OriginalDate=Date;
let instant=+new OriginalDate('2026-11-23T03:29:00Z');
class TestDate extends OriginalDate {
  constructor(value?: any){super(value===undefined?instant:value);}
  static now(){return instant;}
}
const shift={id:'shift',employeeId:'officer',locationId:'site',status:'PUBLISHED',timeZone:'America/New_York',startTime:new OriginalDate('2026-11-22T19:00Z'),endTime:new OriginalDate('2026-11-23T03:30Z')};
const tomorrow={...shift,id:'tomorrow',startTime:new OriginalDate('2026-11-23T19:00Z'),endTime:new OriginalDate('2026-11-24T03:30Z')};
async function main(){
 (global as any).Date=TestDate;
 let candidates:any[]=[shift,tomorrow],created=0,crossBoundary=false;
 const prisma:any={
  shift:{findMany:async()=>candidates,findFirst:async()=>shift},
  employee:{findUnique:async()=>({workerType:'W2',businessId:'business'})},
  location:{findUnique:async()=>({id:'site',businessId:'business',geoLat:0,geoLng:0,radius:100,timeZone:'America/New_York'})},
  timesheet:{findFirst:async()=>null,create:async({data}:any)=>{created++;return data;}},
  $queryRawUnsafe:async()=>{if(crossBoundary)instant=+shift.endTime;},
 };
 prisma.$transaction=async(fn:any)=>fn(prisma);
 const service=new TimeTrackingService(prisma,{} as any,{} as any);
 assert.equal((await service.requireClockInShift('officer')).id,'shift');
 const valid=await service.clockIn('officer','site',0,0,'ip',{shiftId:'shift'});
 assert.equal(+valid.startTime,+new OriginalDate('2026-11-23T03:29Z'));
 instant=+shift.endTime;
 await assert.rejects(()=>service.requireClockInShift('officer'),/scheduled end/);
 await assert.rejects(()=>service.clockIn('officer','site',0,0,'ip',{shiftId:'shift'}),/scheduled shift has ended/);
 instant=+new OriginalDate('2026-11-23T03:31:32Z');
 await assert.rejects(()=>service.requireClockInShift('officer'),/scheduled end/);
 await assert.rejects(()=>service.clockIn('officer','site',0,0,'ip',{shiftId:'shift'}),/scheduled shift has ended/);
 assert.equal(created,1,'Rejected punches must not create attendance');
 instant=+new OriginalDate('2026-11-23T03:29Z');crossBoundary=true;
 await assert.rejects(()=>service.clockIn('officer','site',0,0,'ip',{shiftId:'shift'}),/scheduled shift has ended/);
 assert.equal(created,1,'Crossing the cutoff during clock-in must not create attendance');
 crossBoundary=false;instant=+new OriginalDate('2026-11-23T11:00Z');
 candidates=[{...shift,startTime:new OriginalDate('2026-11-23T03:00Z'),endTime:new OriginalDate('2026-11-23T12:00Z')}];
 assert.equal((await service.requireClockInShift('officer')).id,'shift','Overnight shifts remain eligible until they end');
 console.log('Clock-in cutoff, local work date, last-minute clock-in, overnight shifts, and boundary race verified');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{(global as any).Date=OriginalDate;});
