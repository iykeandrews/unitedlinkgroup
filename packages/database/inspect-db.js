const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users:', JSON.stringify(users, null, 2));
    
    const businesses = await prisma.business.findMany();
    console.log('Businesses:', JSON.stringify(businesses, null, 2));

    const leaveTypes = await prisma.leaveType.findMany();
    console.log('LeaveTypes:', JSON.stringify(leaveTypes, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
