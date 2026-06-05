import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UsePipes, ValidationPipe, Headers, Query, BadRequestException, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { IncidentReportsService } from './incident-reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { UploadsService } from '../uploads/uploads.service';

@Controller('incident-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentReportsController {
  constructor(private readonly incidentReportsService: IncidentReportsService, private readonly uploadsService: UploadsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Request() req: any, @Body() createDto: CreateIncidentReportDto, @Headers('x-business-id') headerBusinessId?: string) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.incidentReportsService.create(createDto, req.user, headerBusinessId, { userAgent });
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  findAll(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('locationId') locationId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('reportingOfficerEmployeeId') reportingOfficerEmployeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.incidentReportsService.findAll(req.user, headerBusinessId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search,
      locationId,
      type,
      severity,
      status,
      reportingOfficerEmployeeId,
      from,
      to,
    });
  }

  @Get('summary/locations')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  getLocationSummary(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId?: string,
    @Query('status') status?: string
  ) {
    return this.incidentReportsService.getSummaryByLocation(req.user, headerBusinessId, status);
  }

  @Get('analytics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  getAnalytics(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string, @Query('period') period?: string) {
    const p = (period as any) || 'weekly';
    const resolved = p === 'daily' || p === 'weekly' || p === 'monthly' ? p : 'weekly';
    return this.incidentReportsService.getAnalytics(req.user, headerBusinessId, resolved);
  }

  @Get('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  async export(
    @Request() req: any,
    @Headers('x-business-id') headerBusinessId: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @Query('format') format?: string,
    @Query('search') search?: string,
    @Query('locationId') locationId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('reportingOfficerEmployeeId') reportingOfficerEmployeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const f = format === 'xlsx' ? 'xlsx' : 'csv';
    const out = await this.incidentReportsService.exportIncidents(req.user, headerBusinessId, f, {
      search,
      locationId,
      type,
      severity,
      status,
      reportingOfficerEmployeeId,
      from,
      to,
    });
    res.setHeader('Content-Type', out.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    return out.data;
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.incidentReportsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Request() req: any, @Param('id') id: string, @Body() updateDto: Partial<CreateIncidentReportDto>) {
    return this.incidentReportsService.update(id, updateDto, req.user);
  }

  @Post(':id/notes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  addNote(@Request() req: any, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.incidentReportsService.addInvestigationNote(id, req.user, body?.note || '');
  }

  @Post(':id/assign-investigator')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  assignInvestigator(@Request() req: any, @Param('id') id: string, @Body() body: { investigatorEmployeeId?: string }) {
    if (!body?.investigatorEmployeeId) throw new BadRequestException('investigatorEmployeeId is required');
    return this.incidentReportsService.assignInvestigator(id, req.user, body.investigatorEmployeeId);
  }

  @Post(':id/evidence')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
  }))
  async uploadEvidence(@Request() req: any, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('file is required');
    const uploaded = await this.uploadsService.uploadBuffer({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      prefix: 'incident',
    });
    return this.incidentReportsService.addEvidence(id, req.user, {
      url: uploaded.url,
      filename: uploaded.key,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimeType || undefined,
      sizeBytes: uploaded.size,
    });
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.incidentReportsService.remove(id, req.user);
  }
}
