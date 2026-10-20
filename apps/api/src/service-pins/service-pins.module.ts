import { Module } from '@nestjs/common';
import { ServicePinsService } from './service-pins.service';
import { ServicePinsController } from './service-pins.controller';

@Module({
  controllers: [ServicePinsController],
  providers: [ServicePinsService],
  exports: [ServicePinsService]
})
export class ServicePinsModule {}
