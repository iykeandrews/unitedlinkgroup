"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@unitedlinkgroup/database");
const prisma = new database_1.PrismaClient();
async function main() {
    console.log('Starting verification...');
    // 1. Get a Business
    const business = await prisma.business.findFirst();
    if (!business) {
        console.log('No business found. Cannot verify.');
        return;
    }
    console.log('Business:', business.name, business.id);
    // 2. Get or Create an Employee
    let employee = await prisma.employee.findFirst({
        where: { businessId: business.id }
    });
    if (!employee) {
        console.log('No employee found, creating one...');
        // Create a dummy user first if needed, but assuming seed data might exist or we can skip
        // For now, let's just list employees
        return;
    }
    console.log('Employee:', employee.firstName, employee.lastName, employee.id);
    // 3. Create an Active Timesheet (Start now, no end)
    const now = new Date();
    // Check if already has active timesheet
    const existingActive = await prisma.timesheet.findFirst({
        where: { employeeId: employee.id, endTime: null }
    });
    if (!existingActive) {
        console.log('Creating active timesheet...');
        await prisma.timesheet.create({
            data: {
                employeeId: employee.id,
                startTime: now,
                status: 'IN_PROGRESS',
                // locationId might be required depending on schema, but let's try without or null
            }
        });
    }
    else {
        console.log('Employee already has active timesheet:', existingActive.id);
    }
    // 4. Verify getBusinessTimesheets logic
    // Mimic the service query
    const start = new Date(now);
    start.setDate(start.getDate() - 1); // Yesterday
    const end = new Date(now);
    end.setDate(end.getDate() + 1); // Tomorrow
    console.log('Querying timesheets between', start, 'and', end);
    const timesheets = await prisma.timesheet.findMany({
        where: {
            employee: {
                businessId: business.id
            },
            startTime: { lte: end },
            OR: [
                { endTime: { gte: start } },
                { endTime: null }
            ]
        },
        include: {
            employee: true
        }
    });
    console.log('Found timesheets:', timesheets.length);
    timesheets.forEach(t => {
        console.log(`- ${t.id}: ${t.status} | Start: ${t.startTime} | End: ${t.endTime}`);
    });
    const activeFound = timesheets.find(t => t.endTime === null);
    if (activeFound) {
        console.log('SUCCESS: Active timesheet found in query.');
    }
    else {
        console.log('FAILURE: Active timesheet NOT found in query.');
    }
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
});
