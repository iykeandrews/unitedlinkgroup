import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  controllers: [VendorsController],
  providers: [VendorsService, PrismaService],
})
export class VendorsModule {}
