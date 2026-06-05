import { Module } from '@nestjs/common';
import { ServicePinsService } from './service-pins.service';
import { ServicePinsController } from './service-pins.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [ServicePinsController],
  providers: [ServicePinsService, PrismaService],
  exports: [ServicePinsService]
})
export class ServicePinsModule {}
