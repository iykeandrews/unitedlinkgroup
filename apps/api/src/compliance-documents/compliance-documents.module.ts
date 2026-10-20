import { Module } from '@nestjs/common';
import { ComplianceDocumentsController } from './compliance-documents.controller';
import { ComplianceDocumentsService } from './compliance-documents.service';

@Module({
  providers: [ComplianceDocumentsService],
  controllers: [ComplianceDocumentsController],
})
export class ComplianceDocumentsModule {}

