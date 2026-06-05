import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { CompanyCertificationsService } from './company-certifications.service';
import { UpsertCompanyCertificationDto } from './dto/upsert-company-certification.dto';

@Controller('company-certifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class CompanyCertificationsController {
  constructor(private readonly service: CompanyCertificationsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  list(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string, @Query('businessId') queryBusinessId?: string) {
    return this.service.list(req.user, headerBusinessId, queryBusinessId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  create(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Query('businessId') queryBusinessId: string | undefined,
    @Body() dto: UpsertCompanyCertificationDto
  ) {
    return this.service.create(req.user, headerBusinessId, dto, queryBusinessId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  update(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Query('businessId') queryBusinessId: string | undefined,
    @Param('id') id: string,
    @Body() dto: Partial<UpsertCompanyCertificationDto>
  ) {
    return this.service.update(req.user, headerBusinessId, id, dto, queryBusinessId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN)
  delete(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Query('businessId') queryBusinessId: string | undefined,
    @Param('id') id: string
  ) {
    return this.service.delete(req.user, headerBusinessId, id, queryBusinessId);
  }
}

