import { PrismaClient } from '@unitedlinkgroup/database';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRole } from '@unitedlinkgroup/types';

async function main() {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'file:/Users/it/Documents/trae_projects/unitedlinkgroup/packages/database/prisma/dev.db';

  const email = 'superadmin@unitedlinkgroup.com';
  const prisma = new PrismaClient();

  const nextPassword = `ULG#${crypto.randomBytes(9).toString('base64url')}`;
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(nextPassword, salt);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
      },
    });
  }

  console.log(`Email: ${email}`);
  console.log(`Password: ${nextPassword}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

