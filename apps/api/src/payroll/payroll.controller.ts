import { Controller, Post, Body, Param, Get, UseGuards, Request, Patch, Query, Delete, Headers, Res } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { Response } from 'express';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('create')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createPayrollDto: CreatePayrollDto, @Request() req: any) {
    return this.payrollService.createPayroll(
      createPayrollDto.businessId,
      new Date(createPayrollDto.periodStart),
      new Date(createPayrollDto.periodEnd),
      new Date(createPayrollDto.payDate),
      createPayrollDto.type,
      req.user
    );
  }

  @Post(':id/calculate')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  calculate(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.runPayrollCalculation(id, req.user);
  }

  @Post(':id/finalize')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  finalize(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.finalizePayroll(id, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  delete(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.deletePayroll(id, req.user);
  }

  @Patch('paystub/:id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  updatePayStub(@Param('id') id: string, @Body() updates: { 
      regularHours?: number, 
      overtimeHours?: number, 
      bonus?: number, 
      commission?: number, 
      reimbursement?: number, 
      deductions?: number,
      federalTax?: number,
      socialSecurity?: number,
      medicare?: number,
      stateTax?: number
  }, @Request() req: any) {
    return this.payrollService.updatePayStub(id, updates, req.user);
  }

  @Get('paystubs')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  async getPayStubs(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string) {
    const { userId, role, businessId: tokenBusinessId } = req.user;
    
    // Use header business ID if available, otherwise token business ID
    const targetBusinessId = headerBusinessId || tokenBusinessId;
    
    console.log('GET /paystubs called by:', { userId, role, targetBusinessId });
    
    // If Admin/Manager and businessId exists, return all paid stubs for business
    if (targetBusinessId && (role === UserRole.BUSINESS_ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.MANAGER)) {
      console.log('Fetching business paystubs for:', targetBusinessId);
      return this.payrollService.getBusinessPayStubs(targetBusinessId, req.user);
    }
    
    console.log('Fetching user paystubs for:', userId);
    return this.payrollService.getPayStubsForUser(userId);
  }

  @Get('my-paystubs')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  getMyPayStubs(@Request() req: any) {
    return this.payrollService.getPayStubsForUser(req.user.userId);
  }

  @Get('paystubs/:id/download')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.FINANCE, UserRole.EMPLOYEE)
  async downloadPayStub(@Param('id') id: string, @Request() req: any, @Res() res: Response) {
    const out = await this.payrollService.downloadPayStubPdf(id, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.setHeader('Content-Length', String(out.data.length));
    return res.status(200).send(out.data);
  }

  @Get()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findAllMyPayrolls(@Request() req: any, @Query('businessId') businessId?: string) {
    if (businessId) {
      return this.payrollService.getPayrolls(businessId, req.user);
    }
    return this.payrollService.getPayrollsForUser(req.user.userId, req.user);
  }

  @Get(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.payrollService.getPayrollById(id, req.user);
  }

  @Get('business/:businessId')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findAll(@Param('businessId') businessId: string, @Request() req: any) {
    return this.payrollService.getPayrolls(businessId, req.user);
  }

  @Get('report/year-end')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE)
  getYearEndForms(
    @Query('businessId') businessId: string,
    @Query('year') year: string,
    @Request() req: any
  ) {
    return this.payrollService.getYearEndForms(businessId, parseInt(year), req.user);
  }

  @Get('report/annual')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE)
  getAnnualReport(
    @Query('businessId') businessId: string,
    @Query('year') year: string,
    @Request() req: any
  ) {
    return this.payrollService.getAnnualTaxReport(businessId, parseInt(year), req.user);
  }
}
