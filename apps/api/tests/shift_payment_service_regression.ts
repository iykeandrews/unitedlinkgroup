import assert from 'node:assert/strict';
import {TimeTrackingService} from '../src/time-tracking/time-tracking.service';
async function main(){
let row:any={id:'s',employeeId:'e',employee:{businessId:'b'},workerType:'W2',startTime:new Date('2026-10-19T10:00Z'),endTime:new Date('2026-10-19T18:00Z'),status:'PENDING',shiftHourlyRate:null,additionalWorkAmount:0,additionalWorkDescription:null};
let saved:any;
const tx:any={timesheet:{update:async({data}:any)=>{saved=data;return {...row,...data}},findUnique:async()=>({...row,...saved,breaks:[]})},business:{findUnique:async()=>({settings:'{}'})}};
const db:any={timesheet:{findUnique:async()=>row},payStub:{findFirst:async()=>null},employee:{findUnique:async()=>({hourlyRate:23,workerType:'W2',w2Profile:{payType:'HOURLY',rate:23}})},break:{findMany:async()=>[]},$transaction:async(fn:any)=>fn(tx)};
const audit:any[]=[];const service:any=new TimeTrackingService(db,{} as any,{} as any,{audit:async(...args:any[])=>audit.push(args)} as any);
service.validateBusinessAccess=async()=>{};service.applyShortShiftBreakRule=async()=>{};
const user={role:'BUSINESS_ADMIN'};
const result=await service.updateTimesheet('s',{shiftHourlyRate:25,additionalWorkAmount:50,additionalWorkDescription:'Event setup',status:'APPROVED'},user);
assert.equal(result.additionalWorkAmount,50);assert.equal(saved.shiftHourlyRate,25);assert.equal(audit[0][3].after.additionalWorkAmount,50);
await assert.rejects(()=>service.updateTimesheet('s',{additionalWorkAmount:50,additionalWorkDescription:''},user),/Describe/);
await assert.rejects(()=>service.updateTimesheet('s',{shiftHourlyRate:-1},user),/positive/);
await assert.rejects(()=>service.updateTimesheet('s',{additionalWorkAmount:50},{role:'MANAGER'}),/administrators/);
row={...row,paidExternally:true};await assert.rejects(()=>service.updateTimesheet('s',{additionalWorkAmount:50},user),/read-only/);
console.log('PASS: adjustment persistence, approval, audit, required description, rate validation, admin permissions, paid-record protection.');
}main();
