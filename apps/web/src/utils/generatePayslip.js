"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePayslip = void 0;
const jspdf_1 = __importDefault(require("jspdf"));
const jspdf_autotable_1 = __importDefault(require("jspdf-autotable"));
const date_fns_1 = require("date-fns");
const localization_1 = require("../lib/localization");
const image_utils_1 = require("./image-utils");
const generatePayslip = async (payroll, business) => {
    var _a, _b;
    const doc = new jspdf_1.default();
    const stubs = payroll.payStubs || [];
    // Helper to format currency
    const fmt = (amount) => (0, localization_1.formatCurrency)(amount, business === null || business === void 0 ? void 0 : business.currencyCode);
    // Pre-load logo if available
    let logoDataUrl = null;
    if (business === null || business === void 0 ? void 0 : business.logoUrl) {
        try {
            logoDataUrl = await (0, image_utils_1.getBase64ImageFromURL)(business.logoUrl);
        }
        catch (error) {
            console.warn('Failed to load business logo for PDF:', error);
        }
    }
    for (let i = 0; i < stubs.length; i++) {
        const stub = stubs[i];
        const employee = stub.employee;
        if (i > 0) {
            doc.addPage();
        }
        // --- Header Section ---
        doc.setFontSize(22);
        doc.setTextColor(53, 101, 144); // Blue color
        doc.setFont('helvetica', 'bold');
        // Logo & Company Name
        if (logoDataUrl) {
            try {
                // Increased logo size and adjusted text position for better visibility
                doc.addImage(logoDataUrl, 'PNG', 14, 15, 30, 30);
                doc.text((business === null || business === void 0 ? void 0 : business.name) || 'Company Name', 50, 25);
                doc.setFontSize(10); // Increased from 9
                doc.setTextColor(0, 0, 0); // Darker text
                doc.setFont('helvetica', 'normal');
                const addressParts = [
                    business === null || business === void 0 ? void 0 : business.address,
                    business === null || business === void 0 ? void 0 : business.city,
                    business === null || business === void 0 ? void 0 : business.state,
                    business === null || business === void 0 ? void 0 : business.zip
                ].filter(Boolean);
                doc.text(addressParts.join(', ') || 'Address Not Available', 50, 32);
                doc.text(`Phone: ${(business === null || business === void 0 ? void 0 : business.mobile) || 'N/A'}`, 50, 38);
                // doc.text(`Email: ${business?.email || ''}`, 50, 44); // If email exists
            }
            catch (e) {
                doc.text((business === null || business === void 0 ? void 0 : business.name) || 'Company Name', 14, 25);
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                const addressParts = [
                    business === null || business === void 0 ? void 0 : business.address,
                    business === null || business === void 0 ? void 0 : business.city,
                    business === null || business === void 0 ? void 0 : business.state,
                    business === null || business === void 0 ? void 0 : business.zip
                ].filter(Boolean);
                doc.text(addressParts.join(', ') || 'Address Not Available', 14, 32);
                doc.text(`Phone: ${(business === null || business === void 0 ? void 0 : business.mobile) || 'N/A'}`, 14, 38);
            }
        }
        else {
            doc.text((business === null || business === void 0 ? void 0 : business.name) || 'Company Name', 14, 25);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            const addressParts = [
                business === null || business === void 0 ? void 0 : business.address,
                business === null || business === void 0 ? void 0 : business.city,
                business === null || business === void 0 ? void 0 : business.state,
                business === null || business === void 0 ? void 0 : business.zip
            ].filter(Boolean);
            doc.text(addressParts.join(', ') || 'Address Not Available', 14, 32);
            doc.text(`Phone: ${(business === null || business === void 0 ? void 0 : business.mobile) || 'N/A'}`, 14, 38);
        }
        // "PAYSLIP" Title
        doc.setFontSize(24);
        doc.setTextColor(53, 101, 144);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYSLIP', 196, 25, { align: 'right' });
        // --- Top Details Section (Employee & Pay Grid) ---
        const topGridY = 55;
        // Left: Employee Information
        doc.setFillColor(108, 148, 184); // Lighter blue for header bg
        doc.rect(14, topGridY, 80, 8, 'F'); // Header bar
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('EMPLOYEE INFORMATION', 16, topGridY + 5);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`${employee.firstName} ${employee.lastName}`, 14, topGridY + 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(employee.address || 'Address not on file', 14, topGridY + 22);
        if (employee.city && employee.state) {
            doc.text(`${employee.city}, ${employee.state} ${employee.zip || ''}`, 14, topGridY + 27);
        }
        // doc.text(`Phone: ${employee.phone || ''}`, 14, topGridY + 32);
        // Right: Pay Details Grid
        // 3 columns: Pay Date | Pay Type | Period
        // 2nd row: Payroll # | NI Number (SSN) | Tax Code
        const gridX = 105;
        const colWidth = 30;
        const rowHeight = 8;
        // Headers Row 1
        doc.setFillColor(108, 148, 184);
        doc.rect(gridX, topGridY, colWidth - 0.5, rowHeight, 'F');
        doc.rect(gridX + colWidth, topGridY, colWidth - 0.5, rowHeight, 'F');
        doc.rect(gridX + colWidth * 2, topGridY, colWidth, rowHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('PAY DATE', gridX + colWidth / 2, topGridY + 5, { align: 'center' });
        doc.text('PAY TYPE', gridX + colWidth * 1.5, topGridY + 5, { align: 'center' });
        doc.text('PERIOD', gridX + colWidth * 2.5, topGridY + 5, { align: 'center' });
        // Values Row 1
        doc.setFillColor(235, 235, 235); // Light Gray
        doc.rect(gridX, topGridY + rowHeight, colWidth - 0.5, rowHeight, 'F');
        doc.rect(gridX + colWidth, topGridY + rowHeight, colWidth - 0.5, rowHeight, 'F');
        doc.rect(gridX + colWidth * 2, topGridY + rowHeight, colWidth, rowHeight, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text((0, date_fns_1.format)(new Date(payroll.payDate), 'MM/dd/yyyy'), gridX + colWidth / 2, topGridY + rowHeight + 5, { align: 'center' });
        doc.text(payroll.type || 'Regular', gridX + colWidth * 1.5, topGridY + rowHeight + 5, { align: 'center' });
        doc.text((0, date_fns_1.format)(new Date(payroll.periodEnd), 'MMM d'), gridX + colWidth * 2.5, topGridY + rowHeight + 5, { align: 'center' });
        // Headers Row 2
        const row2Y = topGridY + rowHeight * 2 + 2;
        doc.setFillColor(108, 148, 184);
        doc.rect(gridX, row2Y, colWidth - 0.5, rowHeight, 'F');
        doc.rect(gridX + colWidth, row2Y, colWidth - 0.5, rowHeight, 'F');
        doc.rect(gridX + colWidth * 2, row2Y, colWidth, rowHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYROLL #', gridX + colWidth / 2, row2Y + 5, { align: 'center' });
        doc.text('SSN (Last 4)', gridX + colWidth * 1.5, row2Y + 5, { align: 'center' });
        doc.text('TAX STATE', gridX + colWidth * 2.5, row2Y + 5, { align: 'center' });
        // Values Row 2
        doc.setFillColor(235, 235, 235);
        doc.rect(gridX, row2Y + rowHeight, colWidth - 0.5, rowHeight, 'F');
        doc.rect(gridX + colWidth, row2Y + rowHeight, colWidth - 0.5, rowHeight, 'F');
        doc.rect(gridX + colWidth * 2, row2Y + rowHeight, colWidth, rowHeight, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        // Using payroll ID slice as placeholder for Payroll #
        doc.text(payroll.id.slice(-6).toUpperCase(), gridX + colWidth / 2, row2Y + rowHeight + 5, { align: 'center' });
        // Masked SSN if available, or placeholder
        const ssn = employee.ssn ? `***-**-${employee.ssn.slice(-4)}` : 'N/A';
        doc.text(ssn, gridX + colWidth * 1.5, row2Y + rowHeight + 5, { align: 'center' });
        doc.text(employee.state || employee.taxState || '-', gridX + colWidth * 2.5, row2Y + rowHeight + 5, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Method:', gridX, row2Y + rowHeight * 2 + 8);
        doc.setFont('helvetica', 'normal');
        doc.text('Check / Direct Deposit', gridX + 35, row2Y + rowHeight * 2 + 8);
        // --- Earnings Table ---
        const earningsY = row2Y + rowHeight * 3 + 10;
        const earningsBody = [
            ['Regular Pay', ((_a = stub.regularHours) === null || _a === void 0 ? void 0 : _a.toFixed(2)) || '-', (stub.regularPay / (stub.regularHours || 1)).toFixed(2), fmt(stub.regularPay), '-'],
            ['Overtime Pay', ((_b = stub.overtimeHours) === null || _b === void 0 ? void 0 : _b.toFixed(2)) || '-', (stub.overtimePay / (stub.overtimeHours || 1)).toFixed(2), fmt(stub.overtimePay), '-'],
            ['Bonus', '-', '-', fmt(stub.bonus || 0), '-'],
            ['Commission', '-', '-', fmt(stub.commission || 0), '-'],
            ['Reimbursement', '-', '-', fmt(stub.reimbursement || 0), '-'],
        ].filter(row => row[3] !== fmt(0));
        // Add empty rows to maintain minimum height/look if needed, or just let it be dynamic
        (0, jspdf_autotable_1.default)(doc, {
            startY: earningsY,
            head: [['EARNINGS', 'HOURS', 'RATE', 'CURRENT', 'YTD']],
            body: earningsBody,
            theme: 'plain',
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Earnings Name
                1: { cellWidth: 25 }, // Hours
                2: { cellWidth: 25 }, // Rate
                3: { cellWidth: 30, halign: 'right' }, // Current
                4: { cellWidth: 30, halign: 'right' }, // YTD
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: { bottom: 0.1 }
            },
            foot: [['', '', 'GROSS PAY', fmt(stub.grossPay), '-']],
            footStyles: {
                fillColor: [180, 180, 180],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'right'
            }
        });
        // --- Deductions Table ---
        const taxDetails = stub.taxDetails ? JSON.parse(stub.taxDetails) : {};
        const deductionDetails = stub.deductionDetails ? JSON.parse(stub.deductionDetails) : {};
        const loans = deductionDetails.loans || [];
        const deductionsBody = [
            ['Federal Tax (WTH)', fmt(taxDetails.federalTax || 0), '-'],
            ['Social Security (FICA)', fmt(taxDetails.socialSecurity || 0), '-'],
            ['Medicare (MEDFICA)', fmt(taxDetails.medicare || 0), '-'],
            ['State Tax', fmt(taxDetails.stateTax || 0), '-'],
            ...loans.map((l) => ['Loan Repayment', fmt(l.amount || 0), '-'])
        ].filter(row => row[1] !== fmt(0));
        const totalDeductions = fmt(stub.taxes + stub.deductions);
        (0, jspdf_autotable_1.default)(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['DEDUCTIONS', 'CURRENT', 'YTD']],
            body: deductionsBody,
            theme: 'plain',
            headStyles: {
                fillColor: [220, 220, 220],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Desc
                1: { cellWidth: 30, halign: 'right' }, // Current
                2: { cellWidth: 30, halign: 'right' }, // YTD
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [200, 200, 200],
                lineWidth: { bottom: 0.1 }
            },
            foot: [['TOTAL DEDUCTIONS', totalDeductions, '-']],
            footStyles: {
                fillColor: [180, 180, 180],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'right'
            }
        });
        // --- Net Pay ---
        const finalY = doc.lastAutoTable.finalY + 10;
        const netPayX = 135;
        doc.setFillColor(200, 200, 200);
        doc.rect(netPayX, finalY, 30, 8, 'F'); // Label bg
        doc.setFillColor(160, 160, 160);
        doc.rect(netPayX + 30, finalY, 30, 8, 'F'); // Value bg
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('NET PAY', netPayX + 15, finalY + 5.5, { align: 'center' });
        doc.text(fmt(stub.netPay), netPayX + 45, finalY + 5.5, { align: 'center' });
        // Footer Text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('If you have any questions about this payslip, please contact:', 105, 260, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text((business === null || business === void 0 ? void 0 : business.name) || 'HR Department', 105, 265, { align: 'center' });
        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by United Link Group Payroll', 105, 280, { align: 'center' });
    }
    doc.save(`Payroll_${(0, date_fns_1.format)(new Date(payroll.payDate), 'yyyy-MM-dd')}.pdf`);
};
exports.generatePayslip = generatePayslip;
