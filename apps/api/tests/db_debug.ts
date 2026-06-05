import { PrismaClient } from '@unitedlinkgroup/database';

async function main() {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:/Users/it/Documents/trae_projects/unitedlinkgroup/packages/database/prisma/dev.db';
  const prisma = new PrismaClient();
  try {
    const cols = await (prisma as any).$queryRawUnsafe('PRAGMA table_info(\"Location\");');
    console.log(cols);
  } finally {
    await prisma.$disconnect();
  }
}

main();

