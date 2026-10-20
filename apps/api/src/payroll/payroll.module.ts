import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { LeaveService } from '../leave/leave.service';

@Module({
  providers: [PayrollService, LeaveService],
  controllers: [PayrollController]
})
export class PayrollModule {}
