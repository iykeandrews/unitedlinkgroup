import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRecordTime } from '../../../../lib/time/record-zone';
import { assessmentEntries, calloutHeaders, calloutRow, label, name, punchHeaders, punchRow, summaryHeaders, summaryRow, type Officer } from './attendance-data';

export function buildAttendancePdf(officers: Officer[], context: { business: string; period: string; location: string }, individual?: Officer) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const title = individual ? 'Officer Attendance & Assessment' : 'Attendance Report';
  let cursor = 116;
  const table = (heading: string, head: string[], body: string[][]) => {
    if (cursor > 695) { doc.addPage(); cursor = 83; }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 35, 58);
    doc.setFontSize(12);
    doc.text(heading, 42, cursor);
    autoTable(doc, {
      startY: cursor + 9, head: [head], body, margin: { top: 82, bottom: 52, left: 42, right: 42 },
      styles: { fontSize: 9, cellPadding: 5, overflow: 'linebreak', textColor: [27, 39, 57] },
      headStyles: { fillColor: [35, 54, 88], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [241, 245, 250] },
    });
    cursor = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;
  };
  table('Attendance summary', summaryHeaders, officers.map(summaryRow));
  if (individual) {
    if (individual.punches.length) table('Recorded punches', punchHeaders, individual.punches.map(punchRow));
    if (individual.callouts.length) table('Call-outs and no-shows', calloutHeaders, individual.callouts.map(calloutRow));
    if (!individual.assessments.length) table('Supervisor assessments', ['Record'], [['No assessments in the selected period and location.']]);
    for (const record of individual.assessments) {
      table('Supervisor assessment', ['Field', 'Recorded details'], [
        ['Observed', formatRecordTime(record.observedAt, 'MM/dd/yyyy h:mm a')],
        ['Location', record.location.name], ['Evaluator', name(record.evaluator)],
        ['Overall score', record.score + '%'], ['Action', record.action],
        ['Follow-up', record.followUpAt ? formatRecordTime(record.followUpAt, 'MM/dd/yyyy') : '—'],
        ...assessmentEntries(record.ratings).map(([criterion, value]) => [criterion, Number(value) > 0 ? value + '/5' : 'Not observed']),
        ...assessmentEntries(record.checklist).map(([criterion, value]) => [criterion, label(String(value))]),
        ['Notes', record.notes],
      ]);
    }
  } else {
    const rows = officers.flatMap(officer => officer.callouts.map(entry => [name(officer.employee), ...calloutRow(entry)]));
    if (rows.length) table('Call-outs and no-shows', ['Officer', ...calloutHeaders], rows);
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setFillColor(18, 31, 54);
    doc.rect(0, 0, 612, 70, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, 42, 31);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(context.business, 42, 50, { maxWidth: 500 });
    if (page === 1) {
      doc.setTextColor(48, 65, 90);
      doc.text(context.period + ' | ' + context.location, 42, 89, { maxWidth: 520 });
    }
    doc.setTextColor(90, 102, 122);
    doc.text('Internal personnel record', 42, 757);
    doc.text(page + ' / ' + doc.getNumberOfPages(), 570, 757, { align: 'right' });
  }
  return doc;
}
