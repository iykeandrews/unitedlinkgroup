import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getEmployeeDashboard(req: any, days?: string): Promise<{
        now: Date;
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            role: string;
            businessId: string;
        };
        timeTracking: {
            activeTimesheet: {
                id: string;
                endTime: Date | null;
                startTime: Date;
                locationId: string | null;
            } | null;
            activeBreak: {
                id: string;
                type: string;
                endTime: Date | null;
                startTime: Date;
                timesheetId: string;
            } | null;
        };
        schedule: {
            today: {
                id: string;
                startTime: Date;
                endTime: Date;
                locationId: string | null;
                locationName: string | null;
                locationAddress: string | null;
                locationLat: number | null;
                locationLng: number | null;
                locationRadiusMeters: number | null;
            }[];
            currentShift: {
                id: string;
                startTime: Date;
                endTime: Date;
                locationId: string | null;
                locationName: any;
                locationAddress: any;
                locationLat: any;
                locationLng: any;
                locationRadiusMeters: any;
            } | null;
            nextShift: {
                id: string;
                startTime: Date;
                endTime: Date;
                locationId: string | null;
                locationName: any;
                locationAddress: any;
                locationLat: any;
                locationLng: any;
                locationRadiusMeters: any;
            } | null;
            canClockIn: boolean;
        };
        metrics: {
            punctuality: {
                onTimeRate: number;
                onTime: number;
                late: number;
                missed: number;
                avgLateMinutes: number;
            };
            reports: {
                incidentCount: number;
                patrolCount: number;
                total: number;
            };
            streakOnTimeDays: number;
        };
        charts: {
            punctualityDaily: {
                date: string;
                lateMinutes: number | null;
                status: "ON_TIME" | "LATE" | "MISSED";
            }[];
            reportsWeekly: {
                week: string;
                count: number;
                incidentCount: number;
                patrolCount: number;
            }[];
        };
        activity: {
            id: string;
            kind: string;
            title: string;
            createdAt: Date;
        }[];
    }>;
    getSuperadminDashboard(days?: string): Promise<{
        now: Date;
        rangeDays: number;
        totals: {
            businessTotal: number;
            businessNew: number;
            employeeTotal: number;
            activeEmployeeTotal: number;
            userTotal: number;
            openIncidents: number;
            activeTimesheets: number;
            pendingLoans: number;
            pendingLeaves: number;
            expiringQualifications: number;
        };
        charts: {
            growth: {
                date: string;
                newBusinesses: number;
                totalBusinesses: number;
                newEmployees: number;
                totalEmployees: number;
            }[];
            modulesTop: {
                name: string;
                value: number;
            }[];
        };
        recentBusinesses: {
            id: string;
            status: string;
            country: string | null;
            createdAt: Date;
            _count: {
                employees: number;
                locations: number;
                incidentReports: number;
            };
            name: string;
            businessType: string | null;
            industry: string | null;
            modules: string | null;
            owner: {
                id: string;
                firstName: string | null;
                lastName: string | null;
                email: string;
            };
        }[];
    }>;
    getDashboardStats(req: any, headerBusinessId?: string, queryBusinessId?: string): Promise<{
        activeEmployees: number;
        nextPayroll: {
            payDate: Date;
            periodEnd: Date;
        } | null;
        pendingRequests: any;
        scheduledToday: number;
        onShiftNow: number;
    }>;
    getBusinessOverview(req: any, headerBusinessId?: string, queryBusinessId?: string, days?: string): Promise<{
        now: Date;
        rangeDays: number;
        kpis: {
            revenueLastTotal: number;
            expensesLastTotal: number;
            outstandingTotal: number;
            overdueTotal: number;
        };
        charts: {
            cashflowWeekly: {
                week: string;
                invoicesTotal: number;
                paymentsTotal: number;
            }[];
            invoicesByStatus: {
                status: string;
                count: number;
                total: number;
            }[];
        };
        recent: {
            invoices: {
                id: string;
                status: string;
                updatedAt: Date;
                client: {
                    id: string;
                    name: string;
                };
                total: number;
                dueDate: Date;
                invoiceNumber: string;
            }[];
            payments: {
                id: string;
                status: string;
                type: string;
                amount: number;
                method: string | null;
                description: string | null;
                date: Date;
                category: string | null;
                payeeName: string | null;
                reference: string | null;
            }[];
        };
    }>;
    getPayrollSummary(req: any, startDate: string, endDate: string, headerBusinessId?: string): Promise<{
        period: {
            startDate: string | undefined;
            endDate: string | undefined;
        };
        summary: {
            totalGross: number;
            totalNet: number;
            totalTaxes: number;
            totalDeductions: number;
            payrollCount: number;
        };
        payrolls: ({
            payStubs: {
                id: string;
                workerType: string;
                payrollId: string;
                createdAt: Date;
                employeeId: string;
                regularHours: number;
                overtimeHours: number;
                regularPay: number;
                overtimePay: number;
                bonus: number;
                commission: number;
                reimbursement: number;
                grossPay: number;
                netPay: number;
                ytdGross: number;
                ytdNet: number;
                ytdTaxes: number;
                taxes: number;
                employerTaxes: number;
                deductions: number;
                taxDetails: string | null;
                employerTaxDetails: string | null;
                deductionDetails: string | null;
            }[];
        } & {
            id: string;
            businessId: string;
            status: string;
            type: string;
            createdAt: Date;
            updatedAt: Date;
            periodStart: Date;
            periodEnd: Date;
            payDate: Date;
            totalGross: number;
            totalNet: number;
            totalEmployeeTaxes: number;
            totalEmployerTaxes: number;
            totalDeductions: number;
        })[];
    }>;
    getLaborCost(req: any, startDate: string, endDate: string, headerBusinessId?: string): Promise<{
        totalHours: number;
        estimatedCost: number;
        timesheetCount: number;
    }>;
    getAttendanceReport(req: any, startDate: string, endDate: string, headerBusinessId?: string): Promise<({
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            phone: string | null;
            badgeNumber: string | null;
            profileImageUrl: string | null;
            businessId: string;
            userId: string | null;
            role: string;
            customRoleId: string | null;
            status: string;
            preferredName: string | null;
            pronouns: string | null;
            middleName: string | null;
            dateOfBirth: Date | null;
            isAuthorizedToWork: boolean;
            address: string | null;
            city: string | null;
            state: string | null;
            zip: string | null;
            country: string | null;
            officialEmail: string | null;
            emergencyContactName: string | null;
            emergencyContactPhone: string | null;
            type: string;
            workerType: string;
            paySchedule: string;
            payType: string;
            hourlyRate: number | null;
            salary: number | null;
            hireDate: Date | null;
            payrollId: string | null;
            workPeriod: string | null;
            hoursPerPeriod: number | null;
            daysPerPeriod: number | null;
            stressProfile: string | null;
            overtimeEligible: boolean;
            departmentId: string | null;
            defaultLocationId: string | null;
            supervisorId: string | null;
            ssn: string | null;
            filingStatus: string | null;
            taxState: string;
            federalAllowances: number;
            multipleJobs: boolean;
            dependentsAmount: number;
            otherIncome: number;
            deductionsAmount: number;
            additionalWithholding: number;
            stateFilingStatus: string | null;
            stateAllowances: number;
            stateAdditionalWithholding: number;
            contractorBusinessName: string | null;
            contractorType: string | null;
            w9Confirmed: boolean;
            directDepositInfo: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        location: {
            id: string;
            businessId: string;
            status: string;
            address: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            geoLat: number | null;
            geoLng: number | null;
            endDate: Date | null;
            clientId: string | null;
            startDate: Date | null;
            code: string | null;
            radius: number | null;
            workOrder: string | null;
            taxOverrideInfo: string | null;
        } | null;
        breaks: {
            id: string;
            type: string;
            endTime: Date | null;
            startTime: Date;
            timesheetId: string;
        }[];
    } & {
        id: string;
        status: string;
        workerType: string;
        createdAt: Date;
        updatedAt: Date;
        endTime: Date | null;
        startTime: Date;
        clockInIp: string | null;
        clockOutIp: string | null;
        clockInLat: number | null;
        clockInLng: number | null;
        clockOutLat: number | null;
        clockOutLng: number | null;
        employeeNote: string | null;
        employeeId: string;
        locationId: string | null;
    })[]>;
    getReliabilityReport(req: any, startDate: string, endDate: string, headerBusinessId?: string): Promise<{
        range: {
            start: string;
            end: string;
        };
        officers: any[];
        insights: {
            highestCalloutRates: any[];
            mostReliable: any[];
            coverageEfficiency: {
                avgResponseMinutes: number;
                fillRate: number;
            };
        };
        trends: {
            date: string;
            callouts: number;
            coverages: number;
        }[];
    }>;
}
