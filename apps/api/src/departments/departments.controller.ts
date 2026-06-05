import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Headers, Query } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Body() createDepartmentDto: CreateDepartmentDto, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.create(createDepartmentDto, req.user, businessId);
  }

  @Get()
  findAll(@Request() req: any, @Headers('x-business-id') businessId?: string, @Query('status') status?: string) {
    return this.departmentsService.findAll(req.user, businessId, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.findOne(id, req.user, businessId);
  }

  @Get(':id/members')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  getMembers(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.getDepartmentMembers(id, req.user, businessId);
  }

  @Post(':id/members')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  addMember(@Request() req: any, @Param('id') id: string, @Body('employeeId') employeeId: string, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.addMember(id, employeeId, req.user, businessId);
  }

  @Delete(':id/members/:employeeId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  removeMember(@Request() req: any, @Param('id') id: string, @Param('employeeId') employeeId: string, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.removeMember(id, employeeId, req.user, businessId);
  }

  @Post(':id/manager')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  assignManager(@Request() req: any, @Param('id') id: string, @Body('employeeId') employeeId: string, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.assignManager(id, employeeId, req.user, businessId);
  }

  @Delete(':id/manager')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  removeManager(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.removeManager(id, req.user, businessId);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  update(@Request() req: any, @Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.update(id, updateDepartmentDto, req.user, businessId);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.departmentsService.remove(id, req.user, businessId);
  }
}
