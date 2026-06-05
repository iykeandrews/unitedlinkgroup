"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("@unitedlinkgroup/database");
const prisma = new database_1.PrismaClient();
async function main() {
    const employees = await prisma.employee.findMany();
    console.log('Employees:', employees);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
