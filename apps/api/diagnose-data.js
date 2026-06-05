"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@unitedlinkgroup/database");
const prisma = new database_1.PrismaClient();
async function main() {
    console.log('--- DIAGNOSTICS ---');
    const businesses = await prisma.business.findMany();
    console.log(`Found ${businesses.length} businesses.`);
    for (const b of businesses) {
        const empCount = await prisma.employee.count({ where: { businessId: b.id } });
        const tsCount = await prisma.timesheet.count({ where: { employee: { businessId: b.id } } });
        console.log(`Business: ${b.name} (${b.id})`);
        console.log(`  - Employees: ${empCount}`);
        console.log(`  - Timesheets: ${tsCount}`);
        if (empCount > 0) {
            const activeTs = await prisma.timesheet.count({
                where: {
                    employee: { businessId: b.id },
                    endTime: null
                }
            });
            console.log(`  - Active Timesheets: ${activeTs}`);
        }
    }
    console.log('-------------------');
}
main()
    .catch(e => console.error(e))
    .finally(async () => {
    await prisma.$disconnect();
});
