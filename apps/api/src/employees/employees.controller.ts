import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Headers, Query, Delete } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('me')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  getMe(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.getMe(req.user, businessId);
  }

  @Patch('me/profile-image')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN)
  updateMyProfileImage(@Request() req: any, @Body() body: { url: string }, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.updateMyProfileImage(req.user, body.url, businessId);
  }

  @Patch('me/password')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN)
  updateMyPassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
    @Headers('x-business-id') businessId?: string
  ) {
    return this.employeesService.updateMyPassword(req.user, body, businessId);
  }

  @Patch('me/bio')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN)
  updateMyBio(@Request() req: any, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.updateMyBio(req.user, body, businessId);
  }

  @Get('me/availability')
  @Roles(UserRole.EMPLOYEE)
  listMyAvailability(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.listMyAvailability(req.user, businessId);
  }

  @Post('me/availability')
  @Roles(UserRole.EMPLOYEE)
  createMyAvailability(@Request() req: any, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.createMyAvailability(req.user, body, businessId);
  }

  @Patch('me/availability/:availabilityId')
  @Roles(UserRole.EMPLOYEE)
  updateMyAvailability(@Request() req: any, @Param('availabilityId') availabilityId: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.updateMyAvailability(req.user, availabilityId, body, businessId);
  }

  @Delete('me/availability/:availabilityId')
  @Roles(UserRole.EMPLOYEE)
  deleteMyAvailability(@Request() req: any, @Param('availabilityId') availabilityId: string, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.deleteMyAvailability(req.user, availabilityId, businessId);
  }

  @Get()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findAll(@Request() req: any, @Query('status') status?: string, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.findAll(req.user, status, businessId);
  }

  @Get('chat-directory')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  listChatDirectory(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.listChatDirectory(req.user, businessId);
  }

  @Get('qualifications/expiring')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  getExpiringQualifications(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.getExpiringQualifications(req.user, businessId);
  }

  @Get('qualifications/all')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  getAllQualifications(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.getAllQualifications(req.user, businessId);
  }

  @Get('me/qualifications')
  @Roles(UserRole.EMPLOYEE)
  getMyQualifications(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.getMyQualifications(req.user, businessId);
  }

  @Post('me/qualifications')
  @Roles(UserRole.EMPLOYEE)
  addMyQualification(@Request() req: any, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.addMyQualification(req.user, body, businessId);
  }

  @Patch('me/qualifications/:qualificationId')
  @Roles(UserRole.EMPLOYEE)
  updateMyQualification(@Request() req: any, @Param('qualificationId') qualificationId: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.updateMyQualification(req.user, qualificationId, body, businessId);
  }

  @Delete('me/qualifications/:qualificationId')
  @Roles(UserRole.EMPLOYEE)
  deleteMyQualification(@Request() req: any, @Param('qualificationId') qualificationId: string, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.deleteMyQualification(req.user, qualificationId, businessId);
  }

  @Get('availability/all')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  getAllAvailabilities(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.getAllAvailabilities(req.user, businessId);
  }

  @Get(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findOne(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.findOne(req.user, id, businessId);
  }

  @Post()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  create(@Request() req: any, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.create(req.user, body, businessId);
  }

  @Patch(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  update(@Request() req: any, @Param('id') id: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.update(req.user, id, body, businessId);
  }
  
  @Patch(':id/password')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  updatePassword(@Request() req: any, @Param('id') id: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.update(req.user, id, { password: body.password }, businessId);
  }

  @Get(':id/availability')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  listAvailability(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.listAvailability(req.user, id, businessId);
  }

  @Post(':id/availability')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  createAvailability(@Request() req: any, @Param('id') id: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.createAvailability(req.user, id, body, businessId);
  }

  @Patch(':id/availability/:availabilityId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  updateAvailability(@Request() req: any, @Param('id') id: string, @Param('availabilityId') availabilityId: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.updateAvailability(req.user, id, availabilityId, body, businessId);
  }

  @Delete(':id/availability/:availabilityId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  deleteAvailability(@Request() req: any, @Param('id') id: string, @Param('availabilityId') availabilityId: string, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.deleteAvailability(req.user, id, availabilityId, businessId);
  }

  @Get(':id/qualifications')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  getQualifications(@Request() req: any, @Param('id') id: string, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.getQualifications(req.user, id, businessId);
  }

  @Post(':id/qualifications')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  addQualification(@Request() req: any, @Param('id') id: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.addQualification(req.user, id, body, businessId);
  }

  @Patch(':id/qualifications/:qualificationId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  updateQualification(@Request() req: any, @Param('qualificationId') qualificationId: string, @Body() body: any, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.updateQualification(req.user, qualificationId, body, businessId);
  }

  @Delete(':id/qualifications/:qualificationId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  deleteQualification(@Request() req: any, @Param('qualificationId') qualificationId: string, @Headers('x-business-id') businessId?: string) {
    return this.employeesService.deleteQualification(req.user, qualificationId, businessId);
  }
}
