import { MobileOperationsService } from "./mobile-operations.service";
import { Module } from "@nestjs/common";
import { TimeTrackingService } from "./time-tracking.service";
import { TimeTrackingController } from "./time-tracking.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { PushModule } from "../push/push.module";

@Module({
  imports: [NotificationsModule, PushModule],
  providers: [TimeTrackingService, MobileOperationsService],
  controllers: [TimeTrackingController],
})
export class TimeTrackingModule {}
