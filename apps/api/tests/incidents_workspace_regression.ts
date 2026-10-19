import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {Workbook} from 'exceljs';
import {reportWhere,reportOrder} from '../src/incident-reports/report-query';
import {IncidentReportsService} from '../src/incident-reports/incident-reports.service';
import {LocationsService} from '../src/locations/locations.service';
import {Module} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {GUARDS_METADATA} from '@nestjs/common/constants';
import {IncidentReportsController} from '../src/incident-reports/incident-reports.controller';
import {UploadsService} from '../src/uploads/uploads.service';
async function main(){
  const admin={role:'SUPER_ADMIN',userId:'admin'};
  const filters={locationId:'site',reportingOfficerEmployeeId:'officer',from:'2026-07-01',to:'2026-09-30',dateField:'submitted',search:'door',sort:'officer',direction:'asc'};
  const where=reportWhere('business',filters);
  assert.equal(where.businessId,'business');assert.equal(where.locationId,'site');assert.equal(where.reportingOfficerEmployeeId,'officer');
  assert.equal(where.createdAt.gte.toISOString(),'2026-07-01T04:00:00.000Z');
  assert.equal(where.createdAt.lte.toISOString(),'2026-10-01T03:59:59.999Z');
  assert.equal(reportWhere('business',{from:'2026-12-01'}).date.gte.toISOString(),'2026-12-01T05:00:00.000Z');
  assert.throws(()=>reportWhere('business',{from:'2026-02-30'}));
  assert.throws(()=>reportWhere('business',{from:'2026-09-02',to:'2026-09-01'}));
  assert.deepEqual(reportOrder(filters),[{reportingOfficer:{lastName:'asc'}},{reportingOfficer:{firstName:'asc'}},{id:'asc'}]);
  assert.deepEqual(reportOrder({sort:'not-a-column',direction:'sql'}),[{createdAt:'desc'},{id:'asc'}]);
  let requests:any[]=[],events:any[]=[],mail:any;
  const report:any={id:'report',reportNumber:'IR-TEST-001',businessId:'business',title:'Unsecured service entrance - resolved',description:'At 10:15 PM, the reporting officer observed an unsecured service entrance. The area was secured, the supervisor notified, and the access point checked. '.repeat(35),type:'UNAUTHORIZED_ACCESS',severity:'MODERATE',status:'RESOLVED',date:new Date('2026-09-18T02:15:00Z'),createdAt:new Date('2026-09-18T03:00:00Z'),location:{id:'site',name:'Sample client location',address:'818 Example Avenue NE, Washington, DC 20001',incidentReportEmails:'["client@example.com","security@example.com"]'},reportingOfficer:{firstName:'Sample',lastName:'Officer'},submittedBy:{firstName:'Sample',lastName:'Officer'},responseAction:'Secured the door and notified the supervisor.',evidence:[{originalName:'entrance-photo.jpg'}],timeline:[{payload:'INTERNAL NOTE SHOULD NOT BE EXPORTED'}]};
  const business={id:'business',name:'Sample Security Agency',address:'13811 Example Drive',city:'Bowie',state:'MD',zip:'20720'};
  const prisma:any={business:{findUnique:async()=>business,findFirst:async()=>null},employee:{findFirst:async()=>null},incidentReport:{findMany:async(args:any)=>{requests.push(args);return [report];},findUnique:async()=>report,count:async()=>1},incidentTimelineEvent:{create:async(args:any)=>{events.push(args.data);}},$transaction:async(items:any[])=>Promise.all(items)};
  const service=new IncidentReportsService(prisma,{} as any,{send:async(args:any)=>{mail=args;}} as any);
  const list=await service.findAll(admin,'business',filters);assert.equal(list.total,1);
  const excel=await service.exportIncidents(admin,'business','xlsx',filters);
  assert.deepEqual(requests[0].where,requests[1].where);assert.deepEqual(requests[0].orderBy,requests[1].orderBy);
  assert.equal(requests[1].take,undefined);
  const workbook=new Workbook();await workbook.xlsx.load(excel.data as any);
  const sheet=workbook.worksheets[0];assert.equal(sheet.getCell(1,1).value,business.name);assert.equal(sheet.views[0].state,'frozen');assert.equal(sheet.rowCount,5);
  assert.ok(!JSON.stringify(sheet.getRow(5).values).includes('INTERNAL NOTE'));
  const pdf=await service.exportIncidents(admin,'business','pdf',filters);assert.ok(Buffer.isBuffer(pdf.data));assert.equal(pdf.data.toString('ascii',0,4),'%PDF');
  const directory=process.cwd()+'/tmp/incident-qa';mkdirSync(directory,{recursive:true});writeFileSync(directory+'/sample-report.pdf',pdf.data);
  report.location.incidentReportCcEmails=JSON.stringify(['CLIENT@example.com','cc@example.com','SECURITY@example.com']);
  assert.equal((await service.deliverToClient('report',admin)).status,'SENT');assert.equal(mail.to,'client@example.com');assert.deepEqual(mail.cc,['security@example.com','cc@example.com']);assert.equal(mail.attachments[0].contentType,'application/pdf');
  assert.ok(!mail.text.includes('INTERNAL NOTE'));assert.equal(events[events.length-1].eventType,'EMAIL_SENT');
  const failing=new IncidentReportsService(prisma,{} as any,{send:async()=>{throw Error('SMTP unavailable');}} as any);
  let automaticSends=0;
  const createPrisma:any={...prisma,location:{findUnique:async()=>({id:'site',businessId:'business'})},incidentReport:{...prisma.incidentReport,findFirst:async()=>null,create:async()=>report}};
  createPrisma.$transaction=async(fn:any)=>fn(createPrisma);
  const submitting=new IncidentReportsService(createPrisma,{} as any,{send:async()=>{automaticSends++;}} as any);
  const submitted=await submitting.create({title:report.title,description:report.description,type:report.type,severity:report.severity,locationId:'site'} as any,admin,'business');
  assert.equal(automaticSends,1);assert.equal(submitted.clientDelivery.status,'SENT');
  await submitting.deliverToClient('report',admin);
  assert.equal(automaticSends,2,'Manual send remains available after automatic sending');
  assert.equal((await failing.deliverToClient('report',admin)).status,'FAILED');assert.equal(events[events.length-1].eventType,'EMAIL_FAILED');
  report.location.incidentReportEmails='[]';
  assert.equal((await service.deliverToClient('report',admin,true)).status,'NOT_CONFIGURED');
  await assert.rejects(()=>service.deliverToClient('report',admin),/Add incident report emails/);
  await assert.rejects(()=>service.exportIncidents({role:'MANAGER',userId:'other'},'business','xlsx',filters),/not associated|Access denied/);
  const locations:any=new LocationsService({} as any,{} as any);
  assert.equal(locations.incidentEmails([' CLIENT@example.com ','client@example.com']),'["client@example.com"]');
  assert.equal(JSON.parse(locations.incidentEmails(Array.from({length:75},(_,i)=>'cc'+i+'@example.com'))).length,75);
  assert.throws(()=>locations.incidentEmails(['bad-address']));assert.throws(()=>locations.incidentEmails(['bad@example.com\nBcc:other@example.com']));
  // Only this isolated test controller bypasses authentication; production guards are unchanged.
  Reflect.defineMetadata(GUARDS_METADATA,[],IncidentReportsController);
  @Module({controllers:[IncidentReportsController],providers:[{provide:IncidentReportsService,useValue:service},{provide:UploadsService,useValue:{}}]})
  class DownloadTestModule {}
  const app=await NestFactory.create(DownloadTestModule,{logger:false});
  app.use((req:any,_res:any,next:any)=>{req.user=admin;next();});
  try{
    await app.listen(0,'127.0.0.1');
    const url=await app.getUrl();
    for(const format of ['pdf','xlsx']){
      const response=await fetch(url+'/incident-reports/export?format='+format+'&locationId=site',{headers:{'x-business-id':'business'}});
      assert.equal(response.status,200);
      assert.ok(response.headers.get('content-disposition')?.includes('.'+format));
      const bytes=Buffer.from(await response.arrayBuffer());
      assert.notEqual(bytes.toString('utf8',0,1),'{','Downloads must not serialize Buffer as JSON');
      if(format==='pdf'){assert.equal(bytes.toString('ascii',0,4),'%PDF');assert.equal(response.headers.get('content-type'),'application/pdf');}
      else {assert.equal(bytes.toString('ascii',0,2),'PK');const opened=new Workbook();await opened.xlsx.load(bytes as any);assert.equal(opened.worksheets[0].getCell(1,1).value,business.name);}
    }
  }finally{await app.close();}
  console.log('Incident workspace filters, exports, access, recipients, and delivery checks passed');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
