import {ShiftConfigurationService} from './shift-configuration.service';
import {ShiftConfigurationController} from './shift-configuration.controller';
import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { PrismaService } from '../prisma.service';
import { GeocodingService } from '../common/geocoding.service';

@Module({
  controllers: [LocationsController,ShiftConfigurationController],
  providers: [ShiftConfigurationService,LocationsService, PrismaService, GeocodingService],
  exports: [LocationsService],
})
export class LocationsModule {}

