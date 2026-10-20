import { Module } from '@nestjs/common';
import { SwapsController } from './swaps.controller';
import { SwapsService } from './swaps.service';

@Module({
  providers: [SwapsService],
  controllers: [SwapsController],
})
export class SwapsModule {}

