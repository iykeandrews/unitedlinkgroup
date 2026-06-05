import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CompanyCertificationsController } from './company-certifications.controller';
import { CompanyCertificationsService } from './company-certifications.service';

@Module({
  providers: [CompanyCertificationsService, PrismaService],
  controllers: [CompanyCertificationsController],
})
export class CompanyCertificationsModule {}

