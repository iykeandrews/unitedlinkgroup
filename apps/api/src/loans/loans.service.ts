import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRole } from "@unitedlinkgroup/types";
import { calculateHours } from "../payroll/hours";
import { calendarBoundary } from "../payroll/dates";
import { effectivePay } from "../employees/employment.util";

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  private async getBusinessId(
    user: any,
    businessIdHeader?: string,
  ): Promise<string> {
    if (user.role === UserRole.SUPER_ADMIN) {
      if (!businessIdHeader)
        throw new BadRequestException(
          "Business context required for Super Admin",
        );
      return businessIdHeader;
    }

    if (businessIdHeader) {
      const owned = await this.prisma.business.findFirst({
        where: { id: businessIdHeader, ownerId: user.userId },
        select: { id: true },
      });
      const member = await this.prisma.employee.findFirst({
        where: {
          businessId: businessIdHeader,
          userId: user.userId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!owned && !member)
        throw new BadRequestException(
          "Access denied: Cannot access another business data",
        );
      return businessIdHeader;
    }
    let userBusinessId = user.businessId;
    if (!userBusinessId) {
      const employee = await this.prisma.employee.findFirst({
        where: { userId: user.userId },
      });
      if (employee) userBusinessId = employee.businessId;

      if (!userBusinessId) {
        const business = await this.prisma.business.findFirst({
          where: { ownerId: user.userId },
        });
        if (business) userBusinessId = business.id;
      }
    }

    if (!userBusinessId) {
      throw new BadRequestException("User is not associated with a business");
    }

    if (businessIdHeader && businessIdHeader !== userBusinessId) {
      throw new BadRequestException(
        "Access denied: Cannot access another business data",
      );
    }

    return userBusinessId;
  }

  /** Limit advances to approved, completed unpaid earnings in one work period. */
  private async earnedLimit(
    employeeId: string,
    db: any = this.prisma,
    excludeLoanId?: string,
  ) {
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { w2Profile: true, contractorProfile: true, business: true },
    });
    if (!employee || employee.status !== "ACTIVE")
      throw new BadRequestException("An active employee record is required");
    const now = new Date(),
      zone = "America/New_York";
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
    const y = +parts.year,
      m = +parts.month - 1,
      day = +parts.day;
    const civil = (year: number, month: number, date: number) =>
      new Date(Date.UTC(year, month, date)).toISOString().slice(0, 10);
    const currentStart = civil(y, m, day <= 15 ? 1 : 16);
    const lower = calendarBoundary(civil(y, m - 2, 1), zone);
    const [sheets, paid, loans, flexPayments] = await Promise.all([
      db.timesheet.findMany({
        where: {
          employeeId,
          status: "APPROVED",
          startTime: { gte: new Date(+lower - 7 * 86400000), lte: now },
          endTime: { not: null, lte: now },
        },
        include: { breaks: true },
        orderBy: { startTime: "asc" },
      }),
      db.payStub.findMany({
        where: {
          employeeId,
          payroll: {
            status: { in: ["PAID", "PROCESSED"] },
            periodEnd: { gte: lower },
          },
        },
        include: { payroll: true },
      }),
      db.loan.findMany({
        where: {
          employeeId,
          status: { in: ["PENDING", "APPROVED"] },
          ...(excludeLoanId ? { id: { not: excludeLoanId } } : {}),
        },
      }),
      db.flexPay.findMany({
        where: { employeeId, status: "PAID", balanceCents: { gt: 0 } },
      }),
    ]);
    const flexReserved = flexPayments.reduce(
      (n: number, f: any) => n + f.balanceCents / 100,
      0,
    );
    const reserved =
      flexReserved +
      loans.reduce((n: number, l: any) => n + Number(l.balance), 0);
    let settings: any = {};
    try {
      settings = JSON.parse(employee.business.settings || "{}");
    } catch {}
    const anchor = new Date(
      settings.payrollTaxes?.workweekAnchor || "2026-01-04T00:00:00Z",
    );
    const periods = new Map<string, string>();
    periods.set(
      currentStart,
      civil(
        y,
        m,
        day <= 15 ? 15 : new Date(Date.UTC(y, m + 1, 0)).getUTCDate(),
      ),
    );
    for (const sheet of sheets) {
      const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .formatToParts(sheet.startTime)
          .map((p) => [p.type, p.value]),
      );
      const start = civil(+p.year, +p.month - 1, +p.day <= 15 ? 1 : 16);
      if (start >= civil(y, m - 2, 1))
        periods.set(
          start,
          civil(
            +p.year,
            +p.month - 1,
            +p.day <= 15
              ? 15
              : new Date(Date.UTC(+p.year, +p.month, 0)).getUTCDate(),
          ),
        );
    }
    for (const [periodStart, periodEnd] of [...periods].sort((a, b) =>
      b[0].localeCompare(a[0]),
    )) {
      const start = calendarBoundary(periodStart, zone),
        end = calendarBoundary(periodEnd, zone, true);
      let gross = 0,
        hours = 0;
      for (const workerType of ["W2", "CONTRACTOR_1099"]) {
        const pay = effectivePay({ ...employee, workerType });
        if (pay.payType !== "HOURLY" || !pay.hourlyRate || pay.hourlyRate <= 0)
          continue;
        const rows = sheets
          .filter((t: any) => t.workerType === workerType)
          .map((t: any) => ({
            ...t,
            paidExternally:
              t.paidExternally ||
              paid.some(
                (p: any) =>
                  p.workerType === workerType &&
                  t.startTime <= p.payroll.periodEnd &&
                  t.endTime > p.payroll.periodStart,
              ),
          }));
        const result = calculateHours(
          rows,
          start,
          end,
          pay.hourlyRate,
          workerType === "W2" && pay.overtimeEligible,
          anchor,
        );
        gross += result.grossPay;
        hours += result.regularHours + result.overtimeHours;
      }
      if (gross > 0 || periodStart === [...periods.keys()].sort()[0]) {
        return {
          periodStart,
          periodEnd,
          approvedUnpaidHours: Math.round(hours * 100) / 100,
          unpaidGross: Math.round(gross * 100) / 100,
          reserved: Math.round(reserved * 100) / 100,
          maximumAmount: Math.max(
            0,
            Math.floor((gross - reserved) * 100) / 100,
          ),
        };
      }
    }
    return {
      periodStart: currentStart,
      periodEnd: periods.get(currentStart),
      approvedUnpaidHours: 0,
      unpaidGross: 0,
      reserved,
      maximumAmount: 0,
    };
  }

  async eligibility(user: any, businessIdHeader?: string, employeeId?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const admin = [
      UserRole.BUSINESS_ADMIN,
      UserRole.SUPER_ADMIN,
      UserRole.MANAGER,
    ].includes(user.role);
    const employee = await this.prisma.employee.findFirst({
      where: {
        businessId,
        status: "ACTIVE",
        ...(employeeId && admin ? { id: employeeId } : { userId: user.userId }),
      },
      select: { id: true },
    });
    if (!employee)
      throw new BadRequestException("Employee not found in this business");
    return this.earnedLimit(employee.id);
  }

  private async createRequest(
    employeeId: string,
    amount: number,
    termMonths: number,
    reason?: string,
    repaymentOption?: string,
  ) {
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001
    )
      throw new BadRequestException(
        "Enter a positive amount with at most two decimal places",
      );
    if (
      repaymentOption &&
      !["NEXT_PAY", "INSTALLMENTS"].includes(repaymentOption)
    )
      throw new BadRequestException("Invalid repayment option");
    const nextPay = repaymentOption === "NEXT_PAY" || termMonths === 0;
    if (
      !nextPay &&
      (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 24)
    )
      throw new BadRequestException(
        "Choose a repayment term between 1 and 24 months",
      );
    return this.prisma.$transaction(
      async (tx) => {
        const limit = await this.earnedLimit(employeeId, tx);
        if (amount > limit.maximumAmount)
          throw new BadRequestException(
            "Amount exceeds available approved unpaid earnings: $" +
              limit.maximumAmount.toFixed(2),
          );
        return tx.loan.create({
          data: {
            employeeId,
            amount,
            balance: amount,
            termMonths: nextPay ? 0 : termMonths,
            perPayPeriodDeduction: nextPay
              ? amount
              : Math.max(
                  0.01,
                  Math.round((amount / (termMonths * 2)) * 100) / 100,
                ),
            reason: reason?.slice(0, 2000),
            status: "PENDING",
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  }

  async requestLoan(
    userId: string,
    amount: number,
    termMonths = 12,
    reason?: string,
    businessIdHeader?: string,
    repaymentOption?: string,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        ...(businessIdHeader ? { businessId: businessIdHeader } : {}),
      },
    });
    if (!employee) throw new BadRequestException("Employee not found");
    return this.createRequest(
      employee.id,
      amount,
      termMonths,
      reason,
      repaymentOption,
    );
  }
  async requestLoanForUser(
    userId: string,
    amount: number,
    termMonths = 12,
    reason?: string,
    user?: any,
    businessIdHeader?: string,
    repaymentOption?: string,
  ) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.prisma.employee.findFirst({
      where: { userId, businessId, status: "ACTIVE" },
    });
    if (!employee)
      throw new BadRequestException("Employee not found in this business");
    return this.createRequest(
      employee.id,
      amount,
      termMonths,
      reason,
      repaymentOption,
    );
  }
  async requestLoanByEmployeeId(
    employeeId: string,
    amount: number,
    termMonths = 12,
    reason?: string,
    requestingUser?: any,
    businessIdHeader?: string,
    repaymentOption?: string,
  ) {
    const businessId = await this.getBusinessId(
      requestingUser,
      businessIdHeader,
    );
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId, status: "ACTIVE" },
    });
    if (!employee)
      throw new BadRequestException("Employee not found in this business");
    return this.createRequest(
      employeeId,
      amount,
      termMonths,
      reason,
      repaymentOption,
    );
  }

  async findAll(user: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);

    return this.prisma.loan.findMany({
      where: {
        employee: {
          businessId,
        },
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

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!employee) throw new BadRequestException("Employee not found");

    return this.prisma.loan.findMany({
      where: { employeeId: employee.id },
    });
  }

  async findOne(id: string, user: any, businessIdHeader?: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: { employee: true, repayments: true },
    });
    if (!loan) throw new NotFoundException("Loan not found");

    // Access Control
    if (user.role === UserRole.SUPER_ADMIN) {
      if (businessIdHeader && loan.employee.businessId !== businessIdHeader) {
        throw new BadRequestException(
          "Loan does not belong to the current business context",
        );
      }
      // If no header, Super Admin can see it (optional, or force header)
      // Sticking to "Business context required" pattern for consistency
      if (!businessIdHeader)
        throw new BadRequestException(
          "Business context required for Super Admin",
        );
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
        throw new BadRequestException("Access denied");
      }

      // Only Admin/Manager can see others' loans
      if (user.role === UserRole.EMPLOYEE) {
        throw new BadRequestException("Access denied");
      }
    }

    return loan;
  }

  async approveLoan(id: string, approverUser: any, businessIdHeader?: string) {
    const businessId = await this.getBusinessId(approverUser, businessIdHeader);

    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!loan) throw new NotFoundException("Loan not found");

    if (loan.employee.businessId !== businessId) {
      throw new BadRequestException(
        "Access denied: Loan belongs to another business",
      );
    }

    if (loan.status !== "PENDING")
      throw new BadRequestException("Only pending loans may be approved");
    return this.prisma.$transaction(
      async (tx) => {
        const limit = await this.earnedLimit(loan.employeeId, tx, loan.id);
        if (loan.amount > limit.maximumAmount)
          throw new BadRequestException(
            "Unpaid earnings no longer cover this request",
          );
        const changed = await tx.loan.updateMany({
          where: { id, status: "PENDING" },
          data: { status: "APPROVED", approvedBy: approverUser.userId },
        });
        if (changed.count !== 1)
          throw new BadRequestException("Loan was already decided");
        return tx.loan.findUnique({ where: { id } });
      },
      { isolationLevel: "Serializable" },
    );
  }

  async rejectLoan(
    id: string,
    rejectorUser: any,
    reason: string,
    businessIdHeader?: string,
  ) {
    const businessId = await this.getBusinessId(rejectorUser, businessIdHeader);

    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!loan) throw new NotFoundException("Loan not found");

    if (loan.employee.businessId !== businessId) {
      throw new BadRequestException(
        "Access denied: Loan belongs to another business",
      );
    }

    return this.prisma.loan.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedBy: rejectorUser.userId, // or rejectedBy if we had that field, re-using approvedBy as "decidedBy"
        rejectionReason: reason,
      },
    });
  }
}
