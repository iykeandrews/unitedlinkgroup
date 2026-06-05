import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PrismaService } from '../prisma.service';
import { LeaveService } from '../leave/leave.service';

@Module({
  providers: [PayrollService, PrismaService, LeaveService],
  controllers: [PayrollController]
})
export class PayrollModule {}
