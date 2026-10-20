import assert from 'node:assert/strict';
import {TimeTrackingService} from '../src/time-tracking/time-tracking.service';
async function main(){
  const record:any={id:'t',employeeId:'e',employee:{businessId:'b'},startTime:new Date(Date.now()-3600000),endTime:null,updatedAt:new Date(),status:'IN_PROGRESS',paidExternally:false};
  let saved:any,breaks:any,audit:any;
  let paid:any=null;
  const prisma:any={payStub:{findFirst:async()=>paid},timesheet:{findUnique:async()=>record,update:async({data}:any)=>{saved=data;return {...record,...data};}},break:{updateMany:async(q:any)=>{breaks=q;}},auditLog:{create:async(q:any)=>{audit=q.data;}},$queryRawUnsafe:async()=>[],$transaction:async(fn:any)=>fn(prisma)};
  const service:any=new TimeTrackingService(prisma,{} as any,{} as any);service.validateBusinessAccess=async()=>{};
  await assert.rejects(()=>service.deleteTimesheet('t',undefined,{role:'MANAGER'}),/End the active/);
  await service.deleteTimesheet('t',undefined,{role:'BUSINESS_ADMIN',userId:'admin'});
  assert.equal(saved.status,'DISCARDED');assert(saved.endTime>=record.startTime);assert.equal(+breaks.data.endTime,+saved.endTime);assert.equal(audit.action,'TIMESHEET_DISCARDED');
  record.paidExternally=true;await assert.rejects(()=>service.deleteTimesheet('t',undefined,{role:'SUPER_ADMIN'}),/paid externally/);
  record.paidExternally=false;record.endTime=new Date();await service.deleteTimesheet('t',undefined,{role:'MANAGER'});assert.equal(+saved.endTime,+record.endTime);
  paid={id:'paid'};await assert.rejects(()=>service.deleteTimesheet('t',undefined,{role:'SUPER_ADMIN'}),/paid payroll/);
  console.log('Discard checks passed: admin open clock-in, matching break end, audit, paid protection, manager restrictions, closed record');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
