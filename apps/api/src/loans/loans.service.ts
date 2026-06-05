import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  private async getBusinessId(user: any, businessIdHeader?: string): Promise<string> {
    if (user.role === UserRole.SUPER_ADMIN) {
        if (!businessIdHeader) throw new BadRequestException('Business context required for Super Admin');
        return businessIdHeader;
    }

    let userBusinessId = user.businessId;
    if (!userBusinessId) {
        const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId } });
        if (employee) userBusinessId = employee.businessId;
        
        if (!userBusinessId) {
            const business = await this.prisma.business.findFirst({ where: { ownerId: user.userId } });
            if (business) userBusinessId = business.id;
        }
    }

    if (!userBusinessId) {
        throw new BadRequestException('User is not associated with a business');
    }
    
    if (businessIdHeader && businessIdHeader !== userBusinessId) {
         throw new BadRequestException('Access denied: Cannot access another business data');
    }

    return userBusinessId;
  }

  async requestLoan(userId: string, amount: number, termMonths: number = 12, reason?: string, businessIdHeader?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      throw new BadRequestException('User is not an employee');
    }

    // Verify tenancy if not self-request
    // If the caller is not the employee themselves, we need to verify they have access to this employee's business
    // But since we don't have the caller's context here easily (except implicitly via userId if it's self-service),
    // we should rely on the controller to pass the right params or handle it there.
    // However, the controller calls this for "targetUserId".
    // Let's assume the controller has already authorized the *action*, but we should check the business context.
    
    // Actually, requestLoan is called by:
    // 1. Employee for themselves (req.user.userId)
    // 2. Admin for a user (targetUserId)
    
    // We should probably rely on `requestLoanByEmployeeId` for the admin case to be cleaner, 
    // or just fetch the employee and check the business ID against the context.
    
    // For now, let's just proceed with creation but we need to ensure the employee belongs to the context business if header is passed?
    // If Super Admin is creating a loan, they must provide the header matching the employee's business.
    
    if (businessIdHeader && employee.businessId !== businessIdHeader) {
         // This check effectively ensures that if a Super Admin is operating in Context A, they can't create a loan for an employee in Business B.
         throw new BadRequestException('Employee does not belong to the current business context');
    }

    // Basic validation: Check if employee already has an active loan?
    // For now, allow multiple loans but maybe warn or limit total amount.
    
    // Calculate simple per-pay-period deduction assuming bi-weekly payroll (26 periods/year)
    // This is an estimation; actual deduction happens during payroll.
    // Term is in months.
    const totalPayPeriods = termMonths * 2; // Approximate bi-weekly periods
    const perPayPeriodDeduction = amount / totalPayPeriods;

    return this.prisma.loan.create({
      data: {
        employeeId: employee.id,
        amount,
        balance: amount,
        termMonths,
        perPayPeriodDeduction,
        reason,
        status: 'PENDING',
      },
    });
  }

  async requestLoanByEmployeeId(employeeId: string, amount: number, termMonths: number = 12, reason?: string, requestingUser?: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(requestingUser, businessIdHeader);

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.businessId !== businessId) {
        throw new BadRequestException('Employee does not belong to the current business context');
    }

    const totalPayPeriods = termMonths * 2;
    const perPayPeriodDeduction = amount / totalPayPeriods;
    return this.prisma.loan.create({
      data: {
        employeeId,
        amount,
        balance: amount,
        termMonths,
        perPayPeriodDeduction,
        reason,
        status: 'PENDING',
      },
    });
  }

  async findAll(user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    
    return this.prisma.loan.findMany({
      where: {
          employee: {
              businessId
          }
      },
      include: { employee: true },
    });
  }

  async findByEmployee(userId: string) {
    // This is for "my-loans", so it's always for the current user.
    // No strict need for businessIdHeader check unless we want to enforce context even for self-access,
    // but usually "my data" is safe.
    // However, if a user belongs to multiple businesses (not supported yet, but good practice), context helps.
    // For now, finding by userId is safe as it returns loans for that user.
    
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('Employee not found');

    return this.prisma.loan.findMany({
      where: { employeeId: employee.id },
    });
  }

  async findOne(id: string, user: any, businessIdHeader?: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: { employee: true, repayments: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');

    // Access Control
    if (user.role === UserRole.SUPER_ADMIN) {
        if (businessIdHeader && loan.employee.businessId !== businessIdHeader) {
            throw new BadRequestException('Loan does not belong to the current business context');
        }
        // If no header, Super Admin can see it (optional, or force header)
        // Sticking to "Business context required" pattern for consistency
        if (!businessIdHeader) throw new BadRequestException('Business context required for Super Admin');
    } else {
        // Regular users/admins
        // Check if the loan belongs to their business
        // OR if it's their own loan
        
        // 1. Is it their own loan?
        if (loan.employee.userId === user.userId) {
            return loan;
        }

        // 2. Is it in their business (and they are admin/manager)?
        const businessId = await this.getBusinessId(user, businessIdHeader);
        if (loan.employee.businessId !== businessId) {
            throw new BadRequestException('Access denied');
        }
        
        // Only Admin/Manager can see others' loans
        if (user.role === UserRole.EMPLOYEE) {
             throw new BadRequestException('Access denied');
        }
    }

    return loan;
  }

  async approveLoan(id: string, approverUser: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(approverUser, businessIdHeader);
    
    const loan = await this.prisma.loan.findUnique({ 
        where: { id },
        include: { employee: true }
    });
    if (!loan) throw new NotFoundException('Loan not found');

    if (loan.employee.businessId !== businessId) {
        throw new BadRequestException('Access denied: Loan belongs to another business');
    }

    return this.prisma.loan.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverUser.userId,
      },
    });
  }

  async rejectLoan(id: string, rejectorUser: any, reason: string, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(rejectorUser, businessIdHeader);

    const loan = await this.prisma.loan.findUnique({ 
        where: { id },
        include: { employee: true }
    });
    if (!loan) throw new NotFoundException('Loan not found');

    if (loan.employee.businessId !== businessId) {
        throw new BadRequestException('Access denied: Loan belongs to another business');
    }

    return this.prisma.loan.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: rejectorUser.userId, // or rejectedBy if we had that field, re-using approvedBy as "decidedBy"
        rejectionReason: reason,
      },
    });
  }
}
