import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { SmtpMailerService } from '../common/email/smtp-mailer.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, SmtpMailerService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
