"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
let ReportsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ReportsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        async getBusinessId(userId) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('User is not associated with a business');
            return employee.businessId;
        }
        async getDashboardStats(businessId) {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const [activeEmployees, nextPayroll, pendingLeaveRequests, pendingLoanRequests, pendingShiftApplications, scheduledShiftsRaw, onShiftNow] = await Promise.all([
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
                this.prisma.shiftApplication.count({
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
        async getBusinessOverview(businessId, days = 30) {
            const now = new Date();
            const from = new Date(now);
            from.setDate(from.getDate() - days);
            const weekKey = (d) => {
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
            const statusCounts = new Map();
            let outstandingTotal = 0;
            let overdueTotal = 0;
            let paidLastTotal = 0;
            for (const inv of invoiceAgg) {
                const s = inv.status || 'UNKNOWN';
                const cur = statusCounts.get(s) || { count: 0, total: 0 };
                cur.count += 1;
                cur.total += inv.total || 0;
                statusCounts.set(s, cur);
                if (s === 'SENT' || s === 'OVERDUE')
                    outstandingTotal += inv.total || 0;
                if (s === 'OVERDUE')
                    overdueTotal += inv.total || 0;
                if (s === 'PAID' && inv.updatedAt >= from)
                    paidLastTotal += inv.total || 0;
            }
            let expensesLastTotal = 0;
            for (const p of paymentAgg) {
                if ((p.status || 'COMPLETED') === 'COMPLETED' && p.date >= from) {
                    expensesLastTotal += p.amount || 0;
                }
            }
            const cashflowMap = new Map();
            for (const inv of invoicesInRange) {
                const k = weekKey(inv.issueDate);
                const cur = cashflowMap.get(k) || { invoicesTotal: 0, paymentsTotal: 0 };
                cur.invoicesTotal += inv.total || 0;
                cashflowMap.set(k, cur);
            }
            for (const pay of paymentsInRange) {
                if ((pay.status || 'COMPLETED') !== 'COMPLETED')
                    continue;
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
        async getPayrollSummary(userId, startDate, endDate) {
            const businessId = await this.getBusinessId(userId);
            const where = {
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
            payrolls.forEach((payroll) => {
                payroll.payStubs.forEach((stub) => {
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
        async getLaborCostAnalysis(businessId, startDate, endDate) {
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
            timesheets.forEach((ts) => {
                if (ts.endTime) {
                    const durationHours = (ts.endTime.getTime() - ts.startTime.getTime()) / (1000 * 60 * 60);
                    totalHours += durationHours;
                    if (ts.employee.hourlyRate) {
                        estimatedCost += durationHours * ts.employee.hourlyRate;
                    }
                    else if (ts.employee.salary) {
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
        async getAttendanceReport(businessId, startDate, endDate) {
            return this.prisma.timesheet.findMany({
                where: {
                    employee: { businessId },
                    startTime: {
                        gte: startDate ? new Date(startDate) : undefined,
                        lte: endDate ? new Date(endDate) : undefined
                    },
                },
                include: {
                    employee: true,
                    breaks: true,
                    location: true
                },
                orderBy: { startTime: 'desc' },
            });
        }
        async getReliabilityReport(businessId, startDate, endDate) {
            var _a;
            const end = endDate ? new Date(endDate) : new Date();
            const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                throw new common_1.BadRequestException('Invalid date range');
            }
            const now = new Date();
            const effectiveEnd = new Date(Math.min(end.getTime(), now.getTime()));
            const [employees, callouts, coverages, shifts, timesheets] = await Promise.all([
                this.prisma.employee.findMany({
                    where: { businessId, status: 'ACTIVE' },
                    select: { id: true, firstName: true, lastName: true, email: true, role: true }
                }),
                this.prisma.shiftCallout.findMany({
                    where: { businessId, noticeAt: { gte: start, lte: end } },
                    include: { shift: { select: { id: true, startTime: true, endTime: true } }, absentEmployee: { select: { id: true } } }
                }),
                this.prisma.shiftCoverage.findMany({
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
            const perEmp = {};
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
            const calloutByShiftId = new Map();
            for (const c of callouts)
                calloutByShiftId.set(c.shiftId, c);
            const dayKey = (d) => d.toISOString().slice(0, 10);
            const trendCallouts = new Map();
            const trendCoverage = new Map();
            for (const c of callouts) {
                const empId = c.absentEmployeeId;
                if (!perEmp[empId])
                    continue;
                perEmp[empId].totals.callouts += 1;
                const type = String(c.type || '').toUpperCase();
                if (type === 'EXCUSED')
                    perEmp[empId].totals.excused += 1;
                else if (type === 'UNEXCUSED')
                    perEmp[empId].totals.unexcused += 1;
                else if (type === 'EMERGENCY')
                    perEmp[empId].totals.emergency += 1;
                const schedStart = ((_a = c.shift) === null || _a === void 0 ? void 0 : _a.startTime) ? new Date(c.shift.startTime) : null;
                const noticeAt = c.noticeAt ? new Date(c.noticeAt) : null;
                if (schedStart && noticeAt) {
                    const minutesBefore = Math.round((schedStart.getTime() - noticeAt.getTime()) / (1000 * 60));
                    if (minutesBefore < 120)
                        perEmp[empId].totals.lateCallouts += 1;
                }
                const k = dayKey(new Date(c.noticeAt));
                trendCallouts.set(k, (trendCallouts.get(k) || 0) + 1);
            }
            for (const cov of coverages) {
                const empId = cov.replacementEmployeeId;
                if (!perEmp[empId])
                    continue;
                perEmp[empId].totals.coveredForOthers += 1;
                const k = dayKey(new Date(cov.reassignedAt));
                trendCoverage.set(k, (trendCoverage.get(k) || 0) + 1);
            }
            const tsByEmployee = {};
            for (const ts of timesheets) {
                const list = tsByEmployee[ts.employeeId] || [];
                list.push({ start: new Date(ts.startTime), end: ts.endTime ? new Date(ts.endTime) : null });
                tsByEmployee[ts.employeeId] = list;
            }
            for (const s of shifts) {
                if (!s.employeeId)
                    continue;
                const shiftEnd = new Date(s.endTime);
                if (shiftEnd.getTime() > effectiveEnd.getTime())
                    continue;
                if (calloutByShiftId.has(s.id))
                    continue;
                const empId = s.employeeId;
                if (!perEmp[empId])
                    continue;
                const shiftStart = new Date(s.startTime);
                const windows = tsByEmployee[empId] || [];
                const hit = windows.some((w) => {
                    const tsEnd = w.end || now;
                    return w.start.getTime() <= shiftEnd.getTime() && tsEnd.getTime() >= shiftStart.getTime();
                });
                if (!hit)
                    perEmp[empId].totals.noShows += 1;
            }
            const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
            for (const id of Object.keys(perEmp)) {
                const t = perEmp[id].totals;
                const penalty = t.unexcused * 15 + t.excused * 5 + t.emergency * 3 + t.lateCallouts * 5 + t.noShows * 25;
                const bonus = t.coveredForOthers * 3;
                const score = clamp(100 - penalty + bonus, 0, 100);
                perEmp[id].scoring.reliabilityScore = score;
                perEmp[id].scoring.attendanceConsistency =
                    score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';
            }
            const officerRows = Object.values(perEmp).sort((a, b) => b.scoring.reliabilityScore - a.scoring.reliabilityScore);
            const highestCalloutRates = officerRows
                .slice()
                .sort((a, b) => b.totals.callouts - a.totals.callouts)
                .slice(0, 10);
            const mostReliable = officerRows.slice(0, 10);
            const filledCallouts = coverages.filter((c) => !!c.calloutId);
            const avgResponseMinutes = filledCallouts.length
                ? Math.round((filledCallouts.reduce((acc, c) => acc + (Number(c.responseMinutes) || 0), 0) / filledCallouts.length) * 10) / 10
                : 0;
            const fillRate = callouts.length ? Math.round(((filledCallouts.length / callouts.length) * 100) * 10) / 10 : 0;
            const trendSeries = (() => {
                const keys = new Set([...trendCallouts.keys(), ...trendCoverage.keys()]);
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
            const toDayKey = (d) => d.toISOString().slice(0, 10);
            const [businessTotal, businessNew, employeeTotal, activeEmployeeTotal, userTotal, openIncidents, activeTimesheets, pendingLoans, pendingLeaves, expiringQualifications, recentBusinesses,] = await Promise.all([
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
            const businessTrendMap = new Map();
            const employeeTrendMap = new Map();
            const moduleCounts = new Map();
            for (const b of businessesInRange) {
                const k = toDayKey(b.createdAt);
                businessTrendMap.set(k, (businessTrendMap.get(k) || 0) + 1);
                const raw = (b.modules || '').split(',').map((x) => x.trim()).filter(Boolean);
                if (raw.length === 0) {
                    moduleCounts.set('None', (moduleCounts.get('None') || 0) + 1);
                }
                else {
                    for (const m of raw) {
                        moduleCounts.set(m, (moduleCounts.get(m) || 0) + 1);
                    }
                }
            }
            for (const e of employeesInRange) {
                const k = toDayKey(e.createdAt);
                employeeTrendMap.set(k, (employeeTrendMap.get(k) || 0) + 1);
            }
            const daysSeries = [];
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
        async getEmployeeDashboard(userId, days = 30, businessId) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
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
            if (!resolved)
                throw new common_1.BadRequestException('Employee record not found');
            if (!resolved.userId)
                throw new common_1.BadRequestException('Employee record is not linked to a user');
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
            const punctualityDaily = [];
            let onTime = 0;
            let late = 0;
            let missed = 0;
            let lateMinutesTotal = 0;
            const matchTimesheetForShift = (shiftStart, shiftEnd) => {
                const windowStart = new Date(shiftStart.getTime() - 2 * 60 * 60 * 1000);
                const windowEnd = new Date(shiftEnd.getTime() + 60 * 60 * 1000);
                const matches = recentTimesheets.filter((t) => t.startTime >= windowStart && t.startTime <= windowEnd);
                if (matches.length === 0)
                    return null;
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
                }
                else {
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
                if (p.status !== 'ON_TIME')
                    break;
                streakOnTimeDays += 1;
            }
            const reportCountsByWeek = new Map();
            const weekKey = (d) => {
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
            const currentShift = todayShifts.find((s) => s.startTime <= now && s.endTime >= now) ||
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
                    today: todayShifts.map((s) => {
                        var _a, _b, _c, _d, _e, _f, _g, _h;
                        return ({
                            id: s.id,
                            startTime: s.startTime,
                            endTime: s.endTime,
                            locationId: s.locationId,
                            locationName: ((_a = s.location) === null || _a === void 0 ? void 0 : _a.name) || null,
                            locationAddress: ((_b = s.location) === null || _b === void 0 ? void 0 : _b.address) || null,
                            locationLat: (_d = (_c = s.location) === null || _c === void 0 ? void 0 : _c.geoLat) !== null && _d !== void 0 ? _d : null,
                            locationLng: (_f = (_e = s.location) === null || _e === void 0 ? void 0 : _e.geoLng) !== null && _f !== void 0 ? _f : null,
                            locationRadiusMeters: (_h = (_g = s.location) === null || _g === void 0 ? void 0 : _g.radius) !== null && _h !== void 0 ? _h : null,
                        });
                    }),
                    currentShift: currentShift
                        ? {
                            id: currentShift.id,
                            startTime: currentShift.startTime,
                            endTime: currentShift.endTime,
                            locationId: currentShift.locationId,
                            locationName: ((_a = currentShift.location) === null || _a === void 0 ? void 0 : _a.name) || null,
                            locationAddress: ((_b = currentShift.location) === null || _b === void 0 ? void 0 : _b.address) || null,
                            locationLat: (_d = (_c = currentShift.location) === null || _c === void 0 ? void 0 : _c.geoLat) !== null && _d !== void 0 ? _d : null,
                            locationLng: (_f = (_e = currentShift.location) === null || _e === void 0 ? void 0 : _e.geoLng) !== null && _f !== void 0 ? _f : null,
                            locationRadiusMeters: (_h = (_g = currentShift.location) === null || _g === void 0 ? void 0 : _g.radius) !== null && _h !== void 0 ? _h : null,
                        }
                        : null,
                    nextShift: nextShift
                        ? {
                            id: nextShift.id,
                            startTime: nextShift.startTime,
                            endTime: nextShift.endTime,
                            locationId: nextShift.locationId,
                            locationName: ((_j = nextShift.location) === null || _j === void 0 ? void 0 : _j.name) || null,
                            locationAddress: ((_k = nextShift.location) === null || _k === void 0 ? void 0 : _k.address) || null,
                            locationLat: (_m = (_l = nextShift.location) === null || _l === void 0 ? void 0 : _l.geoLat) !== null && _m !== void 0 ? _m : null,
                            locationLng: (_p = (_o = nextShift.location) === null || _o === void 0 ? void 0 : _o.geoLng) !== null && _p !== void 0 ? _p : null,
                            locationRadiusMeters: (_r = (_q = nextShift.location) === null || _q === void 0 ? void 0 : _q.radius) !== null && _r !== void 0 ? _r : null,
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
    };
    __setFunctionName(_classThis, "ReportsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ReportsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ReportsService = _classThis;
})();
exports.ReportsService = ReportsService;
