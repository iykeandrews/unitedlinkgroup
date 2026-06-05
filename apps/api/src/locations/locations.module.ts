import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { PrismaService } from '../prisma.service';
import { GeocodingService } from '../common/geocoding.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, PrismaService, GeocodingService],
  exports: [LocationsService],
})
export class LocationsModule {}

