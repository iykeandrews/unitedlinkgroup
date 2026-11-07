import ExcelJS from "exceljs";
import { FinanceSummary } from "./finance-summary";
import { displayReportDate } from "../time-tracking/timesheet-report";

export async function financeSummaryExcel(report: FinanceSummary) {
  const book = new ExcelJS.Workbook();
  book.creator = report.business.name;
  const currency = '"$"#,##0.00;[Red]("$"#,##0.00)';
  const add = (name: string, heads: string[], rows: any[][], moneyCols: number[]) => {
    const sheet = book.addWorksheet(name);
    sheet.mergeCells(1, 1, 1, heads.length);
    sheet.getCell(1, 1).value = report.business.name;
    sheet.getRow(1).font = {bold:true,size:16};
    sheet.mergeCells(2, 1, 2, heads.length);
    sheet.getCell(2, 1).value = report.business.address;
    sheet.mergeCells(3, 1, 3, heads.length);
    sheet.getCell(3, 1).value = report.title + " | " + displayReportDate(report.from) + " - " + displayReportDate(report.to);
    const header = sheet.addRow(heads);
    header.font = {bold:true,color:{argb:"FFFFFFFF"}};
    header.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FF142E44"}};
    rows.forEach(row => sheet.addRow(row));
    sheet.columns.forEach((col,i) => {col.width = i === 0 ? 36 : 23; col.alignment={vertical:"middle",wrapText:true};});
    moneyCols.forEach(col => sheet.getColumn(col).numFmt=currency);
    sheet.views=[{state:"frozen",ySplit:4}];
    sheet.pageSetup={orientation:"portrait",fitToPage:true,fitToWidth:1,fitToHeight:0};
    return sheet;
  };
  const t=report.totals;
  add("Summary",["Measure","Amount"],[
    ["Total invoice revenue",t.revenue], ["Officer's wages",t.grossPay],
    ["Estimated employer taxes",t.employerTaxes],
    ["Total employer cost",t.employerCost], ["Estimated Net Income",t.margin],
    ["Worker deductions",t.deductions],
  ],[2]);
  add("Locations",["Location","Revenue","Officer's wages","Net"],report.locations.map(l=>[l.name,l.revenue,l.gross,l.margin]).concat([["TOTAL",t.revenue,t.grossPay,t.margin]]),[2,3,4]);
  for(const [type,name] of [["W2","W-2 employees"],["CONTRACTOR_1099","1099 contractors"]]) {
    const total=report.workerTotals.find(g=>g.workerType===type)!;
    add(name,["Worker","Profile rate","Approved hours","Actual hours","Officer's wages","Deductions"],
      [...report.workers.filter(w=>w.workerType===type).map(w=>[w.name,w.profileRate,w.hours,w.actualHours,w.gross,w.deductions]),
      ["TOTAL",null,total.approvedHours,total.actualHours,total.grossPay,total.deductions]],[2,5,6]);
  }
  add("Deduction detail",["Worker","Description","Amount","Status"],report.deductions.map(d=>[d.name.toUpperCase(),d.type,d.amount,d.status]),[3]);
  add("Calculation basis",["Measure","Explanation"],report.notes.map(note=>["Basis",note]),[]);
  return Buffer.from(await book.xlsx.writeBuffer());
}
