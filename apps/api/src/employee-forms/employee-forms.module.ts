import { Module } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsStreamService } from '../notifications/notifications-stream.service';
import { PushService } from '../push/push.service';
import { EmployeeFormsController } from './employee-forms.controller';
import { EmployeeFormsService } from './employee-forms.service';

@Module({
  controllers: [EmployeeFormsController],
  providers: [EmployeeFormsService, NotificationsService, NotificationsStreamService, PushService],
})
export class EmployeeFormsModule {}

