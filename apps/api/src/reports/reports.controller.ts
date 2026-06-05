import { Controller, Get, Query, UseGuards, Request, Headers as RequestHeaders } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('employee-dashboard')
  @Roles(UserRole.EMPLOYEE)
  getEmployeeDashboard(@Request() req: any, @Query('days') days?: string) {
    const parsedDays = days ? Math.max(7, Math.min(90, parseInt(days, 10) || 30)) : 30;
    return this.reportsService.getEmployeeDashboard(req.user.userId, parsedDays, req.user.businessId);
  }

  @Get('superadmin-dashboard')
  @Roles(UserRole.SUPER_ADMIN)
  getSuperadminDashboard(@Query('days') days?: string) {
    const parsedDays = days ? Math.max(7, Math.min(180, parseInt(days, 10) || 30)) : 30;
    return this.reportsService.getSuperadminDashboard(parsedDays);
  }

  @Get('dashboard-stats')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  getDashboardStats(
    @Request() req: any,
    @RequestHeaders('x-business-id') headerBusinessId?: string,
    @Query('businessId') queryBusinessId?: string
  ) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && (queryBusinessId || headerBusinessId)) 
        ? (queryBusinessId || headerBusinessId) 
        : req.user.businessId;
        
    return this.reportsService.getDashboardStats(businessId);
  }

  @Get('business-overview')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  getBusinessOverview(
    @Request() req: any,
    @RequestHeaders('x-business-id') headerBusinessId?: string,
    @Query('businessId') queryBusinessId?: string,
    @Query('days') days?: string
  ) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && (queryBusinessId || headerBusinessId))
      ? (queryBusinessId || headerBusinessId)
      : req.user.businessId;
    const parsedDays = days ? Math.max(7, Math.min(180, parseInt(days, 10) || 30)) : 30;
    return this.reportsService.getBusinessOverview(businessId, parsedDays);
  }

  @Get('payroll-summary')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  getPayrollSummary(@Request() req: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.reportsService.getPayrollSummary(businessId, startDate, endDate);
  }

  @Get('labor-cost')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  getLaborCost(@Request() req: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.reportsService.getLaborCostAnalysis(businessId, startDate, endDate);
  }

  @Get('attendance')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  getAttendanceReport(@Request() req: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.reportsService.getAttendanceReport(businessId, startDate, endDate);
  }

  @Get('reliability')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  getReliabilityReport(@Request() req: any, @Query('startDate') startDate: string, @Query('endDate') endDate: string, @RequestHeaders('x-business-id') headerBusinessId?: string) {
    const businessId = (req.user.role === UserRole.SUPER_ADMIN && headerBusinessId) ? headerBusinessId : req.user.businessId;
    return this.reportsService.getReliabilityReport(businessId, startDate, endDate);
  }
}
