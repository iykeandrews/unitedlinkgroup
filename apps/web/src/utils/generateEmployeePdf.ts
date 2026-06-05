import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getBase64ImageFromURL } from './image-utils';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  type: string;
  payType: string;
  hourlyRate?: number;
  salary?: number;
  phone?: string;
  address?: string;
  preferredName?: string;
  pronouns?: string;
  dateOfBirth?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  officialEmail?: string;
  hireDate?: string;
  payrollId?: string;
  workPeriod?: string;
  hoursPerPeriod?: number;
  daysPerPeriod?: number;
  stressProfile?: string;
}

interface Business {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  mobile?: string;
  email?: string; // Assuming email is available or we use a fallback
  logoUrl?: string;
}

export const generateEmployeePdf = async (employee: Employee, business?: Business | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Colors
  const primaryColor = [79, 70, 229] as [number, number, number]; // Indigo 600
  const secondaryColor = [107, 114, 128] as [number, number, number]; // Gray 500
  const lightBg = [249, 250, 251] as [number, number, number]; // Gray 50
  const darkText = [17, 24, 39] as [number, number, number]; // Gray 900

  // --- Header Section ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, 'F'); // Increased header height

  // Logo & Business Name
  if (business?.logoUrl) {
    try {
      const logoData = await getBase64ImageFromURL(business.logoUrl);
      doc.addImage(logoData, 'PNG', 20, 10, 30, 30, undefined, 'FAST');
    } catch (e) {
      console.warn('Failed to load logo', e);
      // Fallback if logo fails
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  const titleX = business?.logoUrl ? 60 : 20;
  doc.text(business?.name || 'Employee Profile', titleX, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (business?.address) {
    doc.text(`${business.address}, ${business.city || ''} ${business.state || ''} ${business.zip || ''}`, titleX, 35);
  }
  if (business?.mobile || business?.email) {
    doc.text(`${business.mobile || ''}  ${business.email || ''}`, titleX, 40);
  }

  // Document Title (Right side)
  doc.setFontSize(14);
  doc.text('EMPLOYEE PROFILE', pageWidth - 20, 25, { align: 'right' });
  doc.setFontSize(10);
  doc.text(format(new Date(), 'MMM dd, yyyy'), pageWidth - 20, 35, { align: 'right' });

  // --- Employee Summary Section ---
  let yPos = 70;

  // Name
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${employee.firstName} ${employee.lastName}`, 20, yPos);
  
  // Role
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(employee.role.replace(/_/g, ' '), 20, yPos + 8);
  
  // Status Badge
  const statusColor = employee.status === 'ACTIVE' ? [16, 185, 129] : [156, 163, 175];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - 50, yPos - 5, 30, 10, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(employee.status, pageWidth - 35, yPos + 1, { align: 'center' });

  yPos += 25;

  // Helper for sections
  const addSection = (title: string, data: [string, string][]) => {
    // Section Header
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.rect(15, yPos, pageWidth - 30, 10, 'F');
    doc.setDrawColor(229, 231, 235); // Gray 200
    doc.line(15, yPos + 10, pageWidth - 15, yPos + 10);
    
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 20, yPos + 7);
    
    yPos += 12;

    // Data Grid
    autoTable(doc, {
      startY: yPos,
      body: data,
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      bodyStyles: { 
        textColor: darkText,
        fontSize: 10,
        cellPadding: 5,
        lineColor: [229, 231, 235],
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [249, 250, 251], cellWidth: 60 },
        1: { fillColor: [255, 255, 255] }
      },
      margin: { left: 20, right: 20 },
    });
    
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;
  };

  // Personal Information
  addSection('Personal Information', [
    ['Full Name', `${employee.firstName} ${employee.lastName}`],
    ['Preferred Name', employee.preferredName || '-'],
    ['Date of Birth', employee.dateOfBirth ? format(new Date(employee.dateOfBirth), 'MMM dd, yyyy') : '-'],
    ['Email', employee.email],
    ['Phone', employee.phone || '-'],
    ['Address', employee.address ? `${employee.address}, ${employee.city || ''} ${employee.state || ''} ${employee.zip || ''}` : '-'],
  ]);

  // Employment Details
  const payRate = employee.hourlyRate 
    ? `$${employee.hourlyRate}/hr` 
    : employee.salary 
      ? `$${employee.salary.toLocaleString()}/yr` 
      : '-';

  addSection('Employment Details', [
    ['Employee ID', employee.payrollId || employee.id.substring(0, 8).toUpperCase()],
    ['Role', employee.role.replace(/_/g, ' ')],
    ['Employment Type', employee.type || '-'],
    ['Worker Type', employee.payType || '-'],
    ['Pay Rate', payRate],
    ['Hire Date', employee.hireDate ? format(new Date(employee.hireDate), 'MMM dd, yyyy') : '-'],
    ['Work Period', employee.workPeriod || '-'],
    ['Hours/Period', employee.hoursPerPeriod?.toString() || '-'],
  ]);
  
  // Emergency Contact
  if (employee.emergencyContactName) {
    addSection('Emergency Contact', [
      ['Name', employee.emergencyContactName],
      ['Phone', employee.emergencyContactPhone || '-'],
    ]);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated by United Link Group on ${format(new Date(), 'PPpp')}`, 20, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }

  doc.save(`${employee.lastName}_${employee.firstName}_Profile.pdf`);
};
