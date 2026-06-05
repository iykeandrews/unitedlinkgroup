import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { EmployeeFormsService } from './employee-forms.service';
import { CreateEmployeeFormTemplateDto } from './dto/create-employee-form-template.dto';
import { UpdateEmployeeFormTemplateDto } from './dto/update-employee-form-template.dto';
import { AssignEmployeeFormTemplateDto } from './dto/assign-employee-form-template.dto';
import { SubmitEmployeeFormAssignmentDto } from './dto/submit-employee-form-assignment.dto';

@Controller('employee-forms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeFormsController {
  constructor(private readonly employeeFormsService: EmployeeFormsService) {}

  @Get('templates')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  listTemplates(@Request() req: any, @Headers('x-business-id') businessId?: string, @Query() query?: any) {
    return this.employeeFormsService.listTemplates(req.user, businessId, query);
  }

  @Post('templates')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  createTemplate(@Request() req: any, @Body() dto: CreateEmployeeFormTemplateDto, @Headers('x-business-id') businessId?: string) {
    return this.employeeFormsService.createTemplate(req.user, dto, businessId);
  }

  @Patch('templates/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  updateTemplate(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateEmployeeFormTemplateDto) {
    return this.employeeFormsService.updateTemplate(req.user, id, dto);
  }

  @Delete('templates/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  archiveTemplate(@Request() req: any, @Param('id') id: string) {
    return this.employeeFormsService.archiveTemplate(req.user, id);
  }

  @Post('templates/:id/assign')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  assignTemplate(@Request() req: any, @Param('id') id: string, @Body() dto: AssignEmployeeFormTemplateDto, @Headers('x-business-id') businessId?: string) {
    return this.employeeFormsService.assignTemplate(req.user, id, dto, businessId);
  }

  @Get('assignments')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  listAssignments(@Request() req: any, @Headers('x-business-id') businessId?: string, @Query() query?: any) {
    return this.employeeFormsService.listAssignmentsAdmin(req.user, businessId, query);
  }

  @Get('assignments/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  adminGetAssignment(@Request() req: any, @Param('id') id: string) {
    return this.employeeFormsService.adminGetAssignment(req.user, id);
  }

  @Get('my-assignments')
  myAssignments(@Request() req: any, @Query() query?: any) {
    return this.employeeFormsService.listMyAssignments(req.user, query);
  }

  @Get('my-assignments/:id')
  myAssignment(@Request() req: any, @Param('id') id: string) {
    return this.employeeFormsService.getMyAssignment(req.user, id);
  }

  @Post('my-assignments/:id/submit')
  mySubmit(@Request() req: any, @Param('id') id: string, @Body() dto: SubmitEmployeeFormAssignmentDto) {
    return this.employeeFormsService.submitMyAssignment(req.user, id, dto);
  }
}

