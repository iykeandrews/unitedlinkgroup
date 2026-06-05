import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Headers } from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @Roles(UserRole.EMPLOYEE, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  create(@Request() req: any, @Body() createLoanDto: { amount: number; termMonths?: number; reason?: string; targetUserId?: string; targetEmployeeId?: string }, @Headers('x-business-id') businessId?: string) {
    if ((req.user.role === UserRole.BUSINESS_ADMIN || req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.MANAGER)) {
      if (createLoanDto.targetEmployeeId) {
        return this.loansService.requestLoanByEmployeeId(createLoanDto.targetEmployeeId, createLoanDto.amount, createLoanDto.termMonths, createLoanDto.reason, req.user, businessId);
      }
      if (createLoanDto.targetUserId) {
        return this.loansService.requestLoan(createLoanDto.targetUserId, createLoanDto.amount, createLoanDto.termMonths, createLoanDto.reason, businessId);
      }
    }
    return this.loansService.requestLoan(req.user.userId, createLoanDto.amount, createLoanDto.termMonths, createLoanDto.reason, businessId);
  }

  @Get()
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  findAll(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.loansService.findAll(req.user, businessId);
  }

  @Get('my-loans')
  @Roles(UserRole.EMPLOYEE, UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  findMyLoans(@Request() req: any) {
    return this.loansService.findByEmployee(req.user.userId);
  }

  @Get(':id')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.EMPLOYEE)
  findOne(@Param('id') id: string, @Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.loansService.findOne(id, req.user, businessId);
  }

  @Patch(':id/approve')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  approve(@Param('id') id: string, @Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.loansService.approveLoan(id, req.user, businessId);
  }

  @Patch(':id/reject')
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  reject(@Param('id') id: string, @Body() body: { reason: string }, @Request() req: any, @Headers('x-business-id') businessId?: string) {
    return this.loansService.rejectLoan(id, req.user, body.reason, businessId);
  }
}
