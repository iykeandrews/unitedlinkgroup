import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ComplianceDocumentsController } from './compliance-documents.controller';
import { ComplianceDocumentsService } from './compliance-documents.service';

@Module({
  providers: [ComplianceDocumentsService, PrismaService],
  controllers: [ComplianceDocumentsController],
})
export class ComplianceDocumentsModule {}

