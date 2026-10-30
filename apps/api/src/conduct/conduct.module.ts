import { Module } from "@nestjs/common";
import { ConductController } from "./conduct.controller";
import { ConductService } from "./conduct.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { PushModule } from "../push/push.module";
import { ComplaintPortalController } from "./complaint-portal.controller";
import { ComplaintPortalService } from "./complaint-portal.service";
import { SmtpMailerService } from "../common/email/smtp-mailer.service";
@Module({
  imports: [NotificationsModule, PushModule],
  controllers: [ConductController, ComplaintPortalController],
  providers: [ConductService, ComplaintPortalService, SmtpMailerService],
})
export class ConductModule {}
