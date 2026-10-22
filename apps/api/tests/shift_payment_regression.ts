import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculateHours} from '../src/payroll/hours';
import {buildTimesheetReport,reportPdf,reportExcel} from '../src/time-tracking/timesheet-report';
async function main(){
const start=new Date('2026-10-19T10:00:00Z'),end=new Date('2026-10-19T18:00:00Z'),anchor=new Date('2026-01-04T00:00:00Z');
const sheet:any={id:'s',employeeId:'e',workerType:'W2',status:'APPROVED',startTime:start,endTime:end,breaks:[],shiftHourlyRate:25,additionalWorkAmount:50,additionalWorkDescription:'Event setup',employee:{id:'e',firstName:'TEST',lastName:'OFFICER',hourlyRate:23,payType:'HOURLY',w2Profile:{rate:23,payType:'HOURLY',overtimeEligible:true}}};
const result=calculateHours([sheet],start,end,23,true,anchor);assert.equal(result.regularHours,10);assert.equal(result.grossPay,250);
const paid=calculateHours([{...sheet,paidExternally:true}],start,end,23,true,anchor);assert.equal(paid.grossPay,0);assert.equal(paid.regularHours,0);
const defaultRate=calculateHours([{...sheet,shiftHourlyRate:null,additionalWorkAmount:46}],start,end,23,true,anchor);assert.equal(defaultRate.regularHours,10);assert.equal(defaultRate.grossPay,230);
const report=buildTimesheetReport({name:'UNITED LINK SECURITY AGENCY',currencyCode:'USD'},[sheet],[],{from:'2026-10-19',to:'2026-10-19'});
assert.equal(report.rows[0].rate,25);assert.equal(report.rows[0].gross,250);assert.equal(report.rows[0].hours,10);assert.match(report.rows[0].warning,/Event setup/);
assert(reportPdf(report).length > 1000);assert((await reportExcel(report)).length > 1000);
assert.equal(sheet.startTime,start);assert.equal(sheet.endTime,end);
console.log('PASS: profile default, shift override, extra equivalent hours, no double payment of paid history, report totals/descriptions, PDF/Excel exports, unchanged attendance.');
} main();
