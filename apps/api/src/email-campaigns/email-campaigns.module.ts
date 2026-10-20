import { Module } from '@nestjs/common';
import { EmailCampaignsService } from './email-campaigns.service';
import { EmailCampaignsController } from './email-campaigns.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [EmailCampaignsController],
  providers: [EmailCampaignsService],
})
export class EmailCampaignsModule {}
