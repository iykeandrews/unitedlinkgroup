import assert from 'node:assert/strict';
import { calculateHours } from '../src/payroll/hours';
import { workedHours } from '../../web/src/lib/time/records';
import { TimeTrackingService } from '../src/time-tracking/time-tracking.service';
const days = [17,18,19,24,25,26];
const sheets = days.map(day => {
  const short = day===17 || day===24;
  return {startTime:`2026-09-${day}T${short?'14':'06'}:00:00-04:00`, endTime:`2026-09-${day}T22:00:00-04:00`,paidExternally:true, breaks:[{startTime:`2026-09-${day}T${short?'18':'14'}:00:00-04:00`,endTime:`2026-09-${day}T${short?'18:30':'15:00'}:00-04:00`,type:'UNPAID'}]};
});
const start=new Date('2026-09-16T04:00:00Z'),end=new Date('2026-10-01T03:59:59.999Z'),anchor=new Date('2026-09-13T04:00:00Z');
assert.equal(sheets.reduce((n,t)=>n+workedHours(t.startTime,t.endTime,t.breaks),0),75);
assert.equal(calculateHours(sheets,start,end,19,true,anchor).grossPay,0);
assert.equal(calculateHours(sheets.map(t=>({...t,paidExternally:false})),start,end,19,true,anchor).grossPay,1425);
// Historical hours still consume the weekly threshold for subsequent unpaid work.
const historical={startTime:'2026-09-14T00:00:00Z',endTime:'2026-09-15T16:00:00Z',breaks:[],paidExternally:true};
const next={startTime:'2026-09-15T17:00:00Z',endTime:'2026-09-15T19:00:00Z',breaks:[]};
const mixed=calculateHours([next,historical],new Date('2026-09-13T00:00Z'),new Date('2026-09-20T00:00Z'),19,true,new Date('2026-09-13T00:00Z'));
assert.equal(mixed.regularHours,0);assert.equal(mixed.overtimeHours,2);assert.equal(mixed.grossPay,57);
async function main(){
 const service=new TimeTrackingService({timesheet:{findUnique:async()=>({paidExternally:true,employee:{businessId:'A'}})}} as any,{} as any,{} as any);
 await assert.rejects(()=>service.updateTimesheet('paid',{status:'PENDING'}),/already paid externally/);
 await assert.rejects(()=>service.deleteTimesheet('paid'),/already paid externally/);
 console.log('Historical paid timesheet checks passed: 6 shifts, 75 net hours, $1,425 historical gross, no duplicate pay, weekly overtime preserved, paid records protected.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
