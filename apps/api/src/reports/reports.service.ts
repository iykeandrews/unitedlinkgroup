import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async getBusinessId(userId: string): Promise<string> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');
    return employee.businessId;
  }

  async getDashboardStats(businessId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const [
      activeEmployees,
      nextPayroll,
      pendingLeaveRequests,
      pendingLoanRequests,
      pendingShiftApplications,
      scheduledShiftsRaw,
      onShiftNow
    ] = await Promise.all([
      this.prisma.employee.count({
        where: { businessId, status: 'ACTIVE' },
      }),
      this.prisma.payroll.findFirst({
        where: {
          businessId,
          status: 'DRAFT',
        },
        orderBy: { payDate: 'asc' },
      }),
      this.prisma.leaveRequest.count({
        where: {
          employee: { businessId },
          status: 'PENDING',
        },
      }),
      this.prisma.loan.count({
        where: {
          employee: { businessId },
          status: 'PENDING',
        },
      }),
      (this.prisma as any).shiftApplication.count({
        where: {
          shift: { businessId },
          status: 'PENDING',
        },
      }),
      this.prisma.shift.findMany({
        where: {
          businessId,
          startTime: {
            lte: endOfDay
          },
          endTime: {
            gte: startOfDay
          },
          employeeId: { not: null }
        },
        distinct: ['employeeId'],
        select: { employeeId: true }
      }),
      this.prisma.timesheet.count({
        where: {
          employee: { businessId },
          startTime: { lte: now },
          endTime: null
        }
      })
    ]);

    return {
      activeEmployees,
      nextPayroll: nextPayroll ? {
        payDate: nextPayroll.payDate,
        periodEnd: nextPayroll.periodEnd,
      } : null,
      pendingRequests: pendingLeaveRequests + pendingLoanRequests + pendingShiftApplications,
      scheduledToday: scheduledShiftsRaw.length,
      onShiftNow
    };
  }

  async getBusinessOverview(businessId: string, days = 30) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);

    const weekKey = (d: Date) => {
      const t = new Date(d);
      const day = t.getDay();
      const diff = (day + 6) % 7;
      t.setDate(t.getDate() - diff);
      t.setHours(0, 0, 0, 0);
      return t.toISOString().slice(0, 10);
    };

    const [invoiceAgg, paymentAgg, recentInvoices, recentPayments, invoicesInRange, paymentsInRange] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { businessId },
        select: { status: true, total: true, updatedAt: true, dueDate: true },
      }),
      this.prisma.payment.findMany({
        where: { businessId },
        select: { status: true, amount: true, date: true },
      }),
      this.prisma.invoice.findMany({
        where: { businessId },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          dueDate: true,
          updatedAt: true,
          client: { select: { id: true, name: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: { businessId },
        orderBy: { date: 'desc' },
        take: 8,
        select: {
          id: true,
          date: true,
          amount: true,
          type: true,
          category: true,
          method: true,
          status: true,
          payeeName: true,
          reference: true,
          description: true,
        },
      }),
      this.prisma.invoice.findMany({
        where: { businessId, issueDate: { gte: from } },
        select: { issueDate: true, total: true, status: true, updatedAt: true },
        orderBy: { issueDate: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { businessId, date: { gte: from } },
        select: { date: true, amount: true, status: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const statusCounts = new Map<string, { count: number; total: number }>();
    let outstandingTotal = 0;
    let overdueTotal = 0;
    let paidLastTotal = 0;

    for (const inv of invoiceAgg) {
      const s = inv.status || 'UNKNOWN';
      const cur = statusCounts.get(s) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += inv.total || 0;
      statusCounts.set(s, cur);

      if (s === 'SENT' || s === 'OVERDUE') outstandingTotal += inv.total || 0;
      if (s === 'OVERDUE') overdueTotal += inv.total || 0;
      if (s === 'PAID' && inv.updatedAt >= from) paidLastTotal += inv.total || 0;
    }

    let expensesLastTotal = 0;
    for (const p of paymentAgg) {
      if ((p.status || 'COMPLETED') === 'COMPLETED' && p.date >= from) {
        expensesLastTotal += p.amount || 0;
      }
    }

    const cashflowMap = new Map<string, { invoicesTotal: number; paymentsTotal: number }>();
    for (const inv of invoicesInRange) {
      const k = weekKey(inv.issueDate);
      const cur = cashflowMap.get(k) || { invoicesTotal: 0, paymentsTotal: 0 };
      cur.invoicesTotal += inv.total || 0;
      cashflowMap.set(k, cur);
    }
    for (const pay of paymentsInRange) {
      if ((pay.status || 'COMPLETED') !== 'COMPLETED') continue;
      const k = weekKey(pay.date);
      const cur = cashflowMap.get(k) || { invoicesTotal: 0, paymentsTotal: 0 };
      cur.paymentsTotal += pay.amount || 0;
      cashflowMap.set(k, cur);
    }

    const cashflowWeekly = Array.from(cashflowMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, v]) => ({ week, invoicesTotal: Math.round(v.invoicesTotal * 100) / 100, paymentsTotal: Math.round(v.paymentsTotal * 100) / 100 }));

    const invoicesByStatus = Array.from(statusCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([status, v]) => ({ status, count: v.count, total: Math.round(v.total * 100) / 100 }));

    return {
      now,
      rangeDays: days,
      kpis: {
        revenueLastTotal: Math.round(paidLastTotal * 100) / 100,
        expensesLastTotal: Math.round(expensesLastTotal * 100) / 100,
        outstandingTotal: Math.round(outstandingTotal * 100) / 100,
        overdueTotal: Math.round(overdueTotal * 100) / 100,
      },
      charts: {
        cashflowWeekly,
        invoicesByStatus,
      },
      recent: {
        invoices: recentInvoices,
        payments: recentPayments,
      },
    };
  }

  async getPayrollSummary(userId: string, startDate?: string, endDate?: string) {
    const businessId = await this.getBusinessId(userId);
    
    const where: any = {
      businessId,
      status: 'PROCESSED',
    };

    if (startDate && endDate) {
      where.payDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const payrolls = await this.prisma.payroll.findMany({
      where,
      include: {
        payStubs: true,
      },
    });

    let totalGross = 0;
    let totalNet = 0;
    let totalTaxes = 0;
    let totalDeductions = 0;

    payrolls.forEach((payroll: any) => {
      payroll.payStubs.forEach((stub: any) => {
        totalGross += stub.grossPay;
        totalNet += stub.netPay;
        totalTaxes += stub.taxes;
        totalDeductions += stub.deductions;
      });
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalGross,
        totalNet,
        totalTaxes,
        totalDeductions,
        payrollCount: payrolls.length,
      },
      payrolls,
    };
  }

  async getLaborCostAnalysis(businessId: string, startDate?: string, endDate?: string) {
    // This could be complex, involving scheduled hours vs actual hours vs cost
    // For now, let's just return total hours worked vs scheduled cost estimation
    
    // Fetch all timesheets in range
    // We need to join with Employee to filter by businessId
    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        employee: { businessId },
        startTime: { gte: startDate ? new Date(startDate) : undefined },
        endTime: { lte: endDate ? new Date(endDate) : undefined },
      },
      include: { employee: true },
    });

    let totalHours = 0;
    let estimatedCost = 0;

    timesheets.forEach((ts: any) => {
      if (ts.endTime) {
        const durationHours = (ts.endTime.getTime() - ts.startTime.getTime()) / (1000 * 60 * 60);
        totalHours += durationHours;
        
        if (ts.employee.hourlyRate) {
          estimatedCost += durationHours * ts.employee.hourlyRate;
        } else if (ts.employee.salary) {
          // Approximate hourly cost for salaried employees
          const hourlyRate = ts.employee.salary / (52 * 40);
          estimatedCost += durationHours * hourlyRate;
        }
      }
    });

    return {
      totalHours,
      estimatedCost,
      timesheetCount: timesheets.length,
    };
  }

  async getAttendanceReport(businessId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const [timesheets, callouts] = await Promise.all([
      this.prisma.timesheet.findMany({
        where: {
          employee: { businessId },
          startTime: {
            gte: start,
            lte: end,
          },
        },
        include: {
          employee: true,
          breaks: true,
          location: true,
        },
        orderBy: { startTime: 'desc' },
      }),
      (this.prisma as any).shiftCallout.findMany({
        where: {
          businessId,
          noticeAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          absentEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              businessId: true,
            },
          },
          shift: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { noticeAt: 'desc' },
      }),
    ]);

    return {
      timesheets,
      callouts: callouts.map((callout: any) => ({
        id: callout.id,
        type: callout.type,
        reasonCode: callout.reasonCode,
        reasonNote: callout.reasonNote,
        noticeAt: callout.noticeAt,
        status: callout.status,
        employee: callout.absentEmployee,
        shift: callout.shift,
      })),
    };
  }

  async getReliabilityReport(businessId: string, startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    const now = new Date();
    const effectiveEnd = new Date(Math.min(end.getTime(), now.getTime()));

    const [employees, callouts, coverages, shifts, timesheets] = await Promise.all([
      this.prisma.employee.findMany({
        where: { businessId, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      }),
      (this.prisma as any).shiftCallout.findMany({
        where: { businessId, noticeAt: { gte: start, lte: end } },
        include: { shift: { select: { id: true, startTime: true, endTime: true } }, absentEmployee: { select: { id: true } } }
      }),
      (this.prisma as any).shiftCoverage.findMany({
        where: { businessId, reassignedAt: { gte: start, lte: end } },
        include: { shift: { select: { id: true, startTime: true, endTime: true } }, replacementEmployee: { select: { id: true } } }
      }),
      this.prisma.shift.findMany({
        where: { businessId, startTime: { gte: start, lte: end } },
        select: { id: true, startTime: true, endTime: true, employeeId: true }
      }),
      this.prisma.timesheet.findMany({
        where: { employee: { businessId }, startTime: { gte: new Date(start.getTime() - 2 * 24 * 60 * 60 * 1000), lte: end } },
        select: { id: true, employeeId: true, startTime: true, endTime: true }
      }),
    ]);

    const perEmp: Record<string, any> = {};
    for (const e of employees) {
      perEmp[e.id] = {
        employeeId: e.id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        email: e.email,
        role: e.role,
        totals: {
          callouts: 0,
          excused: 0,
          unexcused: 0,
          emergency: 0,
          lateCallouts: 0,
          noShows: 0,
          coveredForOthers: 0,
        },
        scoring: {
          reliabilityScore: 100,
          attendanceConsistency: 'Excellent',
        },
      };
    }

    const calloutByShiftId = new Map<string, any>();
    for (const c of callouts) calloutByShiftId.set(c.shiftId, c);

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const trendCallouts = new Map<string, number>();
    const trendCoverage = new Map<string, number>();

    for (const c of callouts) {
      const empId = c.absentEmployeeId;
      if (!perEmp[empId]) continue;
      perEmp[empId].totals.callouts += 1;
      const type = String(c.type || '').toUpperCase();
      if (type === 'EXCUSED') perEmp[empId].totals.excused += 1;
      else if (type === 'UNEXCUSED') perEmp[empId].totals.unexcused += 1;
      else if (type === 'EMERGENCY') perEmp[empId].totals.emergency += 1;
      const schedStart = c.shift?.startTime ? new Date(c.shift.startTime) : null;
      const noticeAt = c.noticeAt ? new Date(c.noticeAt) : null;
      if (schedStart && noticeAt) {
        const minutesBefore = Math.round((schedStart.getTime() - noticeAt.getTime()) / (1000 * 60));
        if (minutesBefore < 120) perEmp[empId].totals.lateCallouts += 1;
      }
      const k = dayKey(new Date(c.noticeAt));
      trendCallouts.set(k, (trendCallouts.get(k) || 0) + 1);
    }

    for (const cov of coverages) {
      const empId = cov.replacementEmployeeId;
      if (!perEmp[empId]) continue;
      perEmp[empId].totals.coveredForOthers += 1;
      const k = dayKey(new Date(cov.reassignedAt));
      trendCoverage.set(k, (trendCoverage.get(k) || 0) + 1);
    }

    const tsByEmployee: Record<string, Array<{ start: Date; end: Date | null }>> = {};
    for (const ts of timesheets) {
      const list = tsByEmployee[ts.employeeId] || [];
      list.push({ start: new Date(ts.startTime), end: ts.endTime ? new Date(ts.endTime) : null });
      tsByEmployee[ts.employeeId] = list;
    }

    for (const s of shifts) {
      if (!s.employeeId) continue;
      const shiftEnd = new Date(s.endTime);
      if (shiftEnd.getTime() > effectiveEnd.getTime()) continue;
      if (calloutByShiftId.has(s.id)) continue;
      const empId = s.employeeId;
      if (!perEmp[empId]) continue;
      const shiftStart = new Date(s.startTime);
      const windows = tsByEmployee[empId] || [];
      const hit = windows.some((w) => {
        const tsEnd = w.end || now;
        return w.start.getTime() <= shiftEnd.getTime() && tsEnd.getTime() >= shiftStart.getTime();
      });
      if (!hit) perEmp[empId].totals.noShows += 1;
    }

    const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
    for (const id of Object.keys(perEmp)) {
      const t = perEmp[id].totals;
      const penalty = t.unexcused * 15 + t.excused * 5 + t.emergency * 3 + t.lateCallouts * 5 + t.noShows * 25;
      const bonus = t.coveredForOthers * 3;
      const score = clamp(100 - penalty + bonus, 0, 100);
      perEmp[id].scoring.reliabilityScore = score;
      perEmp[id].scoring.attendanceConsistency =
        score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';
    }

    const officerRows = Object.values(perEmp).sort((a: any, b: any) => b.scoring.reliabilityScore - a.scoring.reliabilityScore);
    const highestCalloutRates = officerRows
      .slice()
      .sort((a: any, b: any) => b.totals.callouts - a.totals.callouts)
      .slice(0, 10);
    const mostReliable = officerRows.slice(0, 10);

    const filledCallouts = coverages.filter((c: any) => !!c.calloutId);
    const avgResponseMinutes = filledCallouts.length
      ? Math.round((filledCallouts.reduce((acc: number, c: any) => acc + (Number(c.responseMinutes) || 0), 0) / filledCallouts.length) * 10) / 10
      : 0;
    const fillRate = callouts.length ? Math.round(((filledCallouts.length / callouts.length) * 100) * 10) / 10 : 0;

    const trendSeries = (() => {
      const keys = new Set<string>([...trendCallouts.keys(), ...trendCoverage.keys()]);
      const days = Array.from(keys).sort((a, b) => a.localeCompare(b));
      return days.map((d) => ({ date: d, callouts: trendCallouts.get(d) || 0, coverages: trendCoverage.get(d) || 0 }));
    })();

    return {
      range: { start: start.toISOString(), end: end.toISOString() },
      officers: officerRows,
      insights: {
        highestCalloutRates,
        mostReliable,
        coverageEfficiency: { avgResponseMinutes, fillRate }
      },
      trends: trendSeries
    };
  }

  async getSuperadminDashboard(days = 30) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);

    const toDayKey = (d: Date) => d.toISOString().slice(0, 10);

    const [
      businessTotal,
      businessNew,
      employeeTotal,
      activeEmployeeTotal,
      userTotal,
      openIncidents,
      activeTimesheets,
      pendingLoans,
      pendingLeaves,
      expiringQualifications,
      recentBusinesses,
    ] = await Promise.all([
      this.prisma.business.count({ where: { status: { not: 'DELETED' } } }),
      this.prisma.business.count({ where: { status: { not: 'DELETED' }, createdAt: { gte: from } } }),
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count(),
      this.prisma.incidentReport.count({ where: { status: { not: 'CLOSED' } } }),
      this.prisma.timesheet.count({ where: { endTime: null } }),
      this.prisma.loan.count({ where: { status: 'PENDING' } }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.qualification.count({
        where: {
          OR: [
            { status: 'EXPIRED' },
            { status: 'ACTIVE', expiryDate: { lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
      this.prisma.business.findMany({
        where: { status: { not: 'DELETED' } },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          industry: true,
          businessType: true,
          country: true,
          modules: true,
          createdAt: true,
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: { select: { employees: true, locations: true, incidentReports: true } },
        },
      }),
    ]);

    const businessesInRange = await this.prisma.business.findMany({
      where: { status: { not: 'DELETED' }, createdAt: { gte: from } },
      select: { createdAt: true, modules: true },
      orderBy: { createdAt: 'asc' },
    });

    const employeesInRange = await this.prisma.employee.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const businessTrendMap = new Map<string, number>();
    const employeeTrendMap = new Map<string, number>();
    const moduleCounts = new Map<string, number>();

    for (const b of businessesInRange) {
      const k = toDayKey(b.createdAt);
      businessTrendMap.set(k, (businessTrendMap.get(k) || 0) + 1);

      const raw = (b.modules || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (raw.length === 0) {
        moduleCounts.set('None', (moduleCounts.get('None') || 0) + 1);
      } else {
        for (const m of raw) {
          moduleCounts.set(m, (moduleCounts.get(m) || 0) + 1);
        }
      }
    }

    for (const e of employeesInRange) {
      const k = toDayKey(e.createdAt);
      employeeTrendMap.set(k, (employeeTrendMap.get(k) || 0) + 1);
    }

    const daysSeries: string[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      daysSeries.push(toDayKey(d));
    }

    let businessCum = businessTotal - businessNew;
    let employeeCum = employeeTotal - employeesInRange.length;
    const growth = daysSeries.map((d) => {
      const bInc = businessTrendMap.get(d) || 0;
      const eInc = employeeTrendMap.get(d) || 0;
      businessCum += bInc;
      employeeCum += eInc;
      return { date: d, newBusinesses: bInc, totalBusinesses: businessCum, newEmployees: eInc, totalEmployees: employeeCum };
    });

    const modulesTop = Array.from(moduleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    return {
      now,
      rangeDays: days,
      totals: {
        businessTotal,
        businessNew,
        employeeTotal,
        activeEmployeeTotal,
        userTotal,
        openIncidents,
        activeTimesheets,
        pendingLoans,
        pendingLeaves,
        expiringQualifications,
      },
      charts: {
        growth,
        modulesTop,
      },
      recentBusinesses,
    };
  }

  async getEmployeeDashboard(userId: string, days = 30, businessId?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, ...(businessId ? { businessId } : {}) },
      select: { id: true, firstName: true, lastName: true, role: true, businessId: true, userId: true },
    });
    const fallback = employee
      ? null
      : await this.prisma.employee.findFirst({
          where: { userId },
          select: { id: true, firstName: true, lastName: true, role: true, businessId: true, userId: true },
        });
    const resolved = employee || fallback;
    if (!resolved) throw new BadRequestException('Employee record not found');
    if (!resolved.userId) throw new BadRequestException('Employee record is not linked to a user');

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - days);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const employeeUserId = resolved.userId;
    const [todayShifts, recentShifts, recentTimesheets, activeTimesheet, activeBreak, incidentReports, patrolLogs] = await Promise.all([
      this.prisma.shift.findMany({
        where: { employeeId: resolved.id, status: 'PUBLISHED', startTime: { lt: endOfToday }, endTime: { gt: startOfToday } },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          locationId: true,
          location: {
            select: {
              id: true,
              name: true,
              address: true,
              geoLat: true,
              geoLng: true,
              radius: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.shift.findMany({
        where: { employeeId: resolved.id, status: 'PUBLISHED', startTime: { gte: from, lte: now } },
        select: { id: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.timesheet.findMany({
        where: { employeeId: resolved.id, startTime: { gte: new Date(from.getTime() - 2 * 24 * 60 * 60 * 1000), lte: now } },
        select: { id: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.timesheet.findFirst({
        where: { employeeId: resolved.id, endTime: null },
        select: { id: true, startTime: true, endTime: true, locationId: true },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.break.findFirst({
        where: { timesheet: { employeeId: resolved.id, endTime: null }, endTime: null },
        select: { id: true, startTime: true, endTime: true, type: true, timesheetId: true },
      }),
      this.prisma.incidentReport.findMany({
        where: {
          businessId: resolved.businessId,
          createdAt: { gte: from },
          OR: [{ reportingOfficerEmployeeId: resolved.id }, { submittedById: employeeUserId }],
        },
        select: { id: true, title: true, createdAt: true, severity: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.patrolLog.findMany({
        where: { userId: employeeUserId, createdAt: { gte: from } },
        select: { id: true, type: true, message: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const punctualityDaily: Array<{ date: string; lateMinutes: number | null; status: 'ON_TIME' | 'LATE' | 'MISSED' }> = [];
    let onTime = 0;
    let late = 0;
    let missed = 0;
    let lateMinutesTotal = 0;

    const matchTimesheetForShift = (shiftStart: Date, shiftEnd: Date) => {
      const windowStart = new Date(shiftStart.getTime() - 2 * 60 * 60 * 1000);
      const windowEnd = new Date(shiftEnd.getTime() + 60 * 60 * 1000);
      const matches = recentTimesheets.filter((t) => t.startTime >= windowStart && t.startTime <= windowEnd);
      if (matches.length === 0) return null;
      return matches[0];
    };

    for (const s of recentShifts) {
      const ts = matchTimesheetForShift(s.startTime, s.endTime);
      const date = s.startTime.toISOString().slice(0, 10);
      if (!ts) {
        missed += 1;
        punctualityDaily.push({ date, lateMinutes: null, status: 'MISSED' });
        continue;
      }
      const diffMin = Math.round((ts.startTime.getTime() - s.startTime.getTime()) / (1000 * 60));
      const lateMin = Math.max(0, diffMin);
      if (lateMin <= 5) {
        onTime += 1;
        punctualityDaily.push({ date, lateMinutes: lateMin, status: 'ON_TIME' });
      } else {
        late += 1;
        lateMinutesTotal += lateMin;
        punctualityDaily.push({ date, lateMinutes: lateMin, status: 'LATE' });
      }
    }

    const totalShifts = onTime + late + missed;
    const onTimeRate = totalShifts === 0 ? 0 : Math.round((onTime / totalShifts) * 100);
    const avgLateMinutes = late === 0 ? 0 : Math.round(lateMinutesTotal / late);

    const sortedForStreak = punctualityDaily
      .slice()
      .reverse()
      .filter((p, i, arr) => i === 0 || p.date !== arr[i - 1].date);
    let streakOnTimeDays = 0;
    for (const p of sortedForStreak) {
      if (p.status !== 'ON_TIME') break;
      streakOnTimeDays += 1;
    }

    const reportCountsByWeek = new Map<string, { incident: number; patrol: number }>();
    const weekKey = (d: Date) => {
      const t = new Date(d);
      const day = t.getDay();
      const diff = (day + 6) % 7;
      t.setDate(t.getDate() - diff);
      t.setHours(0, 0, 0, 0);
      return t.toISOString().slice(0, 10);
    };

    const incidentCount = await this.prisma.incidentReport.count({
      where: {
        businessId: resolved.businessId,
        createdAt: { gte: from },
        OR: [{ reportingOfficerEmployeeId: resolved.id }, { submittedById: employeeUserId }],
      },
    });
    const patrolCount = await this.prisma.patrolLog.count({
      where: { userId: employeeUserId, createdAt: { gte: from } },
    });

    const incidentAll = await this.prisma.incidentReport.findMany({
      where: {
        businessId: resolved.businessId,
        createdAt: { gte: from },
        OR: [{ reportingOfficerEmployeeId: resolved.id }, { submittedById: employeeUserId }],
      },
      select: { createdAt: true },
    });
    const patrolAll = await this.prisma.patrolLog.findMany({
      where: { userId: employeeUserId, createdAt: { gte: from } },
      select: { createdAt: true },
    });

    for (const r of incidentAll) {
      const k = weekKey(r.createdAt);
      const cur = reportCountsByWeek.get(k) || { incident: 0, patrol: 0 };
      cur.incident += 1;
      reportCountsByWeek.set(k, cur);
    }
    for (const r of patrolAll) {
      const k = weekKey(r.createdAt);
      const cur = reportCountsByWeek.get(k) || { incident: 0, patrol: 0 };
      cur.patrol += 1;
      reportCountsByWeek.set(k, cur);
    }

    const reportsWeekly = Array.from(reportCountsByWeek.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, counts]) => ({ week, count: counts.incident + counts.patrol, incidentCount: counts.incident, patrolCount: counts.patrol }));

    const currentShift =
      todayShifts.find((s) => s.startTime <= now && s.endTime >= now) ||
      todayShifts.find((s) => s.startTime.getTime() - now.getTime() <= 15 * 60 * 1000 && s.startTime >= now) ||
      null;
    const nextShift = todayShifts.find((s) => s.startTime > now) || null;
    const clockInShift = currentShift || nextShift;
    const canClockIn = !!clockInShift && !activeTimesheet && clockInShift.endTime > now;

    const activity = [
      ...incidentReports.map((r) => ({ id: r.id, kind: 'INCIDENT', title: r.title, createdAt: r.createdAt })),
      ...patrolLogs.map((p) => ({ id: p.id, kind: 'PATROL', title: p.message, createdAt: p.createdAt })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50);

    return {
      now,
      employee: { id: resolved.id, firstName: resolved.firstName, lastName: resolved.lastName, role: resolved.role, businessId: resolved.businessId },
      timeTracking: {
        activeTimesheet: activeTimesheet ? { ...activeTimesheet } : null,
        activeBreak: activeBreak ? { ...activeBreak } : null,
      },
      schedule: {
        today: todayShifts.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          locationId: s.locationId,
          locationName: s.location?.name || null,
          locationAddress: s.location?.address || null,
          locationLat: s.location?.geoLat ?? null,
          locationLng: s.location?.geoLng ?? null,
          locationRadiusMeters: s.location?.radius ?? null,
        })),
        currentShift: currentShift
          ? {
              id: currentShift.id,
              startTime: currentShift.startTime,
              endTime: currentShift.endTime,
              locationId: currentShift.locationId,
              locationName: (currentShift as any).location?.name || null,
              locationAddress: (currentShift as any).location?.address || null,
              locationLat: (currentShift as any).location?.geoLat ?? null,
              locationLng: (currentShift as any).location?.geoLng ?? null,
              locationRadiusMeters: (currentShift as any).location?.radius ?? null,
            }
          : null,
        nextShift: nextShift
          ? {
              id: nextShift.id,
              startTime: nextShift.startTime,
              endTime: nextShift.endTime,
              locationId: nextShift.locationId,
              locationName: (nextShift as any).location?.name || null,
              locationAddress: (nextShift as any).location?.address || null,
              locationLat: (nextShift as any).location?.geoLat ?? null,
              locationLng: (nextShift as any).location?.geoLng ?? null,
              locationRadiusMeters: (nextShift as any).location?.radius ?? null,
            }
          : null,
        canClockIn,
      },
      metrics: {
        punctuality: { onTimeRate, onTime, late, missed, avgLateMinutes },
        reports: { incidentCount, patrolCount, total: incidentCount + patrolCount },
        streakOnTimeDays,
      },
      charts: {
        punctualityDaily,
        reportsWeekly,
      },
      activity,
    };
  }
}
