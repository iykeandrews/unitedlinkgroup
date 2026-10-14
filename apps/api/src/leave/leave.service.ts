import { validDay } from "../payroll/us-tax";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateLeaveTypeDto } from "./dto/create-leave-type.dto";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { UpdateLeaveTypeDto } from "./dto/update-leave-type.dto";

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  private leaveTypeData(dto:any) {
    const fields=['name','isPaid','requiresApproval','color','accrualFrequency','accrualRate','maxBalance','carryOverLimit'];
    const out:any=Object.fromEntries(fields.filter(k=>dto[k]!==undefined).map(k=>[k,dto[k]]));
    if (out.name !== undefined) {out.name=String(out.name).trim();if(!out.name)throw new BadRequestException('Leave type name is required');}
    for(const key of ['accrualRate','maxBalance','carryOverLimit'])if(out[key]!==undefined && out[key]!==null && (!Number.isFinite(out[key]) || out[key]<0))throw new BadRequestException('Leave policy amounts must be non-negative numbers');
    const negative=dto.allowNegativeBalance ?? dto.allowNegative;
    if(negative!==undefined)out.allowNegative=negative;
    return out;
  }
  async createLeaveType(
    businessId: string,
    dto: CreateLeaveTypeDto,
    user?: any,
  ) {
    if (user) {
      await this.checkTenancy(businessId, user);
    }
    return this.prisma.leaveType.create({
      data: {
        businessId,
        ...this.leaveTypeData(dto),
      },
    });
  }

  async getLeaveTypes(businessId: string, user?: any) {
    if (user) await this.checkTenancy(businessId, user);
    const existing = await this.prisma.leaveType.findMany({
      where: { businessId },
    });
    if (existing.length > 0) return existing;
    await this.bootstrapDefaultLeaveTypes(businessId);
    return this.prisma.leaveType.findMany({ where: { businessId } });
  }

  async updateLeaveType(id: string, dto: UpdateLeaveTypeDto, user?: any) {
    const existing = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Leave type not found");

    if (user) {
      await this.checkTenancy(existing.businessId, user);
    }

    // Remove unwanted fields that might come from the DTO
    const { id: _, ...updateData } = dto as any;

    return this.prisma.leaveType.update({
      where: { id },
      data: this.leaveTypeData(updateData),
    });
  }

  private async checkTenancy(targetBusinessId: string, user: any) {
    if (!targetBusinessId) throw new BadRequestException("Select a business");
    if (user.role === "SUPER_ADMIN") return;
    const userId = user.userId || user.sub || user.id;
    const owner = await this.prisma.business.findFirst({
      where: { id: targetBusinessId, ownerId: userId },
      select: { id: true },
    });
    const member = await this.prisma.employee.findFirst({
      where: { userId, businessId: targetBusinessId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!owner && !member)
      throw new BadRequestException(
        "Access denied: Cross-business operation not allowed",
      );
  }
  private async employeeAccess(employeeId: string, user?: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new NotFoundException("Employee not found");
    if (user) {
      await this.checkTenancy(employee.businessId, user);
      if (user.role === "EMPLOYEE" && employee.userId !== user.userId)
        throw new BadRequestException("You may only access your own leave");
    }
    return employee;
  }
  async calculateHours(
    dto: Omit<CreateLeaveRequestDto, "leaveTypeId">,
    user: any,
  ) {
    await this.employeeAccess(dto.employeeId, user);
    return {
      totalHours: await this.calculateLeaveHoursInternal(
        dto.employeeId,
        new Date(dto.startDate),
        new Date(dto.endDate),
        dto.isAllDay ?? true,
        dto.startTime,
        dto.endTime,
      ),
    };
  }
  private async bootstrapDefaultLeaveTypes(businessId: string) {
    const defaults = [
      {
        name: "Annual / Paid Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-green-100 text-green-800",
        accrualFrequency: "MONTHLY",
        accrualRate: 10,
        maxBalance: 160,
        carryOverLimit: 40,
      },
      {
        name: "Sick Leave",
        isPaid: true,
        requiresApproval: false,
        allowNegative: true,
        color: "bg-red-100 text-red-800",
        accrualFrequency: "MONTHLY",
        accrualRate: 4,
        maxBalance: 80,
      },
      {
        name: "Unpaid Leave",
        isPaid: false,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-gray-100 text-gray-800",
      },
      {
        name: "Compassionate / Bereavement Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-purple-100 text-purple-800",
      },
      {
        name: "Maternity Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-pink-100 text-pink-800",
      },
      {
        name: "Paternity Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-pink-100 text-pink-800",
      },
      {
        name: "Parental Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-orange-100 text-orange-800",
      },
      {
        name: "Adoption Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-orange-100 text-orange-800",
      },
      {
        name: "Study / Training Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-blue-100 text-blue-800",
      },
      {
        name: "Casual Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-teal-100 text-teal-800",
        accrualFrequency: "MONTHLY",
        accrualRate: 3,
        maxBalance: 40,
      },
      {
        name: "Jury Duty",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-indigo-100 text-indigo-800",
      },
      {
        name: "Military Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-yellow-100 text-yellow-800",
      },
      {
        name: "Religious Observance Leave",
        isPaid: false,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-violet-100 text-violet-800",
      },
      {
        name: "Sabbatical Leave",
        isPaid: false,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-slate-100 text-slate-800",
      },
      {
        name: "Time Off In Lieu (TOIL)",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-lime-100 text-lime-800",
        carryOverLimit: 80,
      },
      {
        name: "Emergency Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-purple-100 text-purple-800",
      },
      {
        name: "Hospitalization Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-red-100 text-red-800",
      },
      {
        name: "Voting Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-blue-100 text-blue-800",
      },
      {
        name: "Marriage Leave",
        isPaid: true,
        requiresApproval: true,
        allowNegative: false,
        color: "bg-pink-100 text-pink-800",
      },
    ];
    for (const d of defaults) {
      await this.prisma.leaveType.create({ data: { businessId, ...d } });
    }
  }

  async assignLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    hours: number,
    user?: any,
  ) {
    if (user) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) throw new NotFoundException("Employee not found");
      await this.checkTenancy(employee.businessId, user);
    }
    if (!Number.isFinite(hours) || hours < 0)
      throw new BadRequestException(
        "Leave balance must be a non-negative number",
      );
    const target = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    const type = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!target || !type || target.businessId !== type.businessId)
      throw new BadRequestException(
        "Choose an employee and leave type from the same business",
      );
    return this.prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId: {
          employeeId,
          leaveTypeId,
        },
      },
      update: {
        balanceHours: hours,
      },
      create: {
        employeeId,
        leaveTypeId,
        balanceHours: hours,
        takenHours: 0,
      },
    });
  }

  async getLeaveBalances(employeeId: string, user?: any) {
    if (user) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) throw new NotFoundException("Employee not found");
      await this.employeeAccess(employeeId, user);
    }
    return this.prisma.leaveBalance.findMany({
      where: { employeeId },
      include: { leaveType: true },
    });
  }

  async requestLeave(dto: CreateLeaveRequestDto, user?: any) {
    const {
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      isAllDay,
      startTime,
      endTime,
      reason,
    } = dto;

    const employee = await this.employeeAccess(employeeId, user);
    if (employee.status !== "ACTIVE")
      throw new BadRequestException("Choose an active employee");
    if (!validDay(startDate.slice(0,10)) || !validDay(endDate.slice(0,10))) throw new BadRequestException("Choose a valid leave date range");
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Validate dates
    if (!Number.isFinite(+start) || !Number.isFinite(+end) || end < start || +end - +start > 366 * 86400000) {
      throw new BadRequestException("Choose a valid leave date range");
    }

    // 2. Check for overlapping requests
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        "You already have a leave request for these dates",
      );
    }

    // 3. Get Leave Type
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException("Leave type not found");
    if (leaveType.businessId !== employee.businessId)
      throw new BadRequestException("Choose a leave type from this business");

    // 4. Calculate hours using schedule-aware logic
    const requestedHours = await this.calculateLeaveHoursInternal(
      employeeId,
      start,
      end,
      isAllDay ?? true,
      startTime,
      endTime,
    );

    if (!Number.isFinite(requestedHours) || requestedHours <= 0) {
      throw new BadRequestException(
        "Requested leave time must be greater than 0 hours",
      );
    }

    // 5. Check balance rules
    // Employee can only request leave types assigned to them (by superadmin/admin via LeaveBalance).
    // Requested time cannot exceed current balance.
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId: {
          employeeId,
          leaveTypeId,
        },
      },
    });

    if (!balance) {
      throw new BadRequestException(
        "Leave type is not available for this employee",
      );
    }

    if (
      leaveType.isPaid &&
      !leaveType.allowNegative &&
      Number(balance.balanceHours || 0) < requestedHours
    ) {
      throw new BadRequestException(
        `Insufficient leave balance. You have ${balance.balanceHours || 0} hours.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT "id" FROM "Employee" WHERE "id" = $1 FOR UPDATE',
        employeeId,
      );
      const duplicate = await tx.leaveRequest.findFirst({
        where: {
          employeeId,
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });
      if (duplicate)
        throw new BadRequestException(
          "You already have a leave request for these dates",
        );
      return tx.leaveRequest.create({
        data: {
          employeeId,
          leaveTypeId,
          startDate: start,
          endDate: end,
          isAllDay: isAllDay ?? true,
          startTime: isAllDay === false ? startTime : null,
          endTime: isAllDay === false ? endTime : null,
          totalHours: requestedHours,
          reason,
          status: "PENDING",
        },
      });
    });
  }

  private async getDailyScheduledHours(
    employeeId: string,
    day: Date,
  ): Promise<number> {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId,
        startTime: { gte: dayStart, lte: dayEnd },
      },
    });
    let hours = 0;
    for (const s of shifts) {
      const start = new Date(s.startTime);
      const end = s.endTime ? new Date(s.endTime) : null;
      if (!end) continue;
      const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const breakHrs = ((s as any).breakMinutes || 0) / 60;
      hours += Math.max(0, diff - breakHrs);
    }
    if (hours > 0) return hours;
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (emp?.hoursPerPeriod && emp?.daysPerPeriod && emp.daysPerPeriod > 0) {
      return emp.hoursPerPeriod / emp.daysPerPeriod;
    }
    // Default to 8 hours/day for all days (7-day operation) if no specific schedule found
    return 8;
  }

  private async calculateLeaveHoursInternal(
    employeeId: string,
    start: Date,
    end: Date,
    isAllDay: boolean,
    startTime?: string,
    endTime?: string,
  ): Promise<number> {
    if (
      !Number.isFinite(+start) ||
      !Number.isFinite(+end) ||
      end < start ||
      +end - +start > 366 * 86400000
    )
      throw new BadRequestException(
        "Choose a valid leave date range of at most one year",
      );
    if (
      !isAllDay &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime || "") ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime || "") ||
        startTime === endTime)
    )
      throw new BadRequestException(
        "Choose valid start and end times for partial-day leave",
      );
    const days: Date[] = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (cur.getTime() <= endDay.getTime()) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    let total = 0;
    for (const day of days) {
      const scheduled = await this.getDailyScheduledHours(employeeId, day);
      if (isAllDay) {
        total += scheduled;
      } else if (startTime && endTime) {
        const [sH, sM] = String(startTime).split(":").map(Number);
        const [eH, eM] = String(endTime).split(":").map(Number);
        let req = eH - sH + (eM - sM) / 60;
        if (req < 0) req += 24;
        if (scheduled > 0) {
          total += Math.min(req, scheduled);
        } else {
          total += req;
        }
      }
    }
    return total;
  }

  async getLeaveRequests(businessId: string, status?: string, user?: any) {
    if (user) {
      await this.checkTenancy(businessId, user);
    }
    return this.prisma.leaveRequest.findMany({
      where: {
        employee: { businessId },
        ...(status ? { status } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        leaveType: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getBusinessId(userId: string): Promise<string> {
    const ownedBusiness = await this.prisma.business.findFirst({
      where: { ownerId: userId },
    });
    if (ownedBusiness) return ownedBusiness.id;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (employee) return employee.businessId;

    throw new BadRequestException("User is not associated with a business");
  }

  async getRequestsForUser(userId: string, businessId?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, ...(businessId ? { businessId } : {}) },
    });
    if (!employee) {
      return [];
    }
    return this.prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      include: { leaveType: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getBalancesForUser(userId: string, businessId?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, ...(businessId ? { businessId } : {}) },
    });
    if (!employee) {
      return [];
    }
    return this.prisma.leaveBalance.findMany({
      where: { employeeId: employee.id },
      include: { leaveType: true },
    });
  }

  async getMyLeaveRequests(employeeId: string, user?: any) {
    if (user) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) throw new NotFoundException("Employee not found");
      if (user.role === "EMPLOYEE" && employee.userId !== user.userId) {
        throw new BadRequestException("Access denied");
      }
      await this.employeeAccess(employeeId, user);
    }
    return this.prisma.leaveRequest.findMany({
      where: { employeeId },
      include: { leaveType: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async accrueLeave(
    employeeId: string,
    leaveTypeId: string,
    method: "PER_HOUR" | "PER_PAY_PERIOD",
    periodStart?: Date,
    periodEnd?: Date,
    user?: any,
  ) {
    if (user) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) throw new NotFoundException("Employee not found");
      await this.checkTenancy(employee.businessId, user);
    }
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException("Leave type not found");
    const rate = (leaveType as any).accrualRate || 0;
    let accrued = 0;
    if (method === "PER_PAY_PERIOD") {
      accrued = rate;
    } else {
      const start = periodStart || new Date();
      const end = periodEnd || new Date();
      const timesheets = await this.prisma.timesheet.findMany({
        where: {
          employeeId,
          startTime: { gte: start },
          endTime: { lte: end },
        },
        include: { breaks: true },
      });
      let hoursWorked = 0;
      for (const t of timesheets) {
        if (!t.endTime) continue;
        const diff =
          (new Date(t.endTime).getTime() - new Date(t.startTime).getTime()) /
          (1000 * 60 * 60);
        const breakHours = (t.breaks || []).reduce((sum: number, b: any) => {
          if (!b.endTime) return sum;
          const d =
            (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) /
            (1000 * 60 * 60);
          return sum + Math.max(0, d);
        }, 0);
        hoursWorked += Math.max(0, diff - breakHours);
      }
      if (hoursWorked === 0) {
        const shifts = await this.prisma.shift.findMany({
          where: {
            employeeId,
            startTime: { gte: start, lte: end },
          },
        });
        for (const s of shifts) {
          if (!s.endTime) continue;
          const diff =
            (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) /
            (1000 * 60 * 60);
          const breakHrs = ((s as any).breakMinutes || 0) / 60;
          hoursWorked += Math.max(0, diff - breakHrs);
        }
      }
      accrued = rate * hoursWorked;
    }
    const bal = await this.prisma.leaveBalance.upsert({
      where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } },
      update: { balanceHours: { increment: accrued } } as any,
      create: { employeeId, leaveTypeId, balanceHours: accrued, takenHours: 0 },
    });
    const max = (leaveType as any).maxBalance;
    if (typeof max === "number" && bal.balanceHours > max) {
      await this.prisma.leaveBalance.update({
        where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } },
        data: { balanceHours: max } as any,
      });
    }
    return this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } },
      include: { leaveType: true },
    });
  }

  async accrueForPayrollPeriod(
    businessId: string,
    periodStart: Date,
    periodEnd: Date,
    user?: any,
  ) {
    if (user) {
      await this.checkTenancy(businessId, user);
    }
    const employees = await this.prisma.employee.findMany({
      where: { businessId },
    });
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { businessId },
    });
    const results: Array<{
      employeeId: string;
      leaveTypeId: string;
      method: string;
      accrued: number;
    }> = [];
    for (const emp of employees) {
      for (const lt of leaveTypes) {
        const hasFrequency = !!(lt as any).accrualFrequency;
        const method = hasFrequency ? "PER_PAY_PERIOD" : "PER_HOUR";
        const before = await this.prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId: { employeeId: emp.id, leaveTypeId: lt.id },
          },
        });
        const oldBal = before?.balanceHours || 0;
        await this.accrueLeave(
          emp.id,
          lt.id,
          method as any,
          periodStart,
          periodEnd,
        );
        const after = await this.prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId: { employeeId: emp.id, leaveTypeId: lt.id },
          },
        });
        const accrued = (after?.balanceHours || 0) - oldBal;
        results.push({
          employeeId: emp.id,
          leaveTypeId: lt.id,
          method,
          accrued,
        });
      }
    }
    return { periodStart, periodEnd, count: results.length, results };
  }
  async updateLeaveRequestStatus(
    id: string,
    managerId: string,
    status: "APPROVED" | "REJECTED",
    rejectionReason?: string,
    user?: any,
  ) {
    if (!["APPROVED", "REJECTED"].includes(status))
      throw new BadRequestException("Choose approve or reject");
    const previous = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!previous) throw new NotFoundException("Leave request not found");
    if (user) await this.checkTenancy(previous.employee.businessId, user);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT "id" FROM "LeaveRequest" WHERE "id" = $1 FOR UPDATE',
        id,
      );
      const request = await tx.leaveRequest.findUnique({
        where: { id },
        include: { leaveType: true },
      });
      if (!request || request.status !== "PENDING")
        throw new BadRequestException("Only pending requests can be reviewed");
      if (!Number.isFinite(request.totalHours) || request.totalHours <= 0)
        throw new BadRequestException(
          "Review requested leave hours before approval",
        );
      if (status === "APPROVED") {
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
            },
          },
        });
        if (!balance)
          throw new BadRequestException(
            "Assign this leave type before approval",
          );
        const deducted = request.leaveType.isPaid ? request.totalHours : 0;
        const changed = await tx.leaveBalance.updateMany({
          where: {
            id: balance.id,
            ...(request.leaveType.isPaid && !request.leaveType.allowNegative
              ? { balanceHours: { gte: deducted } }
              : {}),
          },
          data: {
            balanceHours: { decrement: deducted },
            takenHours: { increment: request.totalHours },
          },
        });
        if (changed.count !== 1)
          throw new BadRequestException(
            "Insufficient leave balance. Refresh balances before approval",
          );
      }
      return tx.leaveRequest.update({
        where: { id },
        data: {
          status,
          managerId,
          rejectionReason:
            status === "REJECTED" ? rejectionReason?.trim() || null : null,
        },
      });
    });
  }

  async updateLeaveRequestDetails(
    id: string,
    dto: Partial<CreateLeaveRequestDto>,
    user?: any,
  ) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true },
    });
    if (!existing) throw new NotFoundException("Leave request not found");

    if (user) {
      if (existing.employee.userId !== user.userId) {
        await this.checkTenancy(existing.employee.businessId, user);
      }
    }

    if (existing.status !== "PENDING") {
      throw new BadRequestException("Only pending requests can be edited");
    }

    const employeeId = existing.employeeId;
    const leaveTypeId = dto.leaveTypeId ?? existing.leaveTypeId;

    // Validate dates if provided
    const start = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    if (!Number.isFinite(+start) || !Number.isFinite(+end) || end < start || +end - +start > 366 * 86400000) {
      throw new BadRequestException("Choose a valid leave date range");
    }

    // Check overlapping excluding current request
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        id: { not: id },
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });
    if (overlapping) {
      throw new BadRequestException("Overlaps with another leave request");
    }

    // Get leave type
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException("Leave type not found");
    if (leaveType.businessId !== existing.employee.businessId)
      throw new BadRequestException("Choose a leave type from this business");

    // Calculate total hours with schedule-aware logic
    const isAllDay = dto.isAllDay ?? (existing as any).isAllDay;
    const effStartTime = isAllDay
      ? undefined
      : (dto.startTime ?? (existing as any).startTime) || undefined;
    const effEndTime = isAllDay
      ? undefined
      : (dto.endTime ?? (existing as any).endTime) || undefined;
    const totalHours = await this.calculateLeaveHoursInternal(
      employeeId,
      start,
      end,
      isAllDay,
      effStartTime,
      effEndTime,
    );

    if (totalHours <= 0 || !Number.isFinite(totalHours))
      throw new BadRequestException("Leave must be greater than zero hours");
    const assigned = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } },
    });
    if (
      !assigned ||
      (leaveType.isPaid &&
        !leaveType.allowNegative &&
        assigned.balanceHours < totalHours)
    )
      throw new BadRequestException(
        "Review the assigned leave balance before saving",
      );
    const updated = await this.prisma.leaveRequest.updateMany({
      where: { id, status: "PENDING", updatedAt: existing.updatedAt },
      data: {
        employeeId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        isAllDay,
        startTime: effStartTime,
        endTime: effEndTime,
        totalHours,
        reason: dto.reason ?? existing.reason,
        status: "PENDING",
      } as any,
    });

    if (updated.count !== 1)
      throw new BadRequestException("Request changed. Refresh before editing");
    return this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async resumeLeaveEarly(
    id: string,
    dto: { resumedAt: string; resumedReason: string; resumedTime?: string },
    user?: any,
  ) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true },
    });
    if (!existing) throw new NotFoundException("Leave request not found");

    if (existing.status !== "APPROVED") {
      throw new BadRequestException("Only approved leave can be resumed early");
    }

    if (user) {
      if (user.role === "EMPLOYEE") {
        throw new BadRequestException("Access denied");
      }
      await this.checkTenancy(existing.employee.businessId, user);
    }

    if (existing.resumedAt)
      throw new BadRequestException("Early return has already been recorded");
    if (!String(dto.resumedReason || "").trim())
      throw new BadRequestException("Enter an early-return reason");
    const resumedAt = new Date(dto.resumedAt);
    if (Number.isNaN(resumedAt.getTime()))
      throw new BadRequestException("Invalid resumedAt");
    if (resumedAt > new Date())
      throw new BadRequestException("Early return cannot be in the future");
    if (dto.resumedTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dto.resumedTime))
      throw new BadRequestException("Enter a valid return time");
    if (resumedAt.getTime() < existing.startDate.getTime())
      throw new BadRequestException(
        "Resumed time cannot be before leave start",
      );
    const leaveEnd = new Date(existing.endDate);
    leaveEnd.setUTCHours(23, 59, 59, 999);
    if (resumedAt > leaveEnd)
      throw new BadRequestException("Resumed time cannot be after leave end");

    const isAllDay = (existing as any).isAllDay ?? true;
    const startTime = (existing as any).startTime || undefined;
    const endTime = (existing as any).endTime || undefined;

    const actualHours = await this.calculateLeaveHoursUntilResume(
      existing.employeeId,
      existing.startDate,
      existing.endDate,
      isAllDay,
      startTime,
      endTime,
      resumedAt,
      dto.resumedTime,
    );

    const originalHours = (existing as any).totalHours ?? 0;
    const refundedHours = Math.max(
      0,
      originalHours - Math.min(originalHours, actualHours),
    );

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const changed = await tx.leaveRequest.updateMany({
        where: { id, status: "APPROVED", updatedAt: existing.updatedAt },
        data: {
          actualHours: Math.min(originalHours, actualHours),
          refundedHours,
          resumedAt,
          resumedReason: dto.resumedReason,
        } as any,
      });

      if (changed.count !== 1)
        throw new BadRequestException(
          "Leave changed. Refresh before recording an early return",
        );
      if (refundedHours > 0) {
        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId: {
              employeeId: existing.employeeId,
              leaveTypeId: existing.leaveTypeId,
            },
          },
          update: {
            balanceHours: {
              increment: existing.leaveType.isPaid ? refundedHours : 0,
            },
            takenHours: { decrement: refundedHours },
          } as any,
          create: {
            employeeId: existing.employeeId,
            leaveTypeId: existing.leaveTypeId,
            balanceHours: refundedHours,
            takenHours: Math.max(0, originalHours - refundedHours),
          } as any,
        });
      }

      return tx.leaveRequest.findUnique({ where: { id } });
    });

    return updated;
  }

  async cancelApprovedLeave(
    id: string,
    dto: { reason: string; cancelledByLabel?: string },
    user?: any,
  ) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true },
    });
    if (!existing) throw new NotFoundException("Leave request not found");
    if (existing.status !== "APPROVED")
      throw new BadRequestException("Only approved leave can be cancelled");
    if ((existing as any).cancelledAt)
      throw new BadRequestException("Leave is already cancelled");
    if (!String(dto.reason || "").trim())
      throw new BadRequestException("Enter a cancellation reason");

    if (user) {
      if (user.role === "EMPLOYEE")
        throw new BadRequestException("Access denied");
      await this.checkTenancy(existing.employee.businessId, user);
    }

    const originalHours = (existing as any).totalHours ?? 0;
    const nowForHours = new Date();
    const consumed =
      nowForHours < existing.startDate
        ? 0
        : await this.calculateLeaveHoursUntilResume(
            existing.employeeId,
            existing.startDate,
            existing.endDate,
            existing.isAllDay,
            existing.startTime || undefined,
            existing.endTime || undefined,
            nowForHours,
          );
    const alreadyTaken = Math.min(
      originalHours,
      existing.resumedAt
        ? existing.actualHours || 0
        : Math.max(existing.actualHours || 0, consumed),
    );
    const alreadyRefunded = Math.max(0, existing.refundedHours || 0);
    const refundable = Math.max(
      0,
      originalHours - alreadyTaken - alreadyRefunded,
    );

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const changed = await tx.leaveRequest.updateMany({
        where: { id, status: "APPROVED", updatedAt: existing.updatedAt },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
          cancelledReason: dto.reason,
          refundedHours: alreadyRefunded + refundable,
          actualHours: alreadyTaken,
        } as any,
      });

      if (changed.count !== 1)
        throw new BadRequestException(
          "Leave changed. Refresh before cancelling",
        );
      if (refundable > 0) {
        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId: {
              employeeId: existing.employeeId,
              leaveTypeId: existing.leaveTypeId,
            },
          },
          update: {
            balanceHours: {
              increment: existing.leaveType.isPaid ? refundable : 0,
            },
            takenHours: { decrement: refundable },
          } as any,
          create: {
            employeeId: existing.employeeId,
            leaveTypeId: existing.leaveTypeId,
            balanceHours: refundable,
            takenHours: Math.max(0, originalHours - refundable),
          } as any,
        });
      }

      return tx.leaveRequest.findUnique({ where: { id } });
    });

    return updated;
  }

  private async calculateLeaveHoursUntilResume(
    employeeId: string,
    start: Date,
    end: Date,
    isAllDay: boolean,
    startTime: string | undefined,
    endTime: string | undefined,
    resumedAt: Date,
    resumedTime?: string,
  ): Promise<number> {
    const days: Date[] = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    const resumeDay = new Date(resumedAt);
    resumeDay.setHours(0, 0, 0, 0);

    while (cur.getTime() <= endDay.getTime()) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    let total = 0;
    for (const day of days) {
      if (day.getTime() > resumeDay.getTime()) break;

      if (day.getTime() < resumeDay.getTime()) {
        const scheduled = await this.getDailyScheduledHours(employeeId, day);
        if (isAllDay) {
          total += scheduled;
        } else if (startTime && endTime) {
          const [sH, sM] = String(startTime).split(":").map(Number);
          const [eH, eM] = String(endTime).split(":").map(Number);
          let req = eH - sH + (eM - sM) / 60;
          if (req < 0) req += 24;
          total += scheduled > 0 ? Math.min(req, scheduled) : req;
        }
        continue;
      }

      const dayStart = new Date(day);
      const resumePoint = resumedAt;

      if (isAllDay) {
        const shifts = await this.prisma.shift.findMany({
          where: {
            employeeId,
            startTime: {
              gte: dayStart,
              lte: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1),
            },
          } as any,
        });

        if (shifts.length > 0) {
          let hours = 0;
          for (const s of shifts as any[]) {
            const sStart = new Date(s.startTime);
            const sEnd = new Date(s.endTime);
            const overlapEnd = Math.min(sEnd.getTime(), resumePoint.getTime());
            const overlapStart = Math.min(
              overlapEnd,
              Math.max(sStart.getTime(), dayStart.getTime()),
            );
            const diff = (overlapEnd - overlapStart) / (1000 * 60 * 60);
            hours += Math.max(0, diff);
          }
          total += hours;
        } else {
          const assumedStart = new Date(dayStart);
          assumedStart.setHours(9, 0, 0, 0);
          const assumedEnd = new Date(dayStart);
          assumedEnd.setHours(17, 0, 0, 0);
          const overlapEnd = Math.min(
            assumedEnd.getTime(),
            resumePoint.getTime(),
          );
          const overlapStart = Math.min(
            overlapEnd,
            Math.max(assumedStart.getTime(), dayStart.getTime()),
          );
          total += Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60));
        }
      } else if (startTime) {
        const [sH, sM] = String(startTime).split(":").map(Number);
        const leaveStart = new Date(dayStart);
        leaveStart.setHours(sH || 0, sM || 0, 0, 0);
        const leaveEnd = resumePoint;
        const diff =
          (leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60);
        total += Math.max(0, diff);
      } else {
        const scheduled = await this.getDailyScheduledHours(employeeId, day);
        total += scheduled;
      }
    }

    return Math.round(total * 100) / 100;
  }
}
