import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  providers: [ContractsService],
  controllers: [ContractsController],
})
export class ContractsModule {}

