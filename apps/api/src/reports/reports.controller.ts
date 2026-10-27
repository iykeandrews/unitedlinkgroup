import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Headers as RequestHeaders,
  Res,
} from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@unitedlinkgroup/types";
import { financeSummaryPdf } from './finance-summary-pdf';
import { loadInvoiceLogo } from '../invoices/invoice-logo';

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('finance-summary')
  @Roles(UserRole.BUSINESS_ADMIN,UserRole.SUPER_ADMIN)
  async financeSummary(@Request() req:any,@Query() query:any,@RequestHeaders('x-business-id') header?:string,@Res() response?:any) {
    const businessId=await this.reportsService.resolveBusiness(req.user,header);
    const {report,logoUrl}=await this.reportsService.getFinanceSummary(businessId,query);
    response?.setHeader('Cache-Control','no-store');
    if(query.format==='pdf') {
      const pdf=financeSummaryPdf(report,await loadInvoiceLogo(logoUrl));
      response.setHeader('Content-Type','application/pdf');
      response.setHeader('Content-Disposition','attachment; filename="revenue-payroll-summary-'+report.from+'-'+report.to+'.pdf"');
      response.send(pdf);return;
    }
    return response.json(report);
  }

  @Get("employee-dashboard")
  @Roles(UserRole.EMPLOYEE)
  getEmployeeDashboard(@Request() req: any, @Query("days") days?: string) {
    const parsedDays = days
      ? Math.max(7, Math.min(90, parseInt(days, 10) || 30))
      : 30;
    return this.reportsService.getEmployeeDashboard(
      req.user.userId,
      parsedDays,
      req.user.businessId,
    );
  }

  @Get("superadmin-dashboard")
  @Roles(UserRole.SUPER_ADMIN)
  getSuperadminDashboard(@Query("days") days?: string) {
    const parsedDays = days
      ? Math.max(7, Math.min(180, parseInt(days, 10) || 30))
      : 30;
    return this.reportsService.getSuperadminDashboard(parsedDays);
  }

  @Get("dashboard-stats")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  async getDashboardStats(
    @Request() req: any,
    @RequestHeaders("x-business-id") headerBusinessId?: string,
    @Query("businessId") queryBusinessId?: string,
  ) {
    const businessId = await this.reportsService.resolveBusiness(
      req.user,
      headerBusinessId,
      queryBusinessId,
    );

    return this.reportsService.getDashboardStats(businessId);
  }

  @Get("business-overview")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  async getBusinessOverview(
    @Request() req: any,
    @RequestHeaders("x-business-id") headerBusinessId?: string,
    @Query("businessId") queryBusinessId?: string,
    @Query("days") days?: string,
  ) {
    const businessId = await this.reportsService.resolveBusiness(
      req.user,
      headerBusinessId,
      queryBusinessId,
    );
    const parsedDays = days
      ? Math.max(7, Math.min(180, parseInt(days, 10) || 30))
      : 30;
    return this.reportsService.getBusinessOverview(businessId, parsedDays);
  }

  @Get("payroll-summary")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async getPayrollSummary(
    @Request() req: any,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @RequestHeaders("x-business-id") headerBusinessId?: string,
  ) {
    const businessId = await this.reportsService.resolveBusiness(
      req.user,
      headerBusinessId,
    );
    return this.reportsService.getPayrollSummary(
      businessId,
      startDate,
      endDate,
    );
  }

  @Get("labor-cost")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async getLaborCost(
    @Request() req: any,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @RequestHeaders("x-business-id") headerBusinessId?: string,
  ) {
    const businessId = await this.reportsService.resolveBusiness(
      req.user,
      headerBusinessId,
    );
    return this.reportsService.getLaborCostAnalysis(
      businessId,
      startDate,
      endDate,
    );
  }

  @Get("attendance")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async getAttendanceReport(
    @Request() req: any,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @RequestHeaders("x-business-id") headerBusinessId?: string,
  ) {
    const businessId = await this.reportsService.resolveBusiness(
      req.user,
      headerBusinessId,
    );
    return this.reportsService.getAttendanceReport(
      businessId,
      startDate,
      endDate,
    );
  }

  @Get("performance")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async performance(
    @Request() req: any,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @RequestHeaders("x-business-id") headerBusinessId?: string,
  ) {
    const businessId = await this.reportsService.resolveBusiness(
      req.user,
      headerBusinessId,
    );
    return this.reportsService.getPerformanceReport(
      businessId,
      startDate,
      endDate,
    );
  }

  @Get("reliability")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  async getReliabilityReport(
    @Request() req: any,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @RequestHeaders("x-business-id") headerBusinessId?: string,
  ) {
    const businessId = await this.reportsService.resolveBusiness(
      req.user,
      headerBusinessId,
    );
    return this.reportsService.getReliabilityReport(
      businessId,
      startDate,
      endDate,
    );
  }
}
