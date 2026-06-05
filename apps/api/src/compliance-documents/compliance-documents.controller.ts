import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { ComplianceDocumentsService } from './compliance-documents.service';
import { UpsertComplianceDocumentDto } from './dto/upsert-compliance-document.dto';

@Controller('compliance-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ComplianceDocumentsController {
  constructor(private readonly service: ComplianceDocumentsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  list(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string, @Query() query?: any) {
    return this.service.list(req.user, headerBusinessId, query?.businessId, query);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  create(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Query('businessId') businessId: string | undefined,
    @Body() dto: UpsertComplianceDocumentDto
  ) {
    return this.service.create(req.user, headerBusinessId, dto, businessId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  update(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Query('businessId') businessId: string | undefined,
    @Param('id') id: string,
    @Body() dto: Partial<UpsertComplianceDocumentDto>
  ) {
    return this.service.update(req.user, headerBusinessId, id, dto, businessId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  delete(@Request() req: any, @Headers('x-business-id') headerBusinessId: string | undefined, @Query('businessId') businessId: string | undefined, @Param('id') id: string) {
    return this.service.delete(req.user, headerBusinessId, id, businessId);
  }
}

