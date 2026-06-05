import { PrismaClient } from '@unitedlinkgroup/database';

const prisma = new PrismaClient();

async function main() {
  const employeeId = '8be34940-d7ed-4b85-bbe1-27f269825556';
  const startDate = new Date('2025-01-01');
  
  // Create timesheets for 5 days (8 hours each) -> 40 hours
  for (let i = 0; i < 5; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    
    const end = new Date(day);
    end.setHours(17, 0, 0, 0);

    await prisma.timesheet.create({
      data: {
        employeeId,
        startTime: start,
        endTime: end,
        status: 'APPROVED',
      },
    });
  }

  console.log('Created 5 timesheets (40 hours)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
