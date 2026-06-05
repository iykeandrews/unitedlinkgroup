import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  providers: [ContractsService, PrismaService],
  controllers: [ContractsController],
})
export class ContractsModule {}

