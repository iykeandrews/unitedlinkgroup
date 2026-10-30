import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportCategoryLabel } from './report-category';
export const reportDate=(value:any)=>value?new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'2-digit',day:'2-digit',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value)):'';
const name=(person:any)=>person?`${person.firstName||''} ${person.lastName||''}`.trim():'';
/** Client-facing document deliberately excludes internal investigation notes. */
export function reportPdf(reports:any[],business:any) {
  const doc=new jsPDF({format:"letter"});
  reports.forEach((report,index)=>{
    if(index) doc.addPage();
    doc.setFontSize(18);doc.setTextColor('#142d47');
    doc.text(reportCategoryLabel(report.type).toUpperCase(),14,20);
    doc.setFontSize(10);doc.setTextColor('#526477');
    const address=[business?.name,business?.address,[business?.city,business?.state,business?.zip].filter(Boolean).join(', ')].filter(Boolean).join('\n');
    doc.text(doc.splitTextToSize(address||'Security incident report',180),14,28);
    autoTable(doc,{startY:52,theme:'grid',head:[['Report reference',report.reportNumber||report.id]],body:[['Title',report.title],['Location',report.location?.name||'Unassigned'],['Location address',report.location?.address||''],['Incident occurred',reportDate(report.incidentAt||report.date)],['Submitted',reportDate(report.createdAt)],['Reporting officer',name(report.reportingOfficer)||name(report.submittedBy)],['Submitted by',name(report.submittedBy)],['Type / Severity / Status',[report.type,report.severity,report.status].join(' / ')],['Area / Shift',[report.buildingArea,report.shift].filter(Boolean).join(' / ')],['Response / Action',report.responseAction||''],['Witnesses present',report.witnessPresent?'Yes':'No'],['Law enforcement involved',report.lawEnforcementInvolved?'Yes':'No']],styles:{fontSize:9,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:[20,45,71]},columnStyles:{0:{cellWidth:45}}});
    autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+7,head:[['Incident narrative']],body:[[report.description||'']],styles:{fontSize:10,cellPadding:4,overflow:'linebreak'},headStyles:{fillColor:[20,45,71]}});
    if(report.evidence?.length) autoTable(doc,{startY:(doc as any).lastAutoTable.finalY+7,head:[['Evidence attachments']],body:report.evidence.map((e:any)=>[e.originalName||e.filename]),styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:[20,45,71]}});
  });
  if(!reports.length) {doc.setFontSize(16);doc.text('No incident reports match the selected filters.',14,25);}
  const total=doc.getNumberOfPages();
  for(let page=1;page<=total;page++){doc.setPage(page);doc.setFontSize(8);doc.setTextColor('#64748b');doc.text(`Confidential | ${business?.name||'Incident reports'}`,14,doc.internal.pageSize.getHeight()-10);doc.text(`${page} / ${total}`,195,doc.internal.pageSize.getHeight()-10,{align:'right'});}
  return Buffer.from(doc.output('arraybuffer'));
}
