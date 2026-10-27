import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  Payroll,
  PayStub,
  Employee,
  Timesheet,
} from "@unitedlinkgroup/database";
import { LeaveService } from "../leave/leave.service";
import { generatePayslipPdfBuffer } from "./payslip-pdf";
import {
  amount,
  calculateFederal,
  money,
  parseJson,
  PAY_PERIODS,
  SOCIAL_SECURITY_CAPS,
  validateTaxProfile,
} from "./us-tax";
import { manualTaxes, validateRules } from "./manual-tax";
import { createHash } from "crypto";
import { calculateHours } from "./hours";
import { calendarBoundary, fullSalaryPeriod } from "./dates";

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private leave: LeaveService,
  ) {}

  async getBusinessId(userId: string): Promise<string> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (employee) return employee.businessId;

    const business = await this.prisma.business.findFirst({
      where: { ownerId: userId },
    });
    if (business) return business.id;

    throw new BadRequestException("User is not associated with a business");
  }

  async getPayStubsForUser(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!employee) return []; // Return empty if not linked to an employee

    return this.prisma.payStub.findMany({
      where: {
        employeeId: employee.id,
        payroll: { status: "PAID" },
      },
      include: {
        payroll: {
          include: {
            business: true,
          },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workerType: true,
            payType: true,
            hourlyRate: true,
            salary: true,
            taxState: true,
            address: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
      orderBy: {
        payroll: {
          payDate: "desc",
        },
      },
    });
  }

  async getBusinessPayStubs(businessId: string, user?: any) {
    if (user) {
      await this.validateBusinessAccess(businessId, user);
    }
    return this.prisma.payStub.findMany({
      where: {
        payroll: {
          businessId,
          status: "PAID",
        },
      },
      include: {
        payroll: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workerType: true,
            payType: true,
            hourlyRate: true,
            salary: true,
            taxState: true,
            address: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
      orderBy: {
        payroll: {
          payDate: "desc",
        },
      },
    });
  }

  async downloadPayStubPdf(
    payStubId: string,
    user: any,
  ): Promise<{ filename: string; data: Buffer }> {
    const stub = await this.prisma.payStub.findUnique({
      where: { id: payStubId },
      include: {
        payroll: { include: { business: true } },
        employee: true,
      },
    });

    if (!stub) throw new NotFoundException("Pay stub not found");
    if (stub.payroll?.status !== "PAID")
      throw new BadRequestException("Pay stub is not available");

    await this.assertPayStubAccess(stub as any, user);

    const source = await this.prisma.payStubDocument.findUnique({
      where: { payStubId },
    });
    if (source) {
      const data = Buffer.from(source.content);
      if (createHash("sha256").update(data).digest("hex") !== source.sha256)
        throw new BadRequestException(
          "Original paystub verification failed. Contact payroll support.",
        );
      return { filename: source.fileName, data };
    }

    const payDate = stub.payroll?.payDate
      ? new Date(stub.payroll.payDate)
      : new Date();
    const datePart = Number.isFinite(payDate.getTime())
      ? payDate.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const payrollData = {
      ...(stub as any).payroll,
      payStubs: [
        {
          ...(stub as any),
          employee: (stub as any).employee,
        },
      ],
    };
    const businessData = (stub as any)?.payroll?.business || {};
    const pdf = await generatePayslipPdfBuffer(payrollData, businessData);
    const filename = `Payroll_${datePart}.pdf`;
    return { filename, data: pdf };
  }

  private async assertPayStubAccess(stub: any, user: any) {
    if (!user) throw new BadRequestException("Access denied");
    if (user.role === "SUPER_ADMIN") return;

    const payrollBusinessId = stub?.payroll?.businessId;
    if (!payrollBusinessId) throw new BadRequestException("Access denied");

    if (
      user.role === "BUSINESS_ADMIN" ||
      user.role === "MANAGER" ||
      user.role === "FINANCE"
    ) {
      await this.validateBusinessAccess(payrollBusinessId, user);
      return;
    }

    const stubUserId = stub?.employee?.userId;
    if (!stubUserId || stubUserId !== user.userId)
      throw new BadRequestException("Access denied");
  }

  async getPayrollsForUser(userId: string, user?: any): Promise<Payroll[]> {
    const businessId = await this.getBusinessId(userId);
    return this.getPayrolls(businessId, user);
  }

  async validateBusinessAccess(targetBusinessId: string, user: any) {
    if (user.role === "SUPER_ADMIN") return;

    // Check if owner
    const ownedBusiness = await this.prisma.business.findFirst({
      where: { ownerId: user.userId, id: targetBusinessId },
    });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    // Check if employee of that business
    const employee = await this.prisma.employee.findFirst({
      where: { userId: user.userId, businessId: targetBusinessId },
    });
    if (employee) return;

    throw new BadRequestException(
      "Access denied: You do not have access to this business data",
    );
  }

  async createPayroll(
    businessId: string,
    periodStart: Date,
    periodEnd: Date,
    payDate: Date,
    type: string = "REGULAR",
    user?: any,
    paySchedule?: string,
  ): Promise<Payroll> {
    if (user) {
      await this.validateBusinessAccess(businessId, user);
    }

    if (
      ![periodStart, periodEnd, payDate].every((d) =>
        Number.isFinite(d.getTime()),
      ) ||
      periodStart > periodEnd ||
      payDate < periodEnd
    )
      throw new BadRequestException(
        "Enter a valid pay period and a pay date on or after its end.",
      );
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException("Business not found");
    const zone =
      parseJson(business.settings).payrollTaxes?.payrollTimeZone || "UTC";
    if (+periodStart === Date.parse(periodStart.toISOString().slice(0, 10)))
      periodStart = calendarBoundary(
        periodStart.toISOString().slice(0, 10),
        zone,
      );
    if (+periodEnd === Date.parse(periodEnd.toISOString().slice(0, 10)))
      periodEnd = calendarBoundary(
        periodEnd.toISOString().slice(0, 10),
        zone,
        true,
      );
    if (type !== "REGULAR")
      throw new BadRequestException(
        "Only regular payroll is currently supported. Supplemental/off-cycle withholding requires a tax provider.",
      );
    if (!paySchedule || !PAY_PERIODS[paySchedule])
      throw new BadRequestException("Choose a valid payroll frequency.");
    return this.prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: { updatedAt: new Date() },
      });
      const existing = await tx.payroll.findFirst({
        where: {
          businessId,
          periodStart,
          periodEnd,
          paySchedule,
          status: { not: "CANCELLED" },
        },
      });
      if (existing) {
        if (existing.status === "DRAFT" && +existing.payDate === +payDate)
          return existing;
        throw new BadRequestException(
          "A payroll run for this period already exists. Review the existing draft or history.",
        );
      }
      const overlap = await tx.payroll.findFirst({
        where: {
          businessId,
          status: { not: "CANCELLED" },
          OR: [{ paySchedule }, { paySchedule: null }],
          periodStart: { lte: periodEnd },
          periodEnd: { gte: periodStart },
        },
      });
      if (overlap)
        throw new BadRequestException(
          "This pay period overlaps an existing payroll for the same frequency.",
        );
      return tx.payroll.create({
        data: {
          businessId,
          periodStart,
          periodEnd,
          payDate,
          type,
          paySchedule,
          calendarTimeZone: zone,
          status: "DRAFT",
        },
      });
    });
  }

  async getAnnualTaxReport(businessId: string, year: number, user?: any) {
    if (user) {
      await this.validateBusinessAccess(businessId, user);
    }

    if (!Number.isInteger(year) || year < 2024 || year > 2026)
      throw new BadRequestException(
        "Reports support verified tax years 2024–2026.",
      );
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${year + 1}-01-01T00:00:00Z`);

    const payStubs = await this.prisma.payStub.findMany({
      where: {
        payroll: {
          businessId,
          payDate: {
            gte: startOfYear,
            lt: endOfYear,
          },
          status: "PAID",
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workerType: true,
            payType: true,
            hourlyRate: true,
            salary: true,
            taxState: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            ssn: true,
          },
        },
      },
    });

    // Group by Employee and WorkerType
    const w2Totals: Record<string, any> = {};
    const contractorTotals: Record<string, any> = {};

    const initTotal = (emp: any) => ({
      employee: {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        workerType: emp.workerType,
        address: emp.address,
        city: emp.city,
        state: emp.state,
        zip: emp.zip,
        ssn: emp.ssn ? "On file" : null,
      },
      grossPay: 0,
      netPay: 0,
      taxes: 0,
      employerTaxes: 0,
      deductions: 0,
      breakdown: {
        federalTax: 0,
        socialSecurity: 0,
        medicare: 0,
        stateTax: 0,
        additionalMedicare: 0,
        localTax: 0,
        otherEmployeeTax: 0,
        otherEmployerTax: 0,
        stateLocalLines: [] as any[],
        futa: 0,
        dcUi: 0,
        dcPfl: 0,
      },
    });

    for (const stub of payStubs) {
      const eid = stub.employeeId;
      const is1099 = stub.workerType === "CONTRACTOR_1099";
      const targetMap = is1099 ? contractorTotals : w2Totals;

      if (!targetMap[eid]) {
        targetMap[eid] = initTotal(stub.employee);
      }

      const entry = targetMap[eid];
      entry.grossPay += stub.grossPay;
      entry.netPay += stub.netPay;
      entry.taxes += stub.taxes;
      entry.employerTaxes += stub.employerTaxes || 0;
      entry.deductions += stub.deductions;

      if (stub.taxDetails) {
        const td = JSON.parse(stub.taxDetails);
        entry.breakdown.federalTax += td.federalTax || 0;
        entry.breakdown.socialSecurity += td.socialSecurity || 0;
        entry.breakdown.medicare += td.medicare || 0;
        entry.breakdown.stateTax += td.stateTax || 0;
        entry.breakdown.additionalMedicare += td.additionalMedicare || 0;
        entry.breakdown.localTax += td.localTax || 0;
        entry.breakdown.otherEmployeeTax += td.otherTax || 0;
        entry.breakdown.stateLocalLines.push(...(td.lines || []));
      }
      if (stub.employerTaxDetails) {
        const etd = JSON.parse(stub.employerTaxDetails);
        entry.breakdown.futa +=
          (etd.futa || 0) +
          (etd.lines || [])
            .filter((l: any) => l.category === "FUTA")
            .reduce((n: number, l: any) => n + l.amount, 0);
        entry.breakdown.otherEmployerTax += (etd.lines || [])
          .filter((l: any) => l.category !== "FUTA")
          .reduce((n: number, l: any) => n + l.amount, 0);
        entry.breakdown.dcUi += etd.dcUi || 0;
        entry.breakdown.dcPfl += etd.dcPfl || 0;
      }
    }

    // Include ALL Active Employees (even if no pay stubs)
    const activeEmployees = await this.prisma.employee.findMany({
      where: {
        businessId,
        status: "ACTIVE",
        role: { notIn: ["SUPER_ADMIN", "BUSINESS_ADMIN"] as any },
      },
    });

    for (const emp of activeEmployees) {
      if (emp.workerType === "W2" || emp.workerType === "BOTH") {
        if (!w2Totals[emp.id]) w2Totals[emp.id] = initTotal(emp);
      }
      if (emp.workerType === "CONTRACTOR_1099" || emp.workerType === "BOTH") {
        if (!contractorTotals[emp.id])
          contractorTotals[emp.id] = initTotal(emp);
      }
    }

    const w2Employees = Object.values(w2Totals);
    const contractors = Object.values(contractorTotals);

    return {
      year,
      w2Employees,
      contractors, // For 1099-NEC
      summary: {
        totalW2Gross: w2Employees.reduce(
          (sum: number, e: any) => sum + e.grossPay,
          0,
        ),
        total1099Gross: contractors.reduce(
          (sum: number, e: any) => sum + e.grossPay,
          0,
        ),
        totalTaxesWithheld: w2Employees.reduce(
          (sum: number, e: any) => sum + e.taxes,
          0,
        ),
        totalEmployerTaxes: w2Employees.reduce(
          (sum: number, e: any) => sum + e.employerTaxes,
          0,
        ),
      },
    };
  }

  async getYearEndForms(businessId: string, year: number, user?: any) {
    if (user) {
      await this.validateBusinessAccess(businessId, user);
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException("Business not found");

    const report = await this.getAnnualTaxReport(businessId, year, user);

    // W-2 Mapping
    const w2s = report.w2Employees.map((e: any) => ({
      employeeId: e.employee.id,
      ssn: e.employee.ssn ? "On file (masked)" : "Not on file",
      name: `${e.employee.firstName} ${e.employee.lastName}`,
      address: `${e.employee.address || ""}, ${e.employee.city || ""}, ${e.employee.state || ""} ${e.employee.zip || ""}`,
      wages: e.grossPay,
      fedIncomeTax: e.breakdown.federalTax,
      socialSecurityWages: Math.min(
        e.grossPay,
        SOCIAL_SECURITY_CAPS[year] ?? 0,
      ), // Wage base for the report year
      socialSecurityTax: e.breakdown.socialSecurity,
      medicareWages: e.grossPay,
      medicareTax: money(e.breakdown.medicare + e.breakdown.additionalMedicare),
      localIncomeTax: money(e.breakdown.localTax),
      otherEmployeeTax: money(e.breakdown.otherEmployeeTax),
      stateLocalBreakdown: e.breakdown.stateLocalLines,
      stateWages: e.grossPay,
      stateIncomeTax: e.breakdown.stateTax,
      employerName: business.name,
      employerEin: business.ein,
      employerAddress: `${business.address || ""}, ${business.city || ""}, ${business.state || ""} ${business.zip || ""}`,
    }));

    // 1099-NEC Mapping
    const nec1099s = report.contractors.map((c: any) => ({
      contractorId: c.employee.id,
      tin: c.employee.ssn ? "On file (masked)" : "Not on file",
      name: `${c.employee.firstName} ${c.employee.lastName}`,
      address: `${c.employee.address || ""}, ${c.employee.city || ""}, ${c.employee.state || ""} ${c.employee.zip || ""}`,
      nonemployeeCompensation: c.grossPay,
      fedTaxWithheld: 0,
      stateTaxWithheld: 0,
      payerName: business.name,
      payerTin: business.ein,
      payerAddress: `${business.address || ""}, ${business.city || ""}, ${business.state || ""} ${business.zip || ""}`,
    }));

    return {
      year,
      w2s,
      nec1099s,
      filingStatus: "PREPARATION_SUMMARY",
      notice:
        "Preparation summary only; not an official W-2/1099 filing. Verify taxable wages and jurisdiction allocations before filing.",
    };
  }

  async getTaxSetup(businessId: string, user: any) {
    await this.validateBusinessAccess(businessId, user);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException("Business not found");
    const employees = await this.prisma.employee.findMany({
      where: { businessId, status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        workerType: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        payrollTaxProfile: true,
      },
    });
    return {
      config: parseJson(business.settings).payrollTaxes || null,
      employees: employees.map((e) => ({
        ...e,
        payrollTaxProfile: parseJson(e.payrollTaxProfile),
      })),
      taxYear: 2026,
      mode: "MANUAL_RULES",
    };
  }

  async saveTaxRules(businessId: string, input: any, user: any) {
    await this.validateBusinessAccess(businessId, user);
    const config = {
      ...validateRules(input),
      reviewedBy: user.userId,
      reviewedAt: new Date().toISOString(),
    };
    return this.prisma.$transaction(async (tx) => {
      // Serialize changes without overwriting unrelated business preferences.
      await tx.business.update({
        where: { id: businessId },
        data: { updatedAt: new Date() },
      });
      const business = await tx.business.findUnique({
        where: { id: businessId },
      });
      if (!business) throw new NotFoundException("Business not found");
      await tx.business.update({
        where: { id: businessId },
        data: {
          settings: JSON.stringify({
            ...parseJson(business.settings),
            payrollTaxes: config,
          }),
        },
      });
      await tx.auditLog.create({
        data: {
          businessId,
          action: "UPDATE_PAYROLL_TAX_RULES",
          resource: "Business",
          resourceId: businessId,
          details: JSON.stringify({
            ruleIds: config.rules.map((r) => r.id),
            reviewedStates: config.reviewedStates,
            reviewedBy: user.userId,
          }),
        },
      });
      return config;
    });
  }

  async saveEmployeeTaxProfile(
    businessId: string,
    employeeId: string,
    input: any,
    user: any,
  ) {
    await this.validateBusinessAccess(businessId, user);
    const profile = validateTaxProfile(input);
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, businessId },
    });
    if (!employee)
      throw new NotFoundException("Employee not found in this business");
    for (const location of profile.workLocations)
      if (
        location.locationId &&
        !(await this.prisma.location.findFirst({
          where: { id: location.locationId, businessId },
        }))
      )
        throw new BadRequestException(
          "Work locations must belong to this business.",
        );
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: { payrollTaxProfile: JSON.stringify(profile) },
      });
      await tx.auditLog.create({
        data: {
          businessId,
          action: "UPDATE_PAYROLL_TAX_PROFILE",
          resource: "Employee",
          resourceId: employeeId,
          details: JSON.stringify({
            updatedBy: user.userId,
            w4FormYear: profile.w4FormYear,
          }),
        },
      });
    });
    return profile;
  }

  private taxFingerprint(employee: any, business: any, payroll: any) {
    return createHash("sha256")
      .update(
        JSON.stringify({
          profile: employee.payrollTaxProfile,
          w2: employee.w2Profile,
          contractor: employee.contractorProfile,
          w9Confirmed: employee.w9Confirmed,
          workerType: employee.workerType,
          rate: employee.hourlyRate,
          salary: employee.salary,
          payType: employee.payType,
          paySchedule: employee.paySchedule,
          overtimeEligible: employee.overtimeEligible,
          filingStatus: employee.filingStatus,
          taxState: employee.taxState,
          federalAllowances: employee.federalAllowances,
          multipleJobs: employee.multipleJobs,
          dependentsAmount: employee.dependentsAmount,
          otherIncome: employee.otherIncome,
          deductionsAmount: employee.deductionsAmount,
          additionalWithholding: employee.additionalWithholding,
          stateFilingStatus: employee.stateFilingStatus,
          stateAllowances: employee.stateAllowances,
          stateAdditionalWithholding: employee.stateAdditionalWithholding,
          rules: parseJson(business.settings).payrollTaxes,
          payDate: payroll.payDate,
          periodStart: payroll.periodStart,
          periodEnd: payroll.periodEnd,
        }),
      )
      .digest("hex");
  }

  async runPayrollCalculation(payrollId: string, user?: any): Promise<any> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { business: true },
    });
    if (!payroll) throw new NotFoundException("Payroll not found");
    if (user) await this.validateBusinessAccess(payroll.businessId, user);
    if (payroll.status !== "DRAFT")
      throw new BadRequestException("Only draft payroll can be recalculated.");
    if (payroll.type !== "REGULAR")
      throw new BadRequestException(
        "Supplemental and off-cycle runs require a maintained tax provider.",
      );
    const employees = await this.prisma.employee.findMany({
      where: {
        businessId: payroll.businessId,
        status: "ACTIVE",
        role: { notIn: ["SUPER_ADMIN", "BUSINESS_ADMIN"] },
      },
      include: { w2Profile: true, contractorProfile: true },
    });
    const data: any[] = [];
    for (const employee of employees) {
      const types =
        employee.workerType === "BOTH"
          ? ["W2", "CONTRACTOR_1099"]
          : [employee.workerType];
      for (const workerType of types) {
        if (!["W2", "CONTRACTOR_1099"].includes(workerType))
          throw new BadRequestException("Invalid employee classification.");
        const profile =
          workerType === "W2" ? employee.w2Profile : employee.contractorProfile;
        const effective: any = {
          ...employee,
          ...(workerType === "W2" ? employee.w2Profile : {}),
        };
        effective.id = employee.id;
        if (
          payroll.paySchedule &&
          effective.paySchedule !== payroll.paySchedule
        )
          continue;
        if (
          workerType === "CONTRACTOR_1099" &&
          !(employee.contractorProfile?.w9Confirmed ?? employee.w9Confirmed)
        )
          throw new BadRequestException(
            `Confirm W-9 and backup withholding requirements for ${employee.firstName} ${employee.lastName} before paying a contractor.`,
          );
        const payType = workerType === "W2" ? effective.payType : "HOURLY";
        const rate = profile?.rate ?? employee.hourlyRate ?? 0;
        const salary = ["SALARY", "SALARIED"].includes(payType)
          ? (employee.w2Profile?.rate ?? employee.salary ?? undefined)
          : undefined;
        if (
          salary !== undefined &&
          !fullSalaryPeriod(
            payroll.periodStart,
            payroll.periodEnd,
            effective.paySchedule,
            payroll.calendarTimeZone || "UTC",
          )
        )
          throw new BadRequestException(
            "Salaried payroll requires a complete regular pay period. Partial-period salary needs a reviewed prorated calculation.",
          );
        const earnings = await this.calculateGrossPay(
          effective,
          payroll.periodStart,
          payroll.periodEnd,
          workerType,
          payType,
          rate,
          salary,
          new Date(
            parseJson(payroll.business.settings).payrollTaxes?.workweekAnchor ||
              "2026-01-04T00:00:00Z",
          ),
        );
        amount(earnings.grossPay, "Gross wages");
        if (earnings.grossPay === 0 && !earnings.reimbursement) continue;
        const prior = await this.getPriorStubs(
          employee.id,
          payroll.payDate,
          workerType,
        );
        const ytdGross = money(prior.reduce((n, s) => n + s.grossPay, 0));
        const ytdTaxes = money(prior.reduce((n, s) => n + s.taxes, 0));
        const tax = await this.calculateTaxes(
          earnings.grossPay,
          effective,
          ytdGross,
          workerType,
          payroll,
          prior,
        );
        const deduction =
          workerType === "W2"
            ? await this.calculateDeductions(
                employee.id,
                payrollId,
                Math.max(0, earnings.grossPay - tax.employeeTaxes),
              )
            : { totalDeductions: 0, deductionDetails: {} };
        const netPay = money(
          earnings.grossPay -
            tax.employeeTaxes -
            deduction.totalDeductions +
            earnings.reimbursement,
        );
        if (netPay < 0)
          throw new BadRequestException(
            `Withholding exceeds available pay for ${employee.firstName} ${employee.lastName}. Review tax elections.`,
          );
        if (workerType === "CONTRACTOR_1099")
          tax.employeeTaxDetails.calculation = {
            status: "CONTRACTOR",
            complete: true,
            issues: [],
            taxYear: payroll.payDate.getUTCFullYear(),
            ytdGrossBefore: ytdGross,
          };
        tax.employeeTaxDetails.calculation.fingerprint = this.taxFingerprint(
          employee,
          payroll.business,
          payroll,
        );
        data.push({
          payrollId,
          employeeId: employee.id,
          workerType,
          ...earnings,
          taxes: tax.employeeTaxes,
          employerTaxes: tax.employerTaxes,
          deductions: money(deduction.totalDeductions),
          netPay,
          ytdGross: money(ytdGross + earnings.grossPay),
          ytdNet: money(prior.reduce((n, s) => n + s.netPay, 0) + netPay),
          ytdTaxes: money(ytdTaxes + tax.employeeTaxes),
          taxDetails: JSON.stringify(tax.employeeTaxDetails),
          employerTaxDetails: JSON.stringify(tax.employerTaxDetails),
          deductionDetails: JSON.stringify(deduction.deductionDetails),
        });
      }
    }
    if (!data.length)
      throw new BadRequestException(
        "No approved earnings match this payroll frequency.",
      );
    await this.prisma.$transaction(async (tx) => {
      const lock = await tx.payroll.updateMany({
        where: { id: payrollId, status: "DRAFT", updatedAt: payroll.updatedAt },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1)
        throw new BadRequestException(
          "Payroll changed while calculating. Reload and try again.",
        );
      await tx.payStub.deleteMany({ where: { payrollId } });
      await tx.payStub.createMany({ data });
      await this.recalculatePayrollTotals(payrollId, tx);
    });
    return this.getPayrollById(payrollId, user);
  }

  async updatePayStub(stubId: string, updates: any, user?: any) {
    const stub = await this.prisma.payStub.findUnique({
      where: { id: stubId },
      include: {
        employee: { include: { w2Profile: true, contractorProfile: true } },
        payroll: { include: { business: true } },
      },
    });
    if (!stub) throw new NotFoundException("Pay stub not found");
    if (user) await this.validateBusinessAccess(stub.payroll.businessId, user);
    if (stub.payroll.status !== "DRAFT")
      throw new BadRequestException("Finalized payroll cannot be edited.");
    const fields = [
      "regularHours",
      "overtimeHours",
      "bonus",
      "commission",
      "reimbursement",
      "deductions",
    ];
    for (const [k, v] of Object.entries(updates)) {
      if (!fields.includes(k))
        throw new BadRequestException(
          "Taxes are calculated from approved rules and cannot be manually overwritten.",
        );
      amount(v, k);
    }
    const w2 = stub.workerType === "W2";
    const effective: any = {
      ...stub.employee,
      ...(w2 ? stub.employee.w2Profile : {}),
    };
    effective.id = stub.employee.id;
    const regularHours = updates.regularHours ?? stub.regularHours;
    const overtimeHours = updates.overtimeHours ?? stub.overtimeHours;
    if (!w2 && overtimeHours)
      throw new BadRequestException(
        "Contractors are paid at their agreed rate, without employee overtime.",
      );
    if (w2 && effective.overtimeEligible === false && overtimeHours)
      throw new BadRequestException(
        "An overtime-exempt worker cannot have overtime hours.",
      );
    const rate = w2
      ? (stub.employee.w2Profile?.rate ?? stub.employee.hourlyRate ?? 0)
      : (stub.employee.contractorProfile?.rate ??
        stub.employee.hourlyRate ??
        0);
    const hourly = !w2 || effective.payType === "HOURLY";
    if (
      !hourly &&
      (regularHours !== stub.regularHours ||
        overtimeHours !== stub.overtimeHours)
    )
      throw new BadRequestException(
        "Salary hours cannot be edited as hourly earnings.",
      );
    const regularPay = hourly ? money(regularHours * rate) : stub.regularPay;
    const overtimePay = hourly && w2 ? money(overtimeHours * rate * 1.5) : 0;
    const bonus = money(updates.bonus ?? stub.bonus),
      commission = money(updates.commission ?? stub.commission),
      reimbursement = money(updates.reimbursement ?? stub.reimbursement);
    if (w2 && (bonus || commission))
      throw new BadRequestException(
        "Bonus/commission withholding and overtime regular-rate treatment require the maintained tax provider.",
      );
    const grossPay = money(regularPay + overtimePay + bonus + commission);
    amount(grossPay, "Gross wages");
    const prior = await this.getPriorStubs(
      stub.employeeId,
      stub.payroll.payDate,
      stub.workerType,
    );
    const ytdGross = money(prior.reduce((n, s) => n + s.grossPay, 0));
    const tax = await this.calculateTaxes(
      grossPay,
      effective,
      ytdGross,
      stub.workerType,
      stub.payroll,
      prior,
    );
    const auto = w2
      ? await this.calculateDeductions(
          stub.employeeId,
          stub.payrollId,
          Math.max(0, grossPay - tax.employeeTaxes),
        )
      : { totalDeductions: 0, deductionDetails: { loans: [] } };
    const existing = parseJson(stub.deductionDetails);
    const manual =
      updates.deductions ??
      (existing.manualOverride ? stub.deductions : undefined);
    const deductions = money(manual ?? auto.totalDeductions);
    if (manual !== undefined && deductions < auto.totalDeductions)
      throw new BadRequestException(
        "Post-tax deductions cannot be less than the scheduled loan repayments.",
      );
    if (deductions > Math.max(0, grossPay - tax.employeeTaxes))
      throw new BadRequestException(
        "Post-tax deductions cannot exceed available wages.",
      );
    const deductionDetails =
      manual === undefined
        ? auto.deductionDetails
        : {
            ...auto.deductionDetails,
            manualOverride: true,
            otherPostTax: money(deductions - auto.totalDeductions),
            total: deductions,
          };
    const netPay = money(
      grossPay - tax.employeeTaxes - deductions + reimbursement,
    );
    if (netPay < 0)
      throw new BadRequestException(
        "Withholding exceeds available pay. Review tax elections.",
      );
    if (!w2)
      tax.employeeTaxDetails.calculation = {
        status: "CONTRACTOR",
        complete: true,
        issues: [],
        taxYear: stub.payroll.payDate.getUTCFullYear(),
        ytdGrossBefore: ytdGross,
      };
    tax.employeeTaxDetails.calculation.fingerprint = this.taxFingerprint(
      stub.employee,
      stub.payroll.business,
      stub.payroll,
    );
    await this.prisma.$transaction(async (tx) => {
      const lock = await tx.payroll.updateMany({
        where: {
          id: stub.payrollId,
          status: "DRAFT",
          updatedAt: stub.payroll.updatedAt,
        },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1)
        throw new BadRequestException(
          "Payroll changed while editing. Reload and try again.",
        );
      await tx.payStub.update({
        where: { id: stubId },
        data: {
          regularHours,
          overtimeHours,
          regularPay,
          overtimePay,
          bonus,
          commission,
          reimbursement,
          grossPay,
          taxes: tax.employeeTaxes,
          employerTaxes: tax.employerTaxes,
          deductions,
          netPay,
          ytdGross: money(ytdGross + grossPay),
          ytdNet: money(prior.reduce((n, s) => n + s.netPay, 0) + netPay),
          ytdTaxes: money(
            prior.reduce((n, s) => n + s.taxes, 0) + tax.employeeTaxes,
          ),
          taxDetails: JSON.stringify(tax.employeeTaxDetails),
          employerTaxDetails: JSON.stringify(tax.employerTaxDetails),
          deductionDetails: JSON.stringify(deductionDetails),
        },
      });
      await this.recalculatePayrollTotals(stub.payrollId, tx);
    });
    return this.prisma.payStub.findUnique({
      where: { id: stubId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workerType: true,
            payType: true,
            hourlyRate: true,
            salary: true,
          },
        },
      },
    });
  }

  private async recalculatePayrollTotals(
    payrollId: string,
    db: any = this.prisma,
  ) {
    const stubs: any[] = await db.payStub.findMany({ where: { payrollId } });
    const totalGross = stubs.reduce(
      (acc: number, s: any) => acc + s.grossPay,
      0,
    );
    const totalNet = stubs.reduce((acc: number, s: any) => acc + s.netPay, 0);
    const totalEmployeeTaxes = stubs.reduce(
      (acc: number, s: any) => acc + s.taxes,
      0,
    );
    const totalEmployerTaxes = stubs.reduce(
      (acc: number, s: any) => acc + s.employerTaxes,
      0,
    );
    const totalDeductions = stubs.reduce(
      (acc: number, s: any) => acc + s.deductions,
      0,
    );

    await db.payroll.update({
      where: { id: payrollId },
      data: {
        totalGross: money(totalGross),
        totalNet: money(totalNet),
        totalEmployeeTaxes: money(totalEmployeeTaxes),
        totalEmployerTaxes: money(totalEmployerTaxes),
        totalDeductions: money(totalDeductions),
      },
    });
  }

  async getPayrolls(businessId: string, user?: any): Promise<Payroll[]> {
    if (user) await this.validateBusinessAccess(businessId, user);
    const payrolls = await this.prisma.payroll.findMany({
      where: { businessId, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!payrolls.length) return payrolls;
    const totals = await this.prisma.payStub.groupBy({
      by: ["payrollId"],
      where: { payrollId: { in: payrolls.map((payroll) => payroll.id) } },
      _sum: { grossPay: true, netPay: true, taxes: true, employerTaxes: true, deductions: true },
    });
    const byPayroll = new Map(totals.map((row) => [row.payrollId, row._sum]));
    return payrolls.map((payroll) => {
      const sum = byPayroll.get(payroll.id);
      return sum ? { ...payroll, totalGross: sum.grossPay ?? 0, totalNet: sum.netPay ?? 0,
        totalEmployeeTaxes: sum.taxes ?? 0, totalEmployerTaxes: sum.employerTaxes ?? 0,
        totalDeductions: sum.deductions ?? 0 } : payroll;
    });
  }

  async deletePayroll(id: string, user?: any) {
    const payroll = await this.prisma.payroll.findUnique({ where: { id } });
    if (!payroll) throw new NotFoundException("Payroll not found");

    if (user) {
      await this.validateBusinessAccess(payroll.businessId, user);
    }

    if (payroll.status !== "DRAFT") {
      throw new BadRequestException("Only draft payrolls can be deleted");
    }

    return this.prisma.$transaction(async (tx) => {
      const lock = await tx.payroll.updateMany({
        where: { id, status: "DRAFT", updatedAt: payroll.updatedAt },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1)
        throw new BadRequestException(
          "Payroll changed. Reload before deleting.",
        );
      await tx.payStub.deleteMany({ where: { payrollId: id } });
      await tx.loanRepayment.deleteMany({ where: { payrollId: id } });
      await tx.payroll.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          businessId: payroll.businessId,
          action: "DELETE_PAYROLL_DRAFT",
          resource: "Payroll",
          resourceId: id,
          details: JSON.stringify({ deletedBy: user?.userId }),
        },
      });
      return { deleted: true };
    });
  }

  async getPayrollById(id: string, user?: any): Promise<any> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: {
        payStubs: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                workerType: true,
                payType: true,
                hourlyRate: true,
                salary: true,
                taxState: true,
              },
            },
          },
        },
      },
    });

    if (!payroll) throw new NotFoundException("Payroll not found");

    if (user) {
      await this.validateBusinessAccess(payroll.businessId, user);
    }

    let currentBusiness: any,
      currentEmployees: any[] = [];
    if (payroll.status === "DRAFT") {
      [currentBusiness, currentEmployees] = await Promise.all([
        this.prisma.business.findUnique({ where: { id: payroll.businessId } }),
        this.prisma.employee.findMany({
          where: { id: { in: payroll.payStubs.map((s) => s.employeeId) } },
          include: { w2Profile: true, contractorProfile: true },
        }),
      ]);
    }
    const issues = payroll.payStubs.flatMap((stub: any) => {
      const calc = parseJson(stub.taxDetails).calculation;
      const person = currentEmployees.find((e) => e.id === stub.employeeId);
      const stale =
        payroll.status === "DRAFT" &&
        person &&
        currentBusiness &&
        calc?.fingerprint !==
          this.taxFingerprint(person, currentBusiness, payroll);
      const messages = stale
        ? ["Tax rules or employee settings changed. Recalculate this draft."]
        : stub.workerType === "W2" && !calc?.complete
          ? calc?.issues || [
              "Recalculate this legacy draft using current tax rules.",
            ]
          : [];
      return messages.map(
        (issue: string) =>
          `${stub.employee.firstName} ${stub.employee.lastName}: ${issue}`,
      );
    });
    (payroll as any).taxReadiness = {
      complete: payroll.payStubs.length > 0 && issues.length === 0,
      issues: [...new Set(issues)],
    };
    return payroll;
  }

  private async calculateGrossPay(
    employee: any,
    start: Date,
    end: Date,
    workerType: string,
    payType: string,
    rate: number,
    salary?: number,
    workweekAnchor = new Date("2026-01-04T00:00:00Z"),
  ) {
    if (["SALARY", "SALARIED"].includes(payType)) {
      amount(salary, "Annual salary");
      if (employee.overtimeEligible !== false)
        throw new BadRequestException(
          "Salaried nonexempt overtime requires a reviewed earnings calculation. Confirm exemption or use hourly compensation.",
        );
      if (!PAY_PERIODS[employee.paySchedule])
        throw new BadRequestException("Invalid salary pay frequency.");
      const regularPay = money(salary! / PAY_PERIODS[employee.paySchedule]);
      return {
        grossPay: regularPay,
        regularPay,
        overtimePay: 0,
        regularHours: 0,
        overtimeHours: 0,
        bonus: 0,
        commission: 0,
        reimbursement: 0,
      };
    }
    if (payType !== "HOURLY")
      throw new BadRequestException("Unsupported compensation type.");
    amount(rate, "Hourly rate");
    if (rate === 0)
      throw new BadRequestException(
        "An hourly rate greater than zero is required.",
      );
    const weekMs = 168 * 3600000;
    const queryStart = new Date(
      +workweekAnchor +
        Math.floor((+start - +workweekAnchor) / weekMs) * weekMs,
    );
    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        employeeId: employee.id,
        workerType,
        status: "APPROVED",
        startTime: { lte: end },
        endTime: { gt: queryStart },
      },
      include: { breaks: true },
      orderBy: { startTime: "asc" },
    });
    return calculateHours(
      timesheets,
      start,
      end,
      rate,
      workerType === "W2" && employee.overtimeEligible !== false,
      workweekAnchor,
    );
  }

  private async getPriorStubs(
    employeeId: string,
    payDate: Date,
    workerType: string,
    db: any = this.prisma,
  ): Promise<any[]> {
    return db.payStub.findMany({
      where: {
        employeeId,
        workerType,
        payroll: {
          status: "PAID",
          payDate: {
            gte: new Date(`${payDate.getUTCFullYear()}-01-01T00:00:00Z`),
            lte: payDate,
          },
        },
      },
      orderBy: { payroll: { payDate: "asc" } },
    });
  }

  private async calculateTaxes(
    grossPay: number,
    employee: any,
    ytdGross: number,
    workerType: string,
    payroll: any,
    prior: any[],
  ) {
    if (workerType === "CONTRACTOR_1099")
      return {
        employeeTaxes: 0,
        employerTaxes: 0,
        employeeTaxDetails: {} as any,
        employerTaxDetails: {} as any,
      };
    const profile = employee.payrollTaxProfile
      ? validateTaxProfile(parseJson(employee.payrollTaxProfile))
      : undefined;
    const federal = calculateFederal(
      grossPay,
      employee,
      ytdGross,
      payroll.payDate.getUTCFullYear(),
      profile,
    );
    const config = parseJson(payroll.business.settings).payrollTaxes;
    if (config) validateRules(config);
    const manual = manualTaxes(
      config,
      profile,
      grossPay,
      PAY_PERIODS[employee.paySchedule],
      payroll.payDate,
      prior
        .flatMap((s) => parseJson(s.taxDetails).lines || [])
        .concat(
          prior.flatMap((s) => parseJson(s.employerTaxDetails).lines || []),
        ),
      employee,
    );
    if (prior.some((s) => !parseJson(s.taxDetails).calculation?.complete))
      manual.issues.push(
        "Historical paid wages need a verified tax-basis migration before current state/local wage caps can be calculated.",
      );
    if (config && config.payrollTimeZone !== payroll.calendarTimeZone)
      manual.issues.push(
        "Payroll calendar time zone changed. Create a new draft with the corrected pay-period boundaries.",
      );
    const td: any = federal.employeeTaxDetails;
    td.lines = manual.lines.filter((l) => l.payer === "EMPLOYEE");
    td.stateTax = money(
      td.lines
        .filter((l: any) => l.category === "STATE_INCOME")
        .reduce((n: number, l: any) => n + l.amount, 0),
    );
    td.localTax = money(
      td.lines
        .filter((l: any) => l.category === "LOCAL")
        .reduce((n: number, l: any) => n + l.amount, 0),
    );
    td.otherTax = money(
      td.lines
        .filter((l: any) => !["STATE_INCOME", "LOCAL"].includes(l.category))
        .reduce((n: number, l: any) => n + l.amount, 0),
    );
    td.calculation = {
      ...td.calculation,
      status: manual.issues.length ? "INCOMPLETE" : "MANUAL_RULES",
      complete: manual.issues.length === 0,
      issues: manual.issues,
      rulesSnapshot: config || null,
      ytdGrossBefore: ytdGross,
    };
    const ed: any = federal.employerTaxDetails;
    ed.lines = manual.lines.filter((l) => l.payer === "EMPLOYER");
    ed.calculation = { ...ed.calculation, complete: td.calculation.complete };
    return {
      ...federal,
      employeeTaxes: money(
        federal.employeeTaxes + td.stateTax + td.localTax + td.otherTax,
      ),
      employerTaxes: money(
        federal.employerTaxes +
          ed.lines.reduce((n: number, l: any) => n + l.amount, 0),
      ),
      employeeTaxDetails: td,
      employerTaxDetails: ed,
    };
  }

  async finalizePayroll(payrollId: string, user?: any): Promise<Payroll> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        business: true,
        payStubs: {
          include: {
            employee: { include: { w2Profile: true, contractorProfile: true } },
          },
        },
      },
    });
    if (!payroll) throw new NotFoundException("Payroll not found");
    if (user) await this.validateBusinessAccess(payroll.businessId, user);
    if (payroll.status !== "DRAFT")
      throw new BadRequestException(
        "Payroll already finalized or invalid status.",
      );
    if (!payroll.payStubs.length)
      throw new BadRequestException("Calculate payroll before approval.");
    return this.prisma.$transaction(
      async (tx) => {
        const lock = await tx.payroll.updateMany({
          where: {
            id: payrollId,
            status: "DRAFT",
            updatedAt: payroll.updatedAt,
          },
          data: { status: "PAID", updatedAt: new Date() },
        });
        if (lock.count !== 1)
          throw new BadRequestException(
            "Payroll changed. Reload before approving.",
          );
        await tx.business.update({
          where: { id: payroll.businessId },
          data: { updatedAt: new Date() },
        });
        const currentBusiness = await tx.business.findUniqueOrThrow({
          where: { id: payroll.businessId },
        });
        const currentPeople = new Map<string, any>();
        for (const id of [
          ...new Set(payroll.payStubs.map((s) => s.employeeId)),
        ].sort()) {
          await tx.employee.update({
            where: { id },
            data: { updatedAt: new Date() },
          });
          currentPeople.set(
            id,
            await tx.employee.findUniqueOrThrow({
              where: { id },
              include: { w2Profile: true, contractorProfile: true },
            }),
          );
        }
        // All validation and balance changes share the transaction; any failure rolls back approval.
        for (const stub of payroll.payStubs) {
          const currentEmployee = currentPeople.get(stub.employeeId);
          if (
            stub.workerType === "CONTRACTOR_1099" &&
            (!(
              currentEmployee.contractorProfile?.w9Confirmed ??
              currentEmployee.w9Confirmed
            ) ||
              parseJson(stub.taxDetails).calculation?.fingerprint !==
                this.taxFingerprint(currentEmployee, currentBusiness, payroll))
          )
            throw new BadRequestException(
              "Contractor tax or compensation settings changed. Recalculate before approval.",
            );
          if (stub.workerType === "W2") {
            const calculation = parseJson(stub.taxDetails).calculation;
            if (!calculation?.complete)
              throw new BadRequestException(
                "Payroll has missing state/local or employer tax rules. Review Tax setup and recalculate before approval.",
              );
            if (
              calculation.fingerprint !==
              this.taxFingerprint(currentEmployee, currentBusiness, payroll)
            )
              throw new BadRequestException(
                "Tax rules or employee settings changed. Recalculate payroll before approval.",
              );
            const prior = await this.getPriorStubs(
              stub.employeeId,
              payroll.payDate,
              "W2",
              tx,
            );
            const paidGross = money(
              prior
                .filter((s) => s.payrollId !== payrollId)
                .reduce((n, s) => n + s.grossPay, 0),
            );
            if (paidGross !== calculation.ytdGrossBefore)
              throw new BadRequestException(
                "Year-to-date wages changed. Recalculate payroll before approval.",
              );
            const later = await tx.payStub.findFirst({
              where: {
                employeeId: stub.employeeId,
                workerType: "W2",
                payroll: { status: "PAID", payDate: { gt: payroll.payDate } },
              },
            });
            if (later)
              throw new BadRequestException(
                "A later payroll has already been paid. Historical corrections require a payroll tax provider.",
              );
          }
          const details = parseJson(stub.deductionDetails);
          for (const l of details.loans || []) {
            amount(l.amount, "Loan repayment");
            const changed = await tx.loan.updateMany({
              where: {
                id: l.loanId,
                employeeId: stub.employeeId,
                status: "APPROVED",
                balance: { gte: l.amount },
              },
              data: { balance: { decrement: l.amount } },
            });
            if (changed.count !== 1)
              throw new BadRequestException(
                "Loan balance changed. Recalculate payroll before approval.",
              );
            await tx.loanRepayment.create({
              data: { loanId: l.loanId, payrollId, amount: l.amount },
            });
            await tx.auditLog.create({
              data: {
                businessId: payroll.businessId,
                action: "LOAN_REPAYMENT",
                resource: "Loan",
                resourceId: l.loanId,
                details: JSON.stringify({
                  payrollId,
                  employeeId: stub.employeeId,
                  amount: l.amount,
                }),
              },
            });
            await tx.loan.updateMany({
              where: { id: l.loanId, balance: { lte: 0 } },
              data: { status: "PAID" },
            });
          }
        }
        const leaveTypes = await tx.leaveType.findMany({
          where: { businessId: payroll.businessId },
        });
        for (const stub of payroll.payStubs.filter(
          (s) => s.workerType === "W2",
        ))
          for (const policy of leaveTypes) {
            const rate = policy.accrualRate ?? 0;
            if (!Number.isFinite(rate) || rate < 0)
              throw new BadRequestException("Invalid leave accrual policy.");
            const accrued = policy.accrualFrequency
              ? rate
              : rate * (stub.regularHours + stub.overtimeHours);
            if (!accrued) continue;
            const balance = await tx.leaveBalance.upsert({
              where: {
                employeeId_leaveTypeId: {
                  employeeId: stub.employeeId,
                  leaveTypeId: policy.id,
                },
              },
              create: {
                employeeId: stub.employeeId,
                leaveTypeId: policy.id,
                balanceHours: accrued,
                takenHours: 0,
              },
              update: { balanceHours: { increment: accrued } },
            });
            if (
              policy.maxBalance !== null &&
              balance.balanceHours > policy.maxBalance
            )
              await tx.leaveBalance.update({
                where: { id: balance.id },
                data: { balanceHours: policy.maxBalance },
              });
          }
        await tx.auditLog.create({
          data: {
            businessId: payroll.businessId,
            action: "FINALIZE_PAYROLL",
            resource: "Payroll",
            resourceId: payrollId,
            details: JSON.stringify({
              totalGross: payroll.totalGross,
              totalNet: payroll.totalNet,
              payStubsCount: payroll.payStubs.length,
              approvedBy: user?.userId,
              taxMode: "MANUAL_RULES",
            }),
          },
        });
        return tx.payroll.findUniqueOrThrow({ where: { id: payrollId } });
      },
      { isolationLevel: "Serializable" },
    );
  }

  private async calculateDeductions(
    employeeId: string,
    payrollId: string,
    availableNet: number,
  ): Promise<{ totalDeductions: number; deductionDetails: any }> {
    availableNet = Math.max(0, money(availableNet));
    // Fetch active loans
    const loans = await this.prisma.loan.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        balance: { gt: 0 },
      },
    });

    let totalDeductions = 0;
    const loanDeductions = [];

    for (const loan of loans) {
      // Determine deduction amount
      let amount = money(loan.perPayPeriodDeduction);
      if (!Number.isFinite(amount) || amount < 0)
        throw new BadRequestException("Invalid scheduled loan deduction.");

      // Cap at remaining balance
      if (amount > loan.balance) {
        amount = money(loan.balance);
      }

      // Cap at available net pay (prevent negative paycheck)
      if (totalDeductions + amount > availableNet) {
        amount = money(availableNet - totalDeductions);
        if (amount < 0) amount = 0;
      }

      if (amount > 0) {
        totalDeductions = money(totalDeductions + amount);
        loanDeductions.push({ loanId: loan.id, amount });
      }
    }

    return {
      totalDeductions,
      deductionDetails: {
        loans: loanDeductions,
      },
    };
  }
}
