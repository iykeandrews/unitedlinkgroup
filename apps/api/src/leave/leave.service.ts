import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  async createLeaveType(businessId: string, dto: CreateLeaveTypeDto, user?: any) {
    if (user) {
        await this.checkTenancy(businessId, user);
    }
    return this.prisma.leaveType.create({
      data: {
        businessId,
        ...dto,
      },
    });
  }

  async getLeaveTypes(businessId: string) {
    const existing = await this.prisma.leaveType.findMany({ where: { businessId } });
    if (existing.length > 0) return existing;
    await this.bootstrapDefaultLeaveTypes(businessId);
    return this.prisma.leaveType.findMany({ where: { businessId } });
  }

  async updateLeaveType(id: string, dto: UpdateLeaveTypeDto, user?: any) {
    const existing = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Leave type not found');
    
    if (user) {
        await this.checkTenancy(existing.businessId, user);
    }

    // Remove unwanted fields that might come from the DTO
    const { id: _, ...updateData } = dto as any;

    return this.prisma.leaveType.update({
      where: { id },
      data: updateData,
    });
  }

  private async checkTenancy(targetBusinessId: string, user: any) {
    if (user.role === 'SUPER_ADMIN') return;
    let userBusinessId = user.businessId;
    if (!userBusinessId) {
        try {
            userBusinessId = await this.getBusinessId(user.userId);
        } catch (e) {
            // If user has no business, deny
            throw new BadRequestException('Access denied: User not associated with a business');
        }
    }
    if (userBusinessId !== targetBusinessId) {
         throw new BadRequestException('Access denied: Cross-business operation not allowed');
    }
  }
  
  private async bootstrapDefaultLeaveTypes(businessId: string) {
    const defaults = [
      { name: 'Annual / Paid Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-green-100 text-green-800', accrualFrequency: 'MONTHLY', accrualRate: 10, maxBalance: 160, carryOverLimit: 40 },
      { name: 'Sick Leave', isPaid: true, requiresApproval: false, allowNegative: true, color: 'bg-red-100 text-red-800', accrualFrequency: 'MONTHLY', accrualRate: 4, maxBalance: 80 },
      { name: 'Unpaid Leave', isPaid: false, requiresApproval: true, allowNegative: false, color: 'bg-gray-100 text-gray-800' },
      { name: 'Compassionate / Bereavement Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-purple-100 text-purple-800' },
      { name: 'Maternity Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-pink-100 text-pink-800' },
      { name: 'Paternity Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-pink-100 text-pink-800' },
      { name: 'Parental Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-orange-100 text-orange-800' },
      { name: 'Adoption Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-orange-100 text-orange-800' },
      { name: 'Study / Training Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-blue-100 text-blue-800' },
      { name: 'Casual Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-teal-100 text-teal-800', accrualFrequency: 'MONTHLY', accrualRate: 3, maxBalance: 40 },
      { name: 'Jury Duty', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-indigo-100 text-indigo-800' },
      { name: 'Military Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-yellow-100 text-yellow-800' },
      { name: 'Religious Observance Leave', isPaid: false, requiresApproval: true, allowNegative: false, color: 'bg-violet-100 text-violet-800' },
      { name: 'Sabbatical Leave', isPaid: false, requiresApproval: true, allowNegative: false, color: 'bg-slate-100 text-slate-800' },
      { name: 'Time Off In Lieu (TOIL)', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-lime-100 text-lime-800', carryOverLimit: 80 },
      { name: 'Emergency Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-purple-100 text-purple-800' },
      { name: 'Hospitalization Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-red-100 text-red-800' },
      { name: 'Voting Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-blue-100 text-blue-800' },
      { name: 'Marriage Leave', isPaid: true, requiresApproval: true, allowNegative: false, color: 'bg-pink-100 text-pink-800' },
    ];
    for (const d of defaults) {
      await this.prisma.leaveType.create({ data: { businessId, ...d } });
    }
  }

  async assignLeaveBalance(employeeId: string, leaveTypeId: string, hours: number, user?: any) {
    if (user) {
        const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundException('Employee not found');
        await this.checkTenancy(employee.businessId, user);
    }
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
        const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundException('Employee not found');
        await this.checkTenancy(employee.businessId, user);
    }
    return this.prisma.leaveBalance.findMany({
      where: { employeeId },
      include: { leaveType: true },
    });
  }

  async requestLeave(dto: CreateLeaveRequestDto, user?: any) {
    const { employeeId, leaveTypeId, startDate, endDate, isAllDay, startTime, endTime, reason } = dto;
    
    if (user) {
        const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundException('Employee not found');
        await this.checkTenancy(employee.businessId, user);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Validate dates
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // 2. Check for overlapping requests
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { not: 'REJECTED' },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('You already have a leave request for these dates');
    }

    // 3. Get Leave Type
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    // 4. Calculate hours using schedule-aware logic
    const requestedHours = await this.calculateLeaveHoursInternal(
      employeeId,
      start,
      end,
      isAllDay ?? true,
      startTime,
      endTime
    );

    if (!Number.isFinite(requestedHours) || requestedHours <= 0) {
      throw new BadRequestException('Requested leave time must be greater than 0 hours');
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
      throw new BadRequestException('Leave type is not available for this employee');
    }

    if (Number(balance.balanceHours || 0) < requestedHours) {
      throw new BadRequestException(`Insufficient leave balance. You have ${balance.balanceHours || 0} hours.`);
    }

    // 6. Determine status
    // Force PENDING to ensure admin/superadmin approval is required for all requests
    const status = 'PENDING'; 
    // const status = (leaveType as any).requiresApproval ? 'PENDING' : 'APPROVED';

    // 7. Create Request
    const request = await this.prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        isAllDay,
        startTime,
        endTime,
        totalHours: requestedHours,
        reason,
        status,
      } as any,
    });

    // 8. If approved immediately (auto-approval), deduct balance?
    /*
    if (status === 'APPROVED' && (leaveType as any).isPaid) {
        await this.prisma.leaveBalance.upsert({
             where: {
                employeeId_leaveTypeId: {
                    employeeId,
                    leaveTypeId
                }
            },
            update: {
                balanceHours: { decrement: requestedHours },
                takenHours: { increment: requestedHours }
            } as any,
            create: {
                employeeId,
                leaveTypeId,
                balanceHours: -requestedHours,
                takenHours: requestedHours
            } as any
        });
    }
    */

    return request;
  }

  private async getDailyScheduledHours(employeeId: string, day: Date): Promise<number> {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId,
        startTime: { gte: dayStart, lte: dayEnd }
      }
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
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
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
    endTime?: string
  ): Promise<number> {
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
        const [sH, sM] = String(startTime).split(':').map(Number);
        const [eH, eM] = String(endTime).split(':').map(Number);
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
            ...(status ? { status } : {})
        },
        include: {
            employee: true,
            leaveType: true
        },
        orderBy: { createdAt: 'desc' }
    });
  }

  async getBusinessId(userId: string): Promise<string> {
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) return ownedBusiness.id;

    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) return employee.businessId;

    throw new BadRequestException('User is not associated with a business');
  }

  async getRequestsForUser(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
        return [];
    }
    return this.prisma.leaveRequest.findMany({
        where: { employeeId: employee.id },
        include: { leaveType: true },
        orderBy: { createdAt: 'desc' }
    });
  }

  async getBalancesForUser(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
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
          const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
          if (!employee) throw new NotFoundException('Employee not found');
          if (user.role === 'EMPLOYEE' && employee.userId !== user.userId) {
            throw new BadRequestException('Access denied');
          }
          await this.checkTenancy(employee.businessId, user);
      }
      return this.prisma.leaveRequest.findMany({
          where: { employeeId },
          include: { leaveType: true },
          orderBy: { createdAt: 'desc' }
      });
  }

  async accrueLeave(
    employeeId: string,
    leaveTypeId: string,
    method: 'PER_HOUR' | 'PER_PAY_PERIOD',
    periodStart?: Date,
    periodEnd?: Date,
    user?: any
  ) {
    if (user) {
        const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundException('Employee not found');
        await this.checkTenancy(employee.businessId, user);
    }
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');
    const rate = (leaveType as any).accrualRate || 0;
    let accrued = 0;
    if (method === 'PER_PAY_PERIOD') {
      accrued = rate;
    } else {
      const start = periodStart || new Date();
      const end = periodEnd || new Date();
      const timesheets = await this.prisma.timesheet.findMany({
        where: {
          employeeId,
          startTime: { gte: start },
          endTime: { lte: end }
        },
        include: { breaks: true }
      });
      let hoursWorked = 0;
      for (const t of timesheets) {
        if (!t.endTime) continue;
        const diff = (new Date(t.endTime).getTime() - new Date(t.startTime).getTime()) / (1000 * 60 * 60);
        const breakHours = (t.breaks || []).reduce((sum: number, b: any) => {
          if (!b.endTime) return sum;
          const d = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / (1000 * 60 * 60);
          return sum + Math.max(0, d);
        }, 0);
        hoursWorked += Math.max(0, diff - breakHours);
      }
      if (hoursWorked === 0) {
        const shifts = await this.prisma.shift.findMany({
          where: {
            employeeId,
            startTime: { gte: start, lte: end }
          }
        });
        for (const s of shifts) {
          if (!s.endTime) continue;
          const diff = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
          const breakHrs = ((s as any).breakMinutes || 0) / 60;
          hoursWorked += Math.max(0, diff - breakHrs);
        }
      }
      accrued = rate * hoursWorked;
    }
    const bal = await this.prisma.leaveBalance.upsert({
      where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } },
      update: { balanceHours: { increment: accrued } } as any,
      create: { employeeId, leaveTypeId, balanceHours: accrued, takenHours: 0 }
    });
    const max = (leaveType as any).maxBalance;
    if (typeof max === 'number' && bal.balanceHours > max) {
      await this.prisma.leaveBalance.update({
        where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } },
        data: { balanceHours: max } as any
      });
    }
    return this.prisma.leaveBalance.findUnique({ where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } }, include: { leaveType: true } });
  }

  async accrueForPayrollPeriod(
    businessId: string,
    periodStart: Date,
    periodEnd: Date,
    user?: any
  ) {
    if (user) {
        await this.checkTenancy(businessId, user);
    }
    const employees = await this.prisma.employee.findMany({ where: { businessId } });
    const leaveTypes = await this.prisma.leaveType.findMany({ where: { businessId } });
    const results: Array<{ employeeId: string; leaveTypeId: string; method: string; accrued: number }> = [];
    for (const emp of employees) {
      for (const lt of leaveTypes) {
        const hasFrequency = !!(lt as any).accrualFrequency;
        const method = hasFrequency ? 'PER_PAY_PERIOD' : 'PER_HOUR';
        const before = await this.prisma.leaveBalance.findUnique({
          where: { employeeId_leaveTypeId: { employeeId: emp.id, leaveTypeId: lt.id } }
        });
        const oldBal = before?.balanceHours || 0;
        await this.accrueLeave(emp.id, lt.id, method as any, periodStart, periodEnd);
        const after = await this.prisma.leaveBalance.findUnique({
          where: { employeeId_leaveTypeId: { employeeId: emp.id, leaveTypeId: lt.id } }
        });
        const accrued = (after?.balanceHours || 0) - oldBal;
        results.push({ employeeId: emp.id, leaveTypeId: lt.id, method, accrued });
      }
    }
    return { periodStart, periodEnd, count: results.length, results };
  }
  async updateLeaveRequestStatus(id: string, managerId: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string, user?: any) {
      const request = await this.prisma.leaveRequest.findUnique({ 
          where: { id },
          include: { leaveType: true, employee: true } 
      });
      if (!request) throw new NotFoundException('Leave request not found');

      if (user) {
          await this.checkTenancy(request.employee.businessId, user);
      }

      if (request.status !== 'PENDING') {
          throw new BadRequestException(`Request is already ${request.status}`);
      }

      const updatedRequest = await this.prisma.leaveRequest.update({
          where: { id },
          data: {
              status,
              managerId,
              rejectionReason
          } as any
      });

      // If approved, deduct balance
      if (status === 'APPROVED') {
          const bal = await this.prisma.leaveBalance.findUnique({
              where: {
                  employeeId_leaveTypeId: {
                      employeeId: request.employeeId,
                      leaveTypeId: request.leaveTypeId
                  }
              }
          });
          
          // Only enforce balance check for PAID leave types that don't allow negative balance
          if ((request.leaveType as any).isPaid && !(request.leaveType as any).allowNegativeBalance) {
              const available = bal?.balanceHours ?? 0;
              if (available < (request as any).totalHours) {
                  throw new BadRequestException(`Insufficient leave balance. You have ${available} hours.`);
              }
          }
          
          await this.prisma.leaveBalance.upsert({
              where: {
                  employeeId_leaveTypeId: {
                      employeeId: request.employeeId,
                      leaveTypeId: request.leaveTypeId
                  }
              },
              update: {
                  balanceHours: { decrement: (request as any).totalHours },
                  takenHours: { increment: (request as any).totalHours }
              } as any,
              create: {
                  employeeId: request.employeeId,
                  leaveTypeId: request.leaveTypeId,
                  balanceHours: -(request as any).totalHours,
                  takenHours: (request as any).totalHours
              } as any
          });
      }

      return updatedRequest;
  }

  async updateLeaveRequestDetails(
    id: string,
    dto: Partial<CreateLeaveRequestDto>,
    user?: any
  ) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true }
    });
    if (!existing) throw new NotFoundException('Leave request not found');
    
    if (user) {
        if (existing.employee.userId !== user.userId) {
            await this.checkTenancy(existing.employee.businessId, user);
        }
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be edited');
    }

    const employeeId = existing.employeeId;
    const leaveTypeId = dto.leaveTypeId ?? existing.leaveTypeId;

    // Validate dates if provided
    const start = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    if (start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    // Check overlapping excluding current request
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        id: { not: id },
        status: { not: 'REJECTED' },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });
    if (overlapping) {
      throw new BadRequestException('Overlaps with another leave request');
    }

    // Get leave type
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    // Calculate total hours with schedule-aware logic
    const isAllDay = dto.isAllDay ?? (existing as any).isAllDay;
    const effStartTime = isAllDay ? undefined : ((dto.startTime ?? (existing as any).startTime) || undefined);
    const effEndTime = isAllDay ? undefined : ((dto.endTime ?? (existing as any).endTime) || undefined);
    const totalHours = await this.calculateLeaveHoursInternal(
      employeeId,
      start,
      end,
      isAllDay,
      effStartTime,
      effEndTime
    );

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
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
        status: 'PENDING'
      } as any
    });

    return updated;
  }

  async resumeLeaveEarly(
    id: string,
    dto: { resumedAt: string; resumedReason: string; resumedTime?: string },
    user?: any
  ) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true }
    });
    if (!existing) throw new NotFoundException('Leave request not found');

    if (existing.status !== 'APPROVED') {
      throw new BadRequestException('Only approved leave can be resumed early');
    }

    if (user) {
      if (user.role === 'EMPLOYEE') {
        throw new BadRequestException('Access denied');
      }
      await this.checkTenancy(existing.employee.businessId, user);
    }

    const resumedAt = new Date(dto.resumedAt);
    if (Number.isNaN(resumedAt.getTime())) throw new BadRequestException('Invalid resumedAt');
    if (resumedAt.getTime() < existing.startDate.getTime()) throw new BadRequestException('Resumed time cannot be before leave start');
    if (resumedAt.getTime() > existing.endDate.getTime()) throw new BadRequestException('Resumed time cannot be after leave end');

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
      dto.resumedTime
    );

    const originalHours = (existing as any).totalHours ?? 0;
    const refundedHours = Math.max(0, originalHours - actualHours);

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const next = await tx.leaveRequest.update({
        where: { id },
        data: {
          actualHours,
          refundedHours,
          resumedAt,
          resumedReason: dto.resumedReason,
        } as any,
      });

      if (refundedHours > 0) {
        await tx.leaveBalance.upsert({
          where: { employeeId_leaveTypeId: { employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId } },
          update: {
            balanceHours: { increment: refundedHours },
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

      return next;
    });

    return updated;
  }

  async cancelApprovedLeave(
    id: string,
    dto: { reason: string; cancelledByLabel?: string },
    user?: any
  ) {
    const existing = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { leaveType: true, employee: true }
    });
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'APPROVED') throw new BadRequestException('Only approved leave can be cancelled');
    if ((existing as any).cancelledAt) throw new BadRequestException('Leave is already cancelled');

    if (user) {
      if (user.role === 'EMPLOYEE') throw new BadRequestException('Access denied');
      await this.checkTenancy(existing.employee.businessId, user);
    }

    const originalHours = (existing as any).totalHours ?? 0;
    const alreadyTaken = typeof (existing as any).actualHours === 'number' ? Math.max(0, (existing as any).actualHours) : 0;
    const refundable = Math.max(0, originalHours - alreadyTaken);

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx: any) => {
      const next = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledReason: dto.reason,
          refundedHours: refundable,
          actualHours: alreadyTaken,
        } as any,
      });

      if (refundable > 0) {
        await tx.leaveBalance.upsert({
          where: { employeeId_leaveTypeId: { employeeId: existing.employeeId, leaveTypeId: existing.leaveTypeId } },
          update: {
            balanceHours: { increment: refundable },
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

      return next;
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
    resumedTime?: string
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
          const [sH, sM] = String(startTime).split(':').map(Number);
          const [eH, eM] = String(endTime).split(':').map(Number);
          let req = eH - sH + (eM - sM) / 60;
          if (req < 0) req += 24;
          total += scheduled > 0 ? Math.min(req, scheduled) : req;
        }
        continue;
      }

      const dayStart = new Date(day);
      const resumePoint = (() => {
        if (resumedTime) {
          const [h, m] = String(resumedTime).split(':').map(Number);
          const dt = new Date(dayStart);
          dt.setHours(h || 0, m || 0, 0, 0);
          return dt;
        }
        return resumedAt;
      })();

      if (isAllDay) {
        const shifts = await this.prisma.shift.findMany({
          where: {
            employeeId,
            startTime: { gte: dayStart, lte: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1) }
          } as any
        });

        if (shifts.length > 0) {
          let hours = 0;
          for (const s of shifts as any[]) {
            const sStart = new Date(s.startTime);
            const sEnd = new Date(s.endTime);
            const overlapEnd = Math.min(sEnd.getTime(), resumePoint.getTime());
            const overlapStart = Math.min(overlapEnd, Math.max(sStart.getTime(), dayStart.getTime()));
            const diff = (overlapEnd - overlapStart) / (1000 * 60 * 60);
            hours += Math.max(0, diff);
          }
          total += hours;
        } else {
          const assumedStart = new Date(dayStart);
          assumedStart.setHours(9, 0, 0, 0);
          const assumedEnd = new Date(dayStart);
          assumedEnd.setHours(17, 0, 0, 0);
          const overlapEnd = Math.min(assumedEnd.getTime(), resumePoint.getTime());
          const overlapStart = Math.min(overlapEnd, Math.max(assumedStart.getTime(), dayStart.getTime()));
          total += Math.max(0, (overlapEnd - overlapStart) / (1000 * 60 * 60));
        }
      } else if (startTime) {
        const [sH, sM] = String(startTime).split(':').map(Number);
        const leaveStart = new Date(dayStart);
        leaveStart.setHours(sH || 0, sM || 0, 0, 0);
        const leaveEnd = resumePoint;
        const diff = (leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60);
        total += Math.max(0, diff);
      } else {
        const scheduled = await this.getDailyScheduledHours(employeeId, day);
        total += scheduled;
      }
    }

    return Math.round(total * 100) / 100;
  }
}
