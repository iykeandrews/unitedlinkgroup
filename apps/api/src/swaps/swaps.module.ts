import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SwapsController } from './swaps.controller';
import { SwapsService } from './swaps.service';

@Module({
  providers: [SwapsService, PrismaService],
  controllers: [SwapsController],
})
export class SwapsModule {}

