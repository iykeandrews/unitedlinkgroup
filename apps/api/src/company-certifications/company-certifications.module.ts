import { Module } from '@nestjs/common';
import { CompanyCertificationsController } from './company-certifications.controller';
import { CompanyCertificationsService } from './company-certifications.service';

@Module({
  providers: [CompanyCertificationsService],
  controllers: [CompanyCertificationsController],
})
export class CompanyCertificationsModule {}

