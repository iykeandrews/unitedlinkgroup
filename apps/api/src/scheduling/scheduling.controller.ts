import { Controller, Post, Body, Get, Query, Put, Param, Delete, UseGuards, Request, Headers } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { Prisma } from '@unitedlinkgroup/database';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('scheduling')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('shifts')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  createShift(@Body() data: Prisma.ShiftCreateInput, @Request() req: any) {
    return this.schedulingService.createShift(data, req.user);
  }

  @Get('shifts')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async getShifts(
    @Query('businessId') queryBusinessId: string,
    @Headers('x-business-id') headerBusinessId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('employeeId') employeeId: string,
    @Request() req: any
  ) {
    console.log('getShifts called', { queryBusinessId, headerBusinessId, start, end, employeeId, user: req.user });
    try {
      let targetBusinessId = queryBusinessId || headerBusinessId;
      if (!targetBusinessId) {
          // Only try to derive from user if they are not super admin, or if we want to support employee fallback
          if (req.user.role === UserRole.SUPER_ADMIN) {
               throw new Error('Business context required for Super Admin');
          }
          targetBusinessId = await this.schedulingService.getBusinessId(req.user.userId);
      }
      console.log('targetBusinessId resolved:', targetBusinessId);
      return await this.schedulingService.getShifts(targetBusinessId, new Date(start), new Date(end), req.user, employeeId);
    } catch (error) {
      console.error('Error in getShifts:', error);
      throw error;
    }
  }

  @Get('my')
  @Roles(UserRole.EMPLOYEE)
  async getMyShifts(
    @Query('start') start: string,
    @Query('end') end: string,
    @Request() req: any
  ) {
    return this.schedulingService.getMyShifts(req.user.userId, new Date(start), new Date(end));
  }

  @Get('my-callouts')
  @Roles(UserRole.EMPLOYEE)
  async getMyCallouts(@Request() req: any) {
    return this.schedulingService.getMyCallouts(req.user.userId);
  }
  
  @Get('my-peers')
  @Roles(UserRole.EMPLOYEE)
  async getMyPeerShifts(
    @Query('start') start: string,
    @Query('end') end: string,
    @Request() req: any
  ) {
    return this.schedulingService.getMyPeerShifts(req.user.userId, new Date(start), new Date(end));
  }

  @Post('shifts/:id/apply')
  @Roles(UserRole.EMPLOYEE)
  applyForShift(@Param('id') id: string, @Request() req: any) {
    return this.schedulingService.applyForShift(id, req.user.userId);
  }

  @Post('applications/:id/approve')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  approveShiftApplication(@Param('id') id: string, @Request() req: any) {
    return this.schedulingService.approveShiftApplication(id, req.user);
  }

  @Post('applications/:id/decline')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  declineShiftApplication(@Param('id') id: string, @Request() req: any) {
    return this.schedulingService.declineShiftApplication(id, req.user);
  }

  @Post('shifts/:id/callout')
  @Roles(UserRole.EMPLOYEE, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  recordCallout(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
    @Headers('x-forwarded-for') ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.schedulingService.recordCallout(id, body, req.user, { ipAddress: ip, userAgent });
  }

  @Get('callouts/pending')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  listPendingCallouts(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.schedulingService.listPendingCallouts(req.user, businessId);
  }

  @Post('callouts/:id/approve')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  approveCallout(@Param('id') id: string, @Request() req: any) {
    return this.schedulingService.approveCallout(id, req.user);
  }

  @Post('callouts/:id/reject')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  rejectCallout(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.schedulingService.rejectCallout(id, body, req.user);
  }

  @Post('shifts/:id/reassign')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  reassignShift(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
    @Headers('x-forwarded-for') ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.schedulingService.reassignShift(id, body, req.user, { ipAddress: ip, userAgent });
  }

  @Post('shifts/:id/broadcast')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  broadcastShift(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
    @Headers('x-forwarded-for') ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.schedulingService.broadcastOpenShift(id, body, req.user, { ipAddress: ip, userAgent });
  }

  @Get('shifts/:id/history')
  @Roles(UserRole.EMPLOYEE, UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  shiftHistory(@Param('id') id: string, @Request() req: any) {
    return this.schedulingService.getShiftHistory(id, req.user);
  }

  @Put('shifts/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  updateShift(@Param('id') id: string, @Body() data: Prisma.ShiftUpdateInput, @Request() req: any) {
    return this.schedulingService.updateShift(id, data, req.user);
  }

  @Delete('shifts/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  deleteShift(@Param('id') id: string, @Request() req: any) {
    return this.schedulingService.deleteShift(id, req.user);
  }

  @Post('shifts/publish')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  publishShifts(
    @Query('businessId') queryBusinessId: string,
    @Headers('x-business-id') headerBusinessId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Request() req: any
  ) {
    let targetBusinessId = queryBusinessId || headerBusinessId;
    if (!targetBusinessId) {
      if (req.user.role === UserRole.SUPER_ADMIN) {
        throw new Error('Business context required for Super Admin');
      }
      return this.schedulingService.getBusinessId(req.user.userId).then(businessId => {
        return this.schedulingService.publishShifts(businessId, new Date(start), new Date(end), req.user);
      });
    }
    return this.schedulingService.publishShifts(targetBusinessId, new Date(start), new Date(end), req.user);
  }

  @Post('auto-schedule')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  autoSchedule(
    @Query('businessId') queryBusinessId: string,
    @Headers('x-business-id') headerBusinessId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('clientId') clientId: string,
    @Request() req: any
  ) {
    let targetBusinessId = queryBusinessId || headerBusinessId;
    if (!targetBusinessId) {
      if (req.user.role === UserRole.SUPER_ADMIN) {
        throw new Error('Business context required for Super Admin');
      }
      return this.schedulingService.getBusinessId(req.user.userId).then(businessId => {
        return this.schedulingService.autoSchedule(businessId, new Date(start), new Date(end), req.user, { clientId });
      });
    }
    return this.schedulingService.autoSchedule(targetBusinessId, new Date(start), new Date(end), req.user, { clientId });
  }

  @Get('availability')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER)
  getMyAvailability(@Request() req: any) {
    return this.schedulingService.getMyAvailability(req.user.userId);
  }

  @Post('availability')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER)
  updateMyAvailability(@Body() body: any, @Request() req: any) {
    return this.schedulingService.updateMyAvailability(req.user.userId, body);
  }
}
