import { Controller, Post, Body, Get, Query, UseGuards, Param, Headers, Patch, Ip, Delete, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { TimeTrackingService } from './time-tracking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../auth/user.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('time-tracking')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post('import')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importTimesheets(
    @UploadedFile() file: any,
    @Body() body: { businessId: string },
    @User() user: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.timeTrackingService.importTimesheets(file.buffer, body.businessId, user);
  }

  @Post('clock-in')
  @Roles(UserRole.EMPLOYEE)
  async clockIn(
    @Body() body: { businessId?: string; locationId?: string; lat?: number; lng?: number },
    @User() user: any,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const realIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || ip || req.ip;
    console.log('Clock In Request - IP Capture:', {
      xForwardedFor: req.headers['x-forwarded-for'],
      nestIp: ip,
      reqIp: req.ip,
      resolvedRealIp: realIp
    });
    const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
    const shift = await this.timeTrackingService.requireClockInShift(employeeId);
    const locationId = shift.locationId || undefined;
    return this.timeTrackingService.clockIn(employeeId, locationId, body.lat, body.lng, realIp);
  }

  @Post('clock-out')
  @Roles(UserRole.EMPLOYEE)
  async clockOut(@Body() body: { businessId?: string; note?: string; lat?: number; lng?: number }, @User() user: any, @Ip() ip: string, @Req() req: Request) {
    const realIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || ip || req.ip;
    const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
    return this.timeTrackingService.clockOut(employeeId, realIp, body.note, body.lat, body.lng);
  }

  @Post('admin/clock-in')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async adminClockIn(
    @Body() body: { employeeId: string; locationId?: string },
    @User() user: any,
  ) {
    console.log('Admin Clock In Request:', body);
    return this.timeTrackingService.adminClockIn(body.employeeId, body.locationId, user);
  }

  @Post('admin/clock-out')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async adminClockOut(
    @Body() body: { employeeId: string },
    @User() user: any,
  ) {
    console.log('Admin Clock Out Request:', body);
    return this.timeTrackingService.adminClockOut(body.employeeId, user);
  }

  @Get('admin/status/:employeeId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async getEmployeeStatusForAdmin(@Param('employeeId') employeeId: string, @User() user: any) {
    return this.timeTrackingService.getEmployeeStatus(employeeId, user);
  }

  @Post('break/start')
  @Roles(UserRole.EMPLOYEE)
  async startBreak(@Body() body: { businessId?: string; type?: string; lat?: number; lng?: number }, @User() user: any) {
    const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
    return this.timeTrackingService.startBreak(employeeId, body.type, body.lat, body.lng);
  }

  @Post('break/end')
  @Roles(UserRole.EMPLOYEE)
  async endBreak(@Body() body: { businessId?: string; lat?: number; lng?: number }, @User() user: any) {
    const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
    return this.timeTrackingService.endBreak(employeeId, body.lat, body.lng);
  }

  @Post('location/ping')
  @Roles(UserRole.EMPLOYEE)
  async locationPing(@Body() body: { businessId?: string; lat?: number; lng?: number }, @User() user: any) {
    const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, body.businessId || user.businessId, user);
    return this.timeTrackingService.locationPing(employeeId, body.lat, body.lng);
  }

  @Get('status')
  @Roles(UserRole.EMPLOYEE)
  async getStatus(@User() user: any, @Query('businessId') businessId?: string) {
    const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, businessId || user.businessId, user);
    return this.timeTrackingService.getEmployeeStatus(employeeId);
  }

  @Get('timesheets')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  async getTimesheets(
    @Query('employeeId') queryEmployeeId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @User() user: any,
    @Headers('x-business-id') headerBusinessId?: string,
  ) {
    // If Employee, force own timesheets
    if (user.role === UserRole.EMPLOYEE) {
         const targetEmployeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, user.businessId, user);
         return this.timeTrackingService.getTimesheets(targetEmployeeId, new Date(start), new Date(end), user);
    }
    
    // Admin/Manager
    if (queryEmployeeId) {
      return this.timeTrackingService.getTimesheets(queryEmployeeId, new Date(start), new Date(end), user);
    }

    // If no specific employee requested, get all for business
    // Use header business ID if available (for Super Admin switching views), otherwise fallback to user's business
    let businessId = headerBusinessId;
    if (!businessId) {
        businessId = await this.timeTrackingService.getBusinessId(user.userId);
    }
    
    return this.timeTrackingService.getBusinessTimesheets(businessId, new Date(start), new Date(end), user);
  }

  @Patch('timesheets/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  async updateTimesheet(
    @Param('id') id: string,
    @Body() body: any,
    @User() user: any,
  ) {
    return this.timeTrackingService.updateTimesheet(id, body, user);
  }

  @Delete('timesheets/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  async deleteTimesheet(@Param('id') id: string, @User() user: any) {
    // If Employee, verify ownership
    if (user.role === UserRole.EMPLOYEE) {
        const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, undefined, user);
        return this.timeTrackingService.deleteTimesheet(id, employeeId, user);
    }
    return this.timeTrackingService.deleteTimesheet(id, undefined, user);
  }

  @Post('timesheets/:id/restore')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  async restoreTimesheet(@Param('id') id: string, @User() user: any) {
    // If Employee, verify ownership
    if (user.role === UserRole.EMPLOYEE) {
        const employeeId = await this.timeTrackingService.getEmployeeRecord(user.userId, undefined, user);
        return this.timeTrackingService.restoreTimesheet(id, employeeId, user);
    }
    return this.timeTrackingService.restoreTimesheet(id, undefined, user);
  }
}
