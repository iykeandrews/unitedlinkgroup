import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@unitedlinkgroup.com';
  const password = 'admin123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  let user;
  if (!existingUser) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        firstName: 'Super',
        lastName: 'Admin',
      },
    });
    console.log('Super admin created');
  } else {
    // Update existing user to ensure role and password are correct
    user = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: 'SUPER_ADMIN',
      },
    });
    console.log('Super admin updated');
  }

  // Create or find a Business
  const businessName = 'United Link Group';
  let business = await prisma.business.findFirst({
    where: { ownerId: user.id }
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: businessName,
        ownerId: user.id,
        country: 'US',
      }
    });
    console.log('Business created');
  }

  // Create Leave Types if not exist
  const leaveTypes = [
    {
        name: 'Annual / Paid Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-green-100 text-green-800',
        accrualFrequency: 'MONTHLY',
        accrualRate: 10,
        maxBalance: 160,
        carryOverLimit: 40
    },
    {
        name: 'Sick Leave',
        isPaid: true,
        allowNegativeBalance: true,
        requiresApproval: false,
        color: 'bg-red-100 text-red-800',
        accrualFrequency: 'MONTHLY',
        accrualRate: 4,
        maxBalance: 80
    },
    {
        name: 'Unpaid Leave',
        isPaid: false,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-gray-100 text-gray-800'
    },
    {
        name: 'Compassionate / Bereavement Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-purple-100 text-purple-800'
    },
    {
        name: 'Maternity Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-pink-100 text-pink-800'
    },
    {
        name: 'Paternity Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-pink-100 text-pink-800'
    },
    {
        name: 'Parental Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-orange-100 text-orange-800'
    },
    {
        name: 'Adoption Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-orange-100 text-orange-800'
    },
    {
        name: 'Study / Training Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-blue-100 text-blue-800'
    },
    {
        name: 'Casual Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-teal-100 text-teal-800',
        accrualFrequency: 'MONTHLY',
        accrualRate: 3,
        maxBalance: 40
    },
    {
        name: 'Jury Duty',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-indigo-100 text-indigo-800'
    },
    {
        name: 'Military Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-yellow-100 text-yellow-800'
    },
    {
        name: 'Religious Observance Leave',
        isPaid: false,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-violet-100 text-violet-800'
    },
    {
        name: 'Sabbatical Leave',
        isPaid: false,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-slate-100 text-slate-800'
    },
    {
        name: 'Time Off In Lieu (TOIL)',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-lime-100 text-lime-800',
        carryOverLimit: 80
    },
    {
        name: 'Emergency Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-purple-100 text-purple-800'
    },
    {
        name: 'Hospitalization Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-red-100 text-red-800'
    },
    {
        name: 'Voting Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-blue-100 text-blue-800'
    },
    {
        name: 'Marriage Leave',
        isPaid: true,
        allowNegativeBalance: false,
        requiresApproval: true,
        color: 'bg-pink-100 text-pink-800'
    }
  ];

  for (const type of leaveTypes) {
    const exists = await prisma.leaveType.findFirst({
        where: { businessId: business.id, name: type.name }
    });
    if (!exists) {
        await prisma.leaveType.create({
            data: {
                businessId: business.id,
                ...type
            }
        });
        console.log(`Leave Type ${type.name} created`);
    } else {
        console.log(`Leave Type ${type.name} already exists`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
