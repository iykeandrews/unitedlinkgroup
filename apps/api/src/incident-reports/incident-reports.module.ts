import { Module } from '@nestjs/common';
import { IncidentReportsService } from './incident-reports.service';
import { IncidentReportsController } from './incident-reports.controller';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';
import {SmtpMailerService} from '../common/email/smtp-mailer.service';

@Module({
  imports: [NotificationsModule, UploadsModule],
  controllers: [IncidentReportsController],
  providers: [IncidentReportsService, PrismaService, SmtpMailerService],
})
export class IncidentReportsModule {}
