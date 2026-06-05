'use strict';

const { PrismaClient } = require('@unitedlinkgroup/database');
const prisma = new PrismaClient();

async function cleanupBusiness(businessId) {
  const invoices = await prisma.invoice.findMany({ where: { businessId }, select: { id: true } });
  const invoiceIds = invoices.map(i => i.id);
  if (invoiceIds.length) {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  }

  const locations = await prisma.location.findMany({ where: { businessId }, select: { id: true } });
  const locationIds = locations.map(l => l.id);
  const servicePins = locationIds.length
    ? await prisma.servicePin.findMany({ where: { locationId: { in: locationIds } }, select: { id: true } })
    : [];
  const servicePinIds = servicePins.map(p => p.id);
  if (servicePinIds.length) {
    await prisma.patrolLog.deleteMany({ where: { servicePinId: { in: servicePinIds } } });
  }
  if (locationIds.length) {
    await prisma.servicePin.deleteMany({ where: { locationId: { in: locationIds } } });
  }

  const employees = await prisma.employee.findMany({ where: { businessId }, select: { id: true } });
  const employeeIds = employees.map(e => e.id);

  const timesheets = employeeIds.length
    ? await prisma.timesheet.findMany({ where: { employeeId: { in: employeeIds } }, select: { id: true } })
    : [];
  const timesheetIds = timesheets.map(t => t.id);
  if (timesheetIds.length) {
    await prisma.break.deleteMany({ where: { timesheetId: { in: timesheetIds } } });
    await prisma.timesheet.deleteMany({ where: { id: { in: timesheetIds } } });
  }

  const leaveRequests = employeeIds.length
    ? await prisma.leaveRequest.findMany({ where: { employeeId: { in: employeeIds } }, select: { id: true } })
    : [];
  const leaveRequestIds = leaveRequests.map(l => l.id);
  if (leaveRequestIds.length) {
    await prisma.leaveAttachment.deleteMany({ where: { leaveRequestId: { in: leaveRequestIds } } });
  }
  if (employeeIds.length) {
    await prisma.leaveBalance.deleteMany({ where: { employeeId: { in: employeeIds } } });
  }
  if (leaveRequestIds.length) {
    await prisma.leaveRequest.deleteMany({ where: { id: { in: leaveRequestIds } } });
  }
  await prisma.leaveType.deleteMany({ where: { businessId } });

  if (employeeIds.length) {
    await prisma.shiftApplication.deleteMany({ where: { employeeId: { in: employeeIds } } });
  }

  if (employeeIds.length) {
    await prisma.contractorProfile.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await prisma.w2Profile.deleteMany({ where: { employeeId: { in: employeeIds } } });
  }

  const loans = employeeIds.length
    ? await prisma.loan.findMany({ where: { employeeId: { in: employeeIds } }, select: { id: true } })
    : [];
  const loanIds = loans.map(l => l.id);
  if (loanIds.length) {
    await prisma.loanRepayment.deleteMany({ where: { loanId: { in: loanIds } } });
    await prisma.loan.deleteMany({ where: { id: { in: loanIds } } });
  }

  const payrolls = await prisma.payroll.findMany({ where: { businessId }, select: { id: true } });
  const payrollIds = payrolls.map(p => p.id);
  if (payrollIds.length) {
    await prisma.payStub.deleteMany({ where: { payrollId: { in: payrollIds } } });
    await prisma.loanRepayment.deleteMany({ where: { payrollId: { in: payrollIds } } });
    await prisma.payroll.deleteMany({ where: { id: { in: payrollIds } } });
  }
  if (employeeIds.length) {
    await prisma.payStub.deleteMany({ where: { employeeId: { in: employeeIds } } });
  }

  const shifts = await prisma.shift.findMany({ where: { businessId }, select: { id: true } });
  const shiftIds = shifts.map(s => s.id);
  if (shiftIds.length) {
    await prisma.shiftApplication.deleteMany({ where: { shiftId: { in: shiftIds } } });
    await prisma.shift.deleteMany({ where: { id: { in: shiftIds } } });
  }

  const assets = await prisma.asset.findMany({ where: { businessId }, select: { id: true } });
  const assetIds = assets.map(a => a.id);
  if (assetIds.length) {
    await prisma.assetAssignmentHistory.deleteMany({ where: { assetId: { in: assetIds } } });
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
  }
  if (employeeIds.length) {
    await prisma.assetAssignmentHistory.deleteMany({ where: { employeeId: { in: employeeIds } } });
  }

  const announcements = await prisma.announcement.findMany({ where: { businessId }, select: { id: true } });
  const announcementIds = announcements.map(a => a.id);
  if (announcementIds.length) {
    await prisma.announcementRead.deleteMany({ where: { announcementId: { in: announcementIds } } });
    await prisma.announcement.deleteMany({ where: { id: { in: announcementIds } } });
  }

  await prisma.emailCampaign.deleteMany({ where: { businessId } });
  await prisma.emailTemplate.deleteMany({ where: { businessId } });
  await prisma.incidentReport.deleteMany({ where: { businessId } });
  await prisma.auditLog.deleteMany({ where: { businessId } });
  await prisma.payment.deleteMany({ where: { businessId } });
  await prisma.role.deleteMany({ where: { businessId } });
  await prisma.department.deleteMany({ where: { businessId } });
  if (invoiceIds.length) {
    await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  }

  await prisma.client.deleteMany({ where: { businessId } });

  if (locationIds.length) {
    await prisma.location.deleteMany({ where: { id: { in: locationIds } } });
  }

  if (employeeIds.length) {
    await prisma.qualification.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await prisma.availability.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  }

  await prisma.business.delete({ where: { id: businessId } });
}

async function main() {
  const businesses = await prisma.business.findMany({ select: { id: true, name: true } });
  if (!businesses.length) {
    console.log('No businesses found.');
    return;
  }
  for (const b of businesses) {
    console.log(`Deleting business: ${b.name} (${b.id})`);
    await cleanupBusiness(b.id);
    console.log(`Deleted business: ${b.name}`);
  }
  const remaining = await prisma.business.count();
  console.log(`Remaining businesses: ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
