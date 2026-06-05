"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@unitedlinkgroup/database");
const prisma = new database_1.PrismaClient();
async function main() {
    const email = 'admin@example.com';
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log('User not found, creating one...');
        user = await prisma.user.create({
            data: {
                email,
                password: 'hashedpassword', // In real app use bcrypt
                role: 'SUPER_ADMIN',
            },
        });
    }
    // Create Business
    const business = await prisma.business.create({
        data: {
            name: 'Tech Corp',
            ein: '12-3456789',
            ownerId: user.id,
        },
    });
    console.log(`Created Business: ${business.id}`);
    // Create Employee
    const employee = await prisma.employee.create({
        data: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@techcorp.com',
            businessId: business.id,
            role: 'EMPLOYEE',
            type: 'FULL_TIME',
            payType: 'HOURLY',
            hourlyRate: 25.0,
        },
    });
    console.log(`Created Employee: ${employee.id}`);
    // Create Timesheets
    // 5 days, 8 hours each
    const days = [0, 1, 2, 3, 4];
    const now = new Date();
    for (const day of days) {
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(9, 0, 0, 0);
        const end = new Date(start);
        end.setHours(17, 0, 0, 0);
        await prisma.timesheet.create({
            data: {
                employeeId: employee.id,
                startTime: start,
                endTime: end,
                status: 'APPROVED',
            },
        });
    }
    console.log('Created 5 Timesheets');
    // Calculate hours worked in the seeded period
    const timesheets = await prisma.timesheet.findMany({
        where: { employeeId: employee.id },
    });
    let hoursWorked = 0;
    for (const t of timesheets) {
        if (!t.endTime)
            continue;
        const diffMs = new Date(t.endTime).getTime() - new Date(t.startTime).getTime();
        const hours = Math.max(0, diffMs / (1000 * 60 * 60));
        hoursWorked += hours;
    }
    console.log(`Computed hours worked: ${hoursWorked}`);
    // Seed a PTO leave type aligned with hour-based accrual
    const pto = await prisma.leaveType.create({
        data: {
            businessId: business.id,
            name: 'PTO',
            description: 'Paid time off accrued based on hours worked',
            isPaid: true,
            allowNegativeBalance: false,
            requiresApproval: true,
            color: 'bg-green-100 text-green-800',
            // Accrual & Balance Rules
            // Empty frequency => PER_HOUR method; rate interpreted per hour worked
            accrualFrequency: null,
            accrualRate: 0.05, // 0.05 hours per hour worked (~2 hrs per 40)
            maxBalance: 160,
            carryOverLimit: 40,
        },
    });
    console.log(`Created Leave Type (PTO): ${pto.id}`);
    // Accrue PTO balance for the seeded hours
    const accrued = (pto.accrualRate || 0) * hoursWorked;
    await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId: { employeeId: employee.id, leaveTypeId: pto.id } },
        update: { balanceHours: { increment: accrued } },
        create: { employeeId: employee.id, leaveTypeId: pto.id, balanceHours: accrued, takenHours: 0 },
    });
    console.log(`Accrued PTO hours: ${accrued.toFixed(2)}`);
    // Create a payroll covering the seeded timesheets period
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - 4);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);
    const payDate = new Date(now);
    payDate.setDate(now.getDate() + 1);
    const payroll = await prisma.payroll.create({
        data: {
            businessId: business.id,
            periodStart,
            periodEnd,
            payDate,
            status: 'DRAFT',
        },
    });
    console.log(`Created Payroll: ${payroll.id}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
