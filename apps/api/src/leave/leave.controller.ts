import { Controller, Post, Body, Get, Query, Param, UseGuards, Put, Request, Headers } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../auth/user.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { ResumeLeaveRequestDto } from './dto/resume-leave-request.dto';
import { CancelLeaveRequestDto } from './dto/cancel-leave-request.dto';

@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
  ) {}

  @Post('types')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  createType(@Body() body: CreateLeaveTypeDto & { businessId: string }, @Request() req: any) {
    // Ideally businessId comes from the user context for admin, but allowing explicit pass for now
    return this.leaveService.createLeaveType(body.businessId, body, req.user);
  }

  @Get('calculate-hours')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async calculateHours(
    @Query('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('isAllDay') isAllDay?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string
  ) {
    const service: any = this.leaveService as any;
    const total = await service.calculateLeaveHoursInternal(
      employeeId,
      new Date(startDate),
      new Date(endDate),
      isAllDay === undefined ? true : isAllDay === 'true',
      startTime,
      endTime
    );
    return { totalHours: total };
  }
  @Get('types/:businessId')
  async getTypes(@Param('businessId') businessId: string) {
    try {
      return await this.leaveService.getLeaveTypes(businessId);
    } catch (error) {
      console.error('Error fetching leave types for business:', businessId, error);
      throw error;
    }
  }

  @Put('types/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  updateType(@Param('id') id: string, @Body() body: UpdateLeaveTypeDto, @Request() req: any) {
    return this.leaveService.updateLeaveType(id, body, req.user);
  }

  @Post('balance')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  assignBalance(@Body() body: { employeeId: string; leaveTypeId: string; hours: number }, @Request() req: any) {
    return this.leaveService.assignLeaveBalance(body.employeeId, body.leaveTypeId, body.hours, req.user);
  }

  @Get('balance')
  async getBalance(@Query('employeeId') employeeId: string, @User() user: any) {
    // TODO: Security check to ensure user can view this employee's balance
    return this.leaveService.getLeaveBalances(employeeId, user);
  }

  @Post('request')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async requestLeave(
    @Body() body: CreateLeaveRequestDto,
    @User() user: any
  ) {
    // Force employeeId verification logic here if needed, but for MVP we assume client sends correct ID
    return this.leaveService.requestLeave(body, user);
  }

  @Get('my-requests')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async getMyRequests(@Request() req: any) {
    return this.leaveService.getRequestsForUser(req.user.userId);
  }

  @Get('employee-requests')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async getEmployeeRequests(@Query('employeeId') employeeId: string, @Request() req: any) {
    if (!employeeId) return this.leaveService.getRequestsForUser(req.user.userId);
    return this.leaveService.getMyLeaveRequests(employeeId, req.user);
  }

  @Get('my-balances')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async getMyBalances(@Request() req: any) {
    return this.leaveService.getBalancesForUser(req.user.userId);
  }

  @Get('requests')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async getRequests(
    @Query('businessId') queryBusinessId: string, 
    @Headers('x-business-id') headerBusinessId: string,
    @Query('status') status?: string,
    @Request() req?: any
  ) {
    let businessId = queryBusinessId || headerBusinessId;
    if (!businessId && req?.user) {
        if (req.user.role === UserRole.SUPER_ADMIN) {
             // Super admin must provide business ID via header or query
             // But for safety, we'll let it fail in service if not found, or throw here
             // throw new BadRequestException('Business context required');
        } else {
             businessId = await this.leaveService.getBusinessId(req.user.userId);
        }
    }
    
    if (!businessId) {
         // If still no business ID (e.g. Super Admin didn't provide one), we can't fetch.
         // However, maybe we should return empty? Or throw?
         // Let's assume consumer will provide it if super admin.
    }

    return this.leaveService.getLeaveRequests(businessId, status, req.user);
  }

  @Put('requests/:id/status')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
    @User() user: any
  ) {
    return this.leaveService.updateLeaveRequestStatus(id, user.userId, body.status, body.rejectionReason, user);
  }

  @Put('requests/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  updateDetails(
    @Param('id') id: string,
    @Body() body: Partial<CreateLeaveRequestDto>,
    @User() user: any
  ) {
    return this.leaveService.updateLeaveRequestDetails(id, body, user);
  }

  @Put('requests/:id/resume')
  @Roles(UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  resumeLeave(@Param('id') id: string, @Body() body: ResumeLeaveRequestDto, @User() user: any) {
    return this.leaveService.resumeLeaveEarly(id, body, user);
  }

  @Put('requests/:id/cancel')
  @Roles(UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  cancelLeave(@Param('id') id: string, @Body() body: CancelLeaveRequestDto, @User() user: any) {
    return this.leaveService.cancelApprovedLeave(id, body, user);
  }

  @Post('accrue')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async accrue(
    @Body() body: { employeeId: string; leaveTypeId: string; method: 'PER_HOUR' | 'PER_PAY_PERIOD'; periodStart?: string; periodEnd?: string },
    @User() user: any
  ) {
    const start = body.periodStart ? new Date(body.periodStart) : undefined;
    const end = body.periodEnd ? new Date(body.periodEnd) : undefined;
    return this.leaveService.accrueLeave(body.employeeId, body.leaveTypeId, body.method, start, end, user);
  }

  @Post('accrue/payroll')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async accruePayroll(
    @Body() body: { businessId: string; periodStart: string; periodEnd: string },
    @User() user: any
  ) {
    return this.leaveService.accrueForPayrollPeriod(body.businessId, new Date(body.periodStart), new Date(body.periodEnd), user);
  }
}
