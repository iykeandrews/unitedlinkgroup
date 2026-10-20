import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { GeocodingService } from '../common/geocoding.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, GeocodingService],
  exports: [LocationsService],
})
export class LocationsModule {}

