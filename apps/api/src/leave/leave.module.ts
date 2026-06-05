import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [LeaveService, PrismaService],
  controllers: [LeaveController],
  exports: [LeaveService],
})
export class LeaveModule {}
