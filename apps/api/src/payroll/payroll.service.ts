import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Payroll, PayStub, Employee, Timesheet } from '@unitedlinkgroup/database';
import { LeaveService } from '../leave/leave.service';
import { generatePayslipPdfBuffer } from './payslip-pdf';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService, private leave: LeaveService) {}

  async getBusinessId(userId: string): Promise<string> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) return employee.businessId;

    const business = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (business) return business.id;

    throw new BadRequestException('User is not associated with a business');
  }

  async getPayStubsForUser(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) return []; // Return empty if not linked to an employee

    return this.prisma.payStub.findMany({
      where: { 
        employeeId: employee.id,
        payroll: { status: 'PAID' }
      },
      include: {
        payroll: {
          include: {
            business: true
          }
        },
        employee: true
      },
      orderBy: {
        payroll: {
          payDate: 'desc'
        }
      }
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
          status: 'PAID'
        }
      },
      include: {
        payroll: true,
        employee: true
      },
      orderBy: {
        payroll: {
          payDate: 'desc'
        }
      }
    });
  }

  async downloadPayStubPdf(payStubId: string, user: any): Promise<{ filename: string; data: Buffer }> {
    const stub = await this.prisma.payStub.findUnique({
      where: { id: payStubId },
      include: {
        payroll: { include: { business: true } },
        employee: true,
      },
    });

    if (!stub) throw new NotFoundException('Pay stub not found');
    if (stub.payroll?.status !== 'PAID') throw new BadRequestException('Pay stub is not available');

    await this.assertPayStubAccess(stub as any, user);

    const payDate = stub.payroll?.payDate ? new Date(stub.payroll.payDate) : new Date();
    const datePart = Number.isFinite(payDate.getTime()) ? payDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
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
    if (!user) throw new BadRequestException('Access denied');
    if (user.role === 'SUPER_ADMIN') return;

    const payrollBusinessId = stub?.payroll?.businessId;
    if (!payrollBusinessId) throw new BadRequestException('Access denied');

    if (user.role === 'BUSINESS_ADMIN' || user.role === 'MANAGER' || user.role === 'FINANCE') {
      await this.validateBusinessAccess(payrollBusinessId, user);
      return;
    }

    const stubUserId = stub?.employee?.userId;
    if (!stubUserId || stubUserId !== user.userId) throw new BadRequestException('Access denied');
  }

  async getPayrollsForUser(userId: string, user?: any): Promise<Payroll[]> {
    const businessId = await this.getBusinessId(userId);
    return this.getPayrolls(businessId, user);
  }

  async validateBusinessAccess(targetBusinessId: string, user: any) {
    if (user.role === 'SUPER_ADMIN') return;
    
    // Check if owner
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId } });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    // Check if employee of that business
    const employee = await this.prisma.employee.findFirst({ 
        where: { userId: user.userId, businessId: targetBusinessId } 
    });
    if (employee) return;

    throw new BadRequestException('Access denied: You do not have access to this business data');
  }

  async createPayroll(businessId: string, periodStart: Date, periodEnd: Date, payDate: Date, type: string = 'REGULAR', user?: any): Promise<Payroll> {
    if (user) {
        await this.validateBusinessAccess(businessId, user);
    }

    // Prevent duplicate payroll runs for the same period
    const existing = await this.prisma.payroll.findFirst({
      where: {
        businessId,
        periodStart: { equals: periodStart },
        periodEnd: { equals: periodEnd },
        status: { not: 'CANCELLED' }
      }
    });

    if (existing) {
      if (existing.status === 'DRAFT') {
        return existing; // Return existing draft instead of erroring
      }
      throw new BadRequestException('A payroll run for this period already exists.');
    }

    return this.prisma.payroll.create({
      data: {
        businessId,
        periodStart,
        periodEnd,
        payDate,
        type,
        status: 'DRAFT',
      },
    });
  }

  async getAnnualTaxReport(businessId: string, year: number, user?: any) {
    if (user) {
        await this.validateBusinessAccess(businessId, user);
    }

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const payStubs = await this.prisma.payStub.findMany({
      where: {
        payroll: {
          businessId,
          payDate: {
            gte: startOfYear,
            lte: endOfYear
          },
          status: 'PAID'
        }
      },
      include: {
        employee: true
      }
    });

    // Group by Employee and WorkerType
    const w2Totals: Record<string, any> = {};
    const contractorTotals: Record<string, any> = {};

    const initTotal = (emp: any) => ({
       employee: emp,
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
         futa: 0,
         dcUi: 0,
         dcPfl: 0
       }
    });

    for (const stub of payStubs) {
       const eid = stub.employeeId;
       const is1099 = stub.workerType === 'CONTRACTOR_1099';
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
         entry.breakdown.federalTax += (td.federalTax || 0);
         entry.breakdown.socialSecurity += (td.socialSecurity || 0);
         entry.breakdown.medicare += (td.medicare || 0);
         entry.breakdown.stateTax += (td.stateTax || 0);
       }
       if (stub.employerTaxDetails) {
         const etd = JSON.parse(stub.employerTaxDetails);
         entry.breakdown.futa += (etd.futa || 0);
         entry.breakdown.dcUi += (etd.dcUi || 0);
         entry.breakdown.dcPfl += (etd.dcPfl || 0);
       }
    }

    // Include ALL Active Employees (even if no pay stubs)
    const activeEmployees = await this.prisma.employee.findMany({
      where: {
        businessId,
        status: 'ACTIVE',
        role: { notIn: ['SUPER_ADMIN', 'BUSINESS_ADMIN'] as any }
      }
    });

    for (const emp of activeEmployees) {
      if (emp.workerType === 'W2' || emp.workerType === 'BOTH') {
          if (!w2Totals[emp.id]) w2Totals[emp.id] = initTotal(emp);
      }
      if (emp.workerType === 'CONTRACTOR_1099' || emp.workerType === 'BOTH') {
          if (!contractorTotals[emp.id]) contractorTotals[emp.id] = initTotal(emp);
      }
    }

    const w2Employees = Object.values(w2Totals);
    const contractors = Object.values(contractorTotals);

    return {
      year,
      w2Employees,
      contractors, // For 1099-NEC
      summary: {
         totalW2Gross: w2Employees.reduce((sum: number, e: any) => sum + e.grossPay, 0),
         total1099Gross: contractors.reduce((sum: number, e: any) => sum + e.grossPay, 0),
         totalTaxesWithheld: w2Employees.reduce((sum: number, e: any) => sum + e.taxes, 0),
         totalEmployerTaxes: w2Employees.reduce((sum: number, e: any) => sum + e.employerTaxes, 0)
      }
    };
  }

  async getYearEndForms(businessId: string, year: number, user?: any) {
    if (user) {
        await this.validateBusinessAccess(businessId, user);
    }

    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const report = await this.getAnnualTaxReport(businessId, year, user);
    
    // W-2 Mapping
    const w2s = report.w2Employees.map((e: any) => ({
      employeeId: e.employee.id,
      ssn: e.employee.ssn,
      name: `${e.employee.firstName} ${e.employee.lastName}`,
      address: `${e.employee.address || ''}, ${e.employee.city || ''}, ${e.employee.state || ''} ${e.employee.zip || ''}`,
      wages: e.grossPay,
      fedIncomeTax: e.breakdown.federalTax,
      socialSecurityWages: Math.min(e.grossPay, 168600), // 2024 Cap
      socialSecurityTax: e.breakdown.socialSecurity,
      medicareWages: e.grossPay,
      medicareTax: e.breakdown.medicare,
      stateWages: e.grossPay,
      stateIncomeTax: e.breakdown.stateTax,
      employerName: business.name,
      employerEin: business.ein,
      employerAddress: `${business.address || ''}, ${business.city || ''}, ${business.state || ''} ${business.zip || ''}`
    }));

    // 1099-NEC Mapping
    const nec1099s = report.contractors.map((c: any) => ({
      contractorId: c.employee.id,
      tin: c.employee.ssn,
      name: `${c.employee.firstName} ${c.employee.lastName}`,
      address: `${c.employee.address || ''}, ${c.employee.city || ''}, ${c.employee.state || ''} ${c.employee.zip || ''}`,
      nonemployeeCompensation: c.grossPay,
      fedTaxWithheld: 0,
      stateTaxWithheld: 0,
      payerName: business.name,
      payerTin: business.ein,
      payerAddress: `${business.address || ''}, ${business.city || ''}, ${business.state || ''} ${business.zip || ''}`
    }));

    return { year, w2s, nec1099s };
  }

  async runPayrollCalculation(payrollId: string, user?: any): Promise<any> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { business: true },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    if (user) {
        await this.validateBusinessAccess(payroll.businessId, user);
    }

    // Reset: Delete existing paystubs for this payroll to prevent duplicates
    await this.prisma.payStub.deleteMany({
      where: { payrollId }
    });

    // Accrue leave for the payroll period before computing pay
    const accrualSummary = await this.leave.accrueForPayrollPeriod(
      payroll.businessId,
      payroll.periodStart,
      payroll.periodEnd,
      user
    );

    const employees = await this.prisma.employee.findMany({
      where: { 
        businessId: payroll.businessId,
        status: 'ACTIVE',
        role: { notIn: ['SUPER_ADMIN', 'BUSINESS_ADMIN'] as any }
      },
      include: {
        w2Profile: true,
        contractorProfile: true
      }
    });

    const payStubs = [];
    let payrollTotalGross = 0;
    let payrollTotalNet = 0;
    let payrollTotalEmployeeTaxes = 0;
    let payrollTotalEmployerTaxes = 0;
    let payrollTotalDeductions = 0;

    for (const employee of employees) {
      // Handle W-2 Role (if W2 or BOTH)
      if (employee.workerType === 'W2' || employee.workerType === 'BOTH') {
          // Validation: Block if W-2 and missing address/state
          if (!employee.state && !employee.address && !employee.taxState) {
              throw new BadRequestException(`Payroll Blocked: Employee ${employee.firstName} ${employee.lastName} is missing address/state required for tax calculation.`);
          }
          if (!employee.filingStatus) {
              throw new BadRequestException(`Payroll Blocked: Employee ${employee.firstName} ${employee.lastName} is missing Filing Status (W-4).`);
          }

          // Determine Rate (Prefer Profile, fallback to Employee root fields)
          const rate = employee.w2Profile?.rate || employee.hourlyRate || 0;
          const salary = employee.w2Profile?.payType === 'SALARY' ? employee.w2Profile.rate : (employee.salary ?? undefined);
          const payType = employee.w2Profile?.payType || employee.payType;

          // 1. Calculate Gross Pay
          const { grossPay, regularPay, overtimePay, regularHours, overtimeHours, bonus, commission, reimbursement } = await this.calculateGrossPay(
              employee, 
              payroll.periodStart, 
              payroll.periodEnd, 
              'W2',
              payType,
              rate,
              salary
          );
          
          // Get YTD Gross for Tax Caps
          const year = new Date(payroll.payDate).getFullYear();
          const ytdGross = await this.getYTDGross(employee.id, year, 'W2');
          const ytdTaxes = await this.getYTDTaxes(employee.id, year, 'W2');

          // 2. Calculate Taxes (Employee & Employer)
          const { employeeTaxes, employerTaxes, employeeTaxDetails, employerTaxDetails } = this.calculateTaxes(grossPay, employee, ytdGross, 'W2');
          
          // 3. Calculate Deductions (Loans, Benefits, etc.)
          const { totalDeductions, deductionDetails } = await this.calculateDeductions(employee.id, payroll.id, grossPay - employeeTaxes);
          
          const netPay = grossPay - employeeTaxes - totalDeductions + reimbursement;

          // Update Payroll Totals
          payrollTotalGross += grossPay;
          payrollTotalNet += netPay;
          payrollTotalEmployeeTaxes += employeeTaxes;
          payrollTotalEmployerTaxes += employerTaxes;
          payrollTotalDeductions += totalDeductions;

          const payStub = await this.prisma.payStub.create({
            data: {
              payrollId: payroll.id,
              employeeId: employee.id,
              workerType: 'W2',
              grossPay,
              taxes: employeeTaxes,
              employerTaxes,
              deductions: totalDeductions,
              netPay,
              
              regularHours,
              overtimeHours,
              regularPay,
              overtimePay,
              bonus,
              commission,
              reimbursement,

              ytdGross: ytdGross + grossPay,
              ytdNet: 0,
              ytdTaxes: ytdTaxes + employeeTaxes,

              taxDetails: JSON.stringify(employeeTaxDetails),
              employerTaxDetails: JSON.stringify(employerTaxDetails),
              deductionDetails: JSON.stringify(deductionDetails),
            },
          });
          payStubs.push(payStub);
      }

      // Handle 1099 Role (if CONTRACTOR_1099 or BOTH)
      if (employee.workerType === 'CONTRACTOR_1099' || employee.workerType === 'BOTH') {
          const rate = employee.contractorProfile?.rate || employee.hourlyRate || 0;
          
          // 1. Calculate Gross Pay (1099 Logic)
          const { grossPay, regularPay, overtimePay, regularHours, overtimeHours, bonus, commission, reimbursement } = await this.calculateGrossPay(
              employee, 
              payroll.periodStart, 
              payroll.periodEnd, 
              'CONTRACTOR_1099',
              'HOURLY', // Contractors are usually hourly/unit based here
              rate,
              undefined // No salary for contractors in this context usually
          );

          // No Taxes for 1099
          const employeeTaxes = 0;
          const employerTaxes = 0;
          const totalDeductions = 0; // Usually no deductions for contractors? Or maybe reimbursements only.
          const netPay = grossPay + reimbursement; // Gross + Reimbursement

          // Update Payroll Totals
          payrollTotalGross += grossPay;
          payrollTotalNet += netPay;
          
          const year = new Date(payroll.payDate).getFullYear();
          const ytdGross = await this.getYTDGross(employee.id, year, 'CONTRACTOR_1099');

          const payStub = await this.prisma.payStub.create({
            data: {
              payrollId: payroll.id,
              employeeId: employee.id,
              workerType: 'CONTRACTOR_1099',
              grossPay,
              taxes: 0,
              employerTaxes: 0,
              deductions: 0,
              netPay,
              
              regularHours,
              overtimeHours: 0,
              regularPay,
              overtimePay: 0,
              bonus,
              commission,
              reimbursement,

              ytdGross: ytdGross + grossPay,
              ytdNet: 0,
              ytdTaxes: 0,

              taxDetails: JSON.stringify({}),
              employerTaxDetails: JSON.stringify({}),
              deductionDetails: JSON.stringify({}),
            },
          });
          payStubs.push(payStub);
      }
    }

    // Update payroll status and totals
    await this.prisma.payroll.update({
      where: { id: payrollId },
      data: { 
        status: 'DRAFT', // Keep as DRAFT until finalized
        totalGross: payrollTotalGross,
        totalNet: payrollTotalNet,
        totalEmployeeTaxes: payrollTotalEmployeeTaxes,
        totalEmployerTaxes: payrollTotalEmployerTaxes,
        totalDeductions: payrollTotalDeductions
      },
    });

    return { payroll, payStubs, accrual: accrualSummary };
  }

  async updatePayStub(stubId: string, updates: { 
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
  }, user?: any) {
    const stub = await this.prisma.payStub.findUnique({ 
        where: { id: stubId }, 
        include: { employee: true, payroll: true } 
    });
    
    if (!stub) throw new NotFoundException('PayStub not found');

    if (user) {
        await this.validateBusinessAccess(stub.payroll.businessId, user);
    }

    let newGross = 0;
    let regularPay = 0;
    let overtimePay = 0;
    const regularHours = updates.regularHours ?? stub.regularHours;
    const overtimeHours = updates.overtimeHours ?? stub.overtimeHours;
    
    if (stub.employee.payType === 'HOURLY') {
        const rate = stub.employee.hourlyRate || 0;
        regularPay = regularHours * rate;
        overtimePay = overtimeHours * rate * 1.5;
        newGross = regularPay + overtimePay;
    } else {
        // Salary: Base Pay is constant unless we allow override.
        // For now, keep original Regular Pay, but allow Bonus/Commission additions.
        regularPay = stub.regularPay;
        overtimePay = 0; 
        newGross = regularPay;
    }
    
    const bonus = updates.bonus ?? stub.bonus;
    const commission = updates.commission ?? stub.commission;
    const reimbursement = updates.reimbursement ?? stub.reimbursement;
    
    newGross += bonus + commission;
    
    // Recalculate Taxes or Use Manual Overrides
    let employeeTaxes = 0;
    let employerTaxes = 0;
    let employeeTaxDetails: any = {};
    let employerTaxDetails: any = {};

    // Calculate YTD Gross for tax brackets
    const year = stub.payroll.payDate.getFullYear();
    const ytdGross = await this.getYTDGross(stub.employeeId, year, stub.workerType);

    // Check if any tax override is provided
    const isTaxOverride = updates.federalTax !== undefined || 
                          updates.socialSecurity !== undefined || 
                          updates.medicare !== undefined || 
                          updates.stateTax !== undefined;

    if (isTaxOverride) {
        // Recalculate first to get defaults for missing overrides
        const calculated = this.calculateTaxes(newGross, stub.employee, ytdGross, stub.workerType); // Use calculated YTD
        
        // Apply Overrides
        employeeTaxDetails = { ...calculated.employeeTaxDetails, manualOverride: true };
        
        if (updates.federalTax !== undefined) employeeTaxDetails.federalTax = updates.federalTax;
        if (updates.socialSecurity !== undefined) employeeTaxDetails.socialSecurity = updates.socialSecurity;
        if (updates.medicare !== undefined) employeeTaxDetails.medicare = updates.medicare;
        if (updates.stateTax !== undefined) employeeTaxDetails.stateTax = updates.stateTax;
        
        // Re-sum employee taxes
        employeeTaxes = (employeeTaxDetails.federalTax || 0) + 
                        (employeeTaxDetails.socialSecurity || 0) + 
                        (employeeTaxDetails.medicare || 0) + 
                        (employeeTaxDetails.stateTax || 0);
                        
        // Employer taxes remain auto-calculated
        employerTaxes = calculated.employerTaxes;
        employerTaxDetails = calculated.employerTaxDetails;
        
    } else {
        // Check for previous manual override
        let isManualTax = false;
        try {
            const existingTaxDetails = stub.taxDetails ? JSON.parse(stub.taxDetails) : {};
            if (existingTaxDetails.manualOverride) {
                isManualTax = true;
                employeeTaxDetails = existingTaxDetails;
                employeeTaxes = stub.taxes;
                
                // Recalculate employer taxes based on new gross
                const calculated = this.calculateTaxes(newGross, stub.employee, stub.ytdGross, stub.workerType);
                employerTaxes = calculated.employerTaxes;
                employerTaxDetails = calculated.employerTaxDetails;
            }
        } catch(e) {}

        if (!isManualTax) {
            const calculated = this.calculateTaxes(newGross, stub.employee, stub.ytdGross, stub.workerType);
            employeeTaxes = calculated.employeeTaxes;
            employerTaxes = calculated.employerTaxes;
            employeeTaxDetails = calculated.employeeTaxDetails;
            employerTaxDetails = calculated.employerTaxDetails;
        }
    }
    
    // Recalculate Deductions
    let totalDeductions = 0;
    let deductionDetails = {};

    if (updates.deductions !== undefined) {
      // Manual override provided
      totalDeductions = updates.deductions;
      try {
        const existingDetails = stub.deductionDetails ? JSON.parse(stub.deductionDetails) : {};
        deductionDetails = { ...existingDetails, manualOverride: true, total: totalDeductions };
      } catch (e) {
        deductionDetails = { manualOverride: true, total: totalDeductions };
      }
    } else {
      // Check if previously manual
      let isManual = false;
      try {
         const existingDetails = stub.deductionDetails ? JSON.parse(stub.deductionDetails) : {};
         if (existingDetails.manualOverride) {
            isManual = true;
            totalDeductions = stub.deductions;
            deductionDetails = existingDetails;
         }
      } catch (e) {
         // ignore
      }

      if (!isManual) {
        // Recalculate (Auto)
        const calcResult = await this.calculateDeductions(stub.employee.id, stub.payrollId, newGross - employeeTaxes);
        totalDeductions = calcResult.totalDeductions;
        deductionDetails = calcResult.deductionDetails;
      }
    }
    
    const netPay = newGross - employeeTaxes - totalDeductions + reimbursement;
    
    // Update Stub
    const updatedStub = await this.prisma.payStub.update({
        where: { id: stubId },
        data: {
            regularHours,
            overtimeHours,
            regularPay,
            overtimePay,
            bonus,
            commission,
            reimbursement,
            grossPay: newGross,
            taxes: employeeTaxes,
            employerTaxes,
            deductions: totalDeductions,
            netPay,
            taxDetails: JSON.stringify(employeeTaxDetails),
            employerTaxDetails: JSON.stringify(employerTaxDetails),
            deductionDetails: JSON.stringify(deductionDetails)
        }
    });
    
    // Update Payroll Totals
    await this.recalculatePayrollTotals(stub.payrollId);
    
    return updatedStub;
  }

  private async recalculatePayrollTotals(payrollId: string) {
    const stubs = await this.prisma.payStub.findMany({ where: { payrollId } });
    const totalGross = stubs.reduce((acc, s) => acc + s.grossPay, 0);
    const totalNet = stubs.reduce((acc, s) => acc + s.netPay, 0);
    const totalEmployeeTaxes = stubs.reduce((acc, s) => acc + s.taxes, 0);
    const totalEmployerTaxes = stubs.reduce((acc, s) => acc + s.employerTaxes, 0);
    const totalDeductions = stubs.reduce((acc, s) => acc + s.deductions, 0);
    
    await this.prisma.payroll.update({
        where: { id: payrollId },
        data: { totalGross, totalNet, totalEmployeeTaxes, totalEmployerTaxes, totalDeductions }
    });
  }

  async getPayrolls(businessId: string, user?: any): Promise<Payroll[]> {
    if (user) {
        await this.validateBusinessAccess(businessId, user);
    }
    return this.prisma.payroll.findMany({
      where: { businessId, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deletePayroll(id: string, user?: any) {
    const payroll = await this.prisma.payroll.findUnique({ where: { id } });
    if (!payroll) throw new NotFoundException('Payroll not found');
    
    if (user) {
        await this.validateBusinessAccess(payroll.businessId, user);
    }

    if (payroll.status !== 'DRAFT' && payroll.status !== 'PROCESSED') {
        throw new BadRequestException('Only draft payrolls can be deleted');
    }

    // Delete associated records in transaction
    return this.prisma.$transaction([
        this.prisma.payStub.deleteMany({ where: { payrollId: id } }),
        this.prisma.loanRepayment.deleteMany({ where: { payrollId: id } }),
        this.prisma.payroll.delete({ where: { id } })
    ]);
  }

  async getPayrollById(id: string, user?: any): Promise<any> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: {
        payStubs: {
          include: {
            employee: true
          }
        }
      }
    });

    if (!payroll) throw new NotFoundException('Payroll not found');
    
    if (user) {
        await this.validateBusinessAccess(payroll.businessId, user);
    }

    const filtered = (payroll.payStubs || []).filter((s: any) => !['SUPER_ADMIN', 'BUSINESS_ADMIN'].includes(String(s?.employee?.role || '').toUpperCase()));
    const totalGross = filtered.reduce((acc: number, s: any) => acc + (s?.grossPay || 0), 0);
    const totalNet = filtered.reduce((acc: number, s: any) => acc + (s?.netPay || 0), 0);
    const totalEmployeeTaxes = filtered.reduce((acc: number, s: any) => acc + (s?.taxes || 0), 0);
    const totalEmployerTaxes = filtered.reduce((acc: number, s: any) => acc + (s?.employerTaxes || 0), 0);
    const totalDeductions = filtered.reduce((acc: number, s: any) => acc + (s?.deductions || 0), 0);
    (payroll as any).payStubs = filtered;
    (payroll as any).totalGross = totalGross;
    (payroll as any).totalNet = totalNet;
    (payroll as any).totalEmployeeTaxes = totalEmployeeTaxes;
    (payroll as any).totalEmployerTaxes = totalEmployerTaxes;
    (payroll as any).totalDeductions = totalDeductions;

    return payroll;
  }

  private async calculateGrossPay(
    employee: Employee, 
    start: Date, 
    end: Date,
    workerType: string,
    payType: string,
    rate: number,
    salary?: number
  ): Promise<{ 
    grossPay: number, 
    regularPay: number, 
    overtimePay: number, 
    regularHours: number, 
    overtimeHours: number,
    bonus: number,
    commission: number,
    reimbursement: number
  }> {
    // Default return
    const result = { 
      grossPay: 0, 
      regularPay: 0, 
      overtimePay: 0, 
      regularHours: 0, 
      overtimeHours: 0,
      bonus: 0,
      commission: 0,
      reimbursement: 0
    };

    if (payType === 'SALARY' && salary) {
      let divisors: Record<string, number> = {
        'WEEKLY': 52,
        'BI_WEEKLY': 26,
        'SEMI_MONTHLY': 24,
        'MONTHLY': 12
      };
      const divisor = divisors[employee.paySchedule || 'BI_WEEKLY'] || 24;
      
      result.grossPay = salary / divisor;
      result.regularPay = result.grossPay;
      return result;
    } 
    
    if (payType === 'HOURLY' && rate) {
      const timesheets = await this.prisma.timesheet.findMany({
        where: {
          employeeId: employee.id,
          workerType: workerType,
          startTime: { 
            gte: start, 
            lte: end 
          },
          status: 'APPROVED',
        },
        include: { breaks: true }
      });

      // Calculate total hours
      let totalHours = 0;
      timesheets.forEach((ts) => {
        if (ts.endTime) {
          let durationMs = ts.endTime.getTime() - ts.startTime.getTime();
          // Deduct breaks
          if (ts.breaks && ts.breaks.length > 0) {
             ts.breaks.forEach(b => {
                 if (b.endTime) {
                     const t = String((b as any).type || '').toUpperCase();
                     const isUnpaid = t !== 'PAID';
                     if (isUnpaid) durationMs -= (b.endTime.getTime() - b.startTime.getTime());
                 }
             });
          }
          const durationHours = durationMs / (1000 * 60 * 60);
          totalHours += durationHours;
        }
      });

      // OT Logic
      // W-2 Employees: Apply OT rules (Weekly > 40)
    if (workerType === 'CONTRACTOR_1099') {
        result.regularHours = totalHours;
        result.regularPay = totalHours * rate;
        result.grossPay = result.regularPay;
        return result;
    }

    // Bucket hours by Week (Starting Sunday)
    const weeklyHours: Record<string, number> = {};
    
    timesheets.forEach(ts => {
        if (!ts.endTime) return;
        
        let durationMs = ts.endTime.getTime() - ts.startTime.getTime();
        if (ts.breaks) {
            ts.breaks.forEach(b => { 
                if (b.endTime) {
                  const t = String((b as any).type || '').toUpperCase();
                  const isUnpaid = t !== 'PAID';
                  if (isUnpaid) durationMs -= (b.endTime.getTime() - b.startTime.getTime());
                }
            });
        }
        const hours = durationMs / (1000 * 60 * 60);

        const date = new Date(ts.startTime);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const weekStart = new Date(date.setDate(diff));
        weekStart.setHours(0,0,0,0);
        const weekKey = weekStart.toISOString().split('T')[0];

        weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + hours;
    });

    let regHours = 0;
    let otHours = 0;

    const isEligible = (employee.overtimeEligible ?? true) && workerType !== 'CONTRACTOR_1099';

    Object.values(weeklyHours).forEach(weekTotal => {
        if (isEligible && weekTotal > 40) {
            regHours += 40;
            otHours += (weekTotal - 40);
        } else {
            regHours += weekTotal;
        }
    });

    result.regularHours = regHours;
    result.overtimeHours = otHours;
    result.regularPay = regHours * rate;
    result.overtimePay = otHours * rate * 1.5;
    result.grossPay = result.regularPay + result.overtimePay;
    
    return result;
    }
    
    return result;
  }

  private async getYTDGross(employeeId: string, year: number, workerType?: string): Promise<number> {
    const where: any = {
      employeeId,
      payroll: {
        payDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        },
        status: 'PAID'
      }
    };
    
    if (workerType) {
        where.workerType = workerType;
    }

    const stubs = await this.prisma.payStub.findMany({
      where,
      select: { grossPay: true }
    });
    return stubs.reduce((acc, stub) => acc + stub.grossPay, 0);
  }

  private async getYTDTaxes(employeeId: string, year: number, workerType?: string): Promise<number> {
    const where: any = {
      employeeId,
      payroll: {
        payDate: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`)
        },
        status: 'PAID'
      }
    };

    if (workerType) {
        where.workerType = workerType;
    }

    const stubs = await this.prisma.payStub.findMany({
      where,
      select: { taxes: true }
    });
    return stubs.reduce((acc, stub) => acc + stub.taxes, 0);
  }

  private calculateTaxes(grossPay: number, employee: Employee, ytdGross: number, workerType: string): { employeeTaxes: number; employerTaxes: number; employeeTaxDetails: any; employerTaxDetails: any } {
    const details = {
        employeeTaxes: 0,
        employerTaxes: 0,
        employeeTaxDetails: { socialSecurity: 0, medicare: 0, federalTax: 0, stateTax: 0 },
        employerTaxDetails: { socialSecurity: 0, medicare: 0 }
    };

    // 1099 Contractors: No Taxes Withheld
    if (workerType === 'CONTRACTOR_1099') {
        return details;
    }

    // W-2 Employees
    
    // --- Employee Taxes ---
    
    // 1. Social Security (6.2%)
    // Cap: $168,600 (2024)
    const ssRate = 0.062;
    const ssCap = 168600;
    const remainingSSCap = Math.max(0, ssCap - ytdGross);
    const ssTaxable = Math.min(grossPay, remainingSSCap);
    details.employeeTaxDetails.socialSecurity = ssTaxable * ssRate;

    // 2. Medicare (1.45%)
    // Additional Medicare Tax: 0.9% on wages > $200,000 (Single)
    const medRate = 0.0145;
    const addlMedRate = 0.009;
    const addlMedThreshold = 200000;
    
    let medTax = grossPay * medRate;
    
    // Check for Additional Medicare Tax
    if (ytdGross + grossPay > addlMedThreshold) {
        const taxableForAddl = (ytdGross + grossPay) - Math.max(ytdGross, addlMedThreshold);
        medTax += taxableForAddl * addlMedRate;
    }
    details.employeeTaxDetails.medicare = medTax;

    // 3. Federal Income Tax (FED WTH)
    // Uses W-4 Data: Filing Status, Allowances (not used in post-2020 W-4 but kept for legacy logic if needed), Additional Withholding
    let divisors: Record<string, number> = { 'WEEKLY': 52, 'BI_WEEKLY': 26, 'SEMI_MONTHLY': 24, 'MONTHLY': 12 };
    const payPeriods = divisors[employee.paySchedule || 'BI_WEEKLY'] || 24;
    const annualGross = grossPay * payPeriods;
    
    // 2024 Standard Deductions
    let standardDeduction = 14600; // Single / Married Filing Separately
    const status = (employee.filingStatus || 'SINGLE').toUpperCase();
    
    if (status === 'MARRIED_JOINT') {
        standardDeduction = 29200;
    } else if (status === 'HEAD_OF_HOUSEHOLD') {
        standardDeduction = 21900;
    }
    
    const taxableIncome = Math.max(0, annualGross - standardDeduction);
    
    let annualFedTax = 0;
    
    // 2024 Tax Brackets
    if (status === 'MARRIED_JOINT') {
         if (taxableIncome <= 23200) annualFedTax = taxableIncome * 0.10;
         else if (taxableIncome <= 94300) annualFedTax = 2320 + (taxableIncome - 23200) * 0.12;
         else if (taxableIncome <= 201050) annualFedTax = 10852 + (taxableIncome - 94300) * 0.22;
         else if (taxableIncome <= 383900) annualFedTax = 34337 + (taxableIncome - 201050) * 0.24;
         else if (taxableIncome <= 487450) annualFedTax = 78221 + (taxableIncome - 383900) * 0.32;
         else annualFedTax = 111357 + (taxableIncome - 487450) * 0.35;
    } else {
         // Single / MFS / HOH (Simplified HOH to Single for MVP, usually HOH is wider)
         if (taxableIncome <= 11600) annualFedTax = taxableIncome * 0.10;
         else if (taxableIncome <= 47150) annualFedTax = 1160 + (taxableIncome - 11600) * 0.12;
         else if (taxableIncome <= 100525) annualFedTax = 5426 + (taxableIncome - 47150) * 0.22;
         else if (taxableIncome <= 191950) annualFedTax = 17168.5 + (taxableIncome - 100525) * 0.24;
         else if (taxableIncome <= 243725) annualFedTax = 39110.5 + (taxableIncome - 191950) * 0.32;
         else annualFedTax = 55678.5 + (taxableIncome - 243725) * 0.35;
    }
    
    let fedTax = annualFedTax / payPeriods;
    
    // Add Additional Withholding (per pay period)
    if (employee.additionalWithholding) {
        fedTax += employee.additionalWithholding;
    }
    
    details.employeeTaxDetails.federalTax = Math.max(0, fedTax);

    // 4. State Income Tax (STATE)
    const state = (employee.taxState || employee.state || '').toUpperCase();
    
    if (['FL', 'TX', 'NV', 'SD', 'WA', 'TN', 'WY', 'NH'].includes(state)) {
        // No Income Tax
        details.employeeTaxDetails.stateTax = 0;
    } else if (state === 'DC') {
        // DC Logic (Simplified)
        const dcTaxable = Math.max(0, annualGross - 13700);
        let annualDcTax = 0;
        if (dcTaxable <= 10000) annualDcTax = dcTaxable * 0.04;
        else if (dcTaxable <= 40000) annualDcTax = 400 + (dcTaxable - 10000) * 0.06;
        else if (dcTaxable <= 60000) annualDcTax = 2200 + (dcTaxable - 40000) * 0.065;
        else annualDcTax = 3500 + (dcTaxable - 60000) * 0.085;
        
        details.employeeTaxDetails.stateTax = annualDcTax / payPeriods;
    } else {
         // Default Fallback (5%) for MVP
         details.employeeTaxDetails.stateTax = grossPay * 0.05;
    }

    // Sum Employee Taxes
    details.employeeTaxes = 
        details.employeeTaxDetails.socialSecurity + 
        details.employeeTaxDetails.medicare + 
        details.employeeTaxDetails.federalTax + 
        details.employeeTaxDetails.stateTax;


    // --- Employer Taxes ---
    // 1. Social Security Match (6.2%)
    details.employerTaxDetails.socialSecurity = details.employeeTaxDetails.socialSecurity;

    // 2. Medicare Match (1.45%)
    // Employer pays 1.45% on ALL wages (no Addl Tax)
    details.employerTaxDetails.medicare = grossPay * 0.0145;

    // Sum Employer Taxes
    details.employerTaxes = 
        details.employerTaxDetails.socialSecurity + 
        details.employerTaxDetails.medicare;

    return details;
  }

  async finalizePayroll(payrollId: string, user?: any): Promise<Payroll> {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { payStubs: true }
    });
    
    if (!payroll) throw new NotFoundException('Payroll not found');

    if (user) {
        await this.validateBusinessAccess(payroll.businessId, user);
    }

    if (payroll.status !== 'PROCESSED' && payroll.status !== 'DRAFT') { // Allow finalizing from processed/draft
         throw new BadRequestException('Payroll already finalized or invalid status');
    }

    // 1. Commit Deductions (Loans)
    for (const stub of payroll.payStubs) {
        if (stub.deductionDetails) {
            const details = JSON.parse(stub.deductionDetails as string);
            if (details.loans && Array.isArray(details.loans)) {
                for (const loanDed of details.loans) {
                     await this.prisma.loanRepayment.create({
                         data: {
                             loanId: loanDed.loanId,
                             payrollId: payroll.id,
                             amount: loanDed.amount
                         }
                     });
                     
                     // Update Balance
                    await this.prisma.loan.update({
                        where: { id: loanDed.loanId },
                        data: {
                            balance: { decrement: loanDed.amount }
                        }
                    });
                     
                    const loan = await this.prisma.loan.findUnique({ where: { id: loanDed.loanId }});
                    
                    await this.prisma.auditLog.create({
                        data: {
                            businessId: payroll.businessId,
                            action: 'LOAN_REPAYMENT',
                            resource: 'Loan',
                            resourceId: loanDed.loanId,
                            details: JSON.stringify({
                                payrollId: payroll.id,
                                employeeId: loan?.employeeId,
                                amount: loanDed.amount,
                                newBalance: loan?.balance
                            })
                        }
                    });
                    
                    if (loan && loan.balance <= 0) {
                        await this.prisma.loan.update({
                            where: { id: loanDed.loanId },
                            data: { status: 'PAID' }
                        });
                        
                        await this.prisma.auditLog.create({
                            data: {
                                businessId: payroll.businessId,
                                action: 'LOAN_PAID',
                                resource: 'Loan',
                                resourceId: loanDed.loanId,
                                details: JSON.stringify({
                                    payrollId: payroll.id,
                                    employeeId: loan.employeeId
                                })
                            }
                        });
                    }
                }
            }
        }
    }

  // 2. Update Payroll Status
    const updatedPayroll = await this.prisma.payroll.update({
        where: { id: payrollId },
        data: { status: 'PAID' }
    });

    // 3. Create Audit Log
    await this.prisma.auditLog.create({
        data: {
            businessId: payroll.businessId,
            action: 'FINALIZE_PAYROLL',
            resource: 'Payroll',
            resourceId: payroll.id,
            details: JSON.stringify({ 
                totalGross: payroll.totalGross, 
                totalNet: payroll.totalNet,
                payStubsCount: payroll.payStubs.length
            })
        }
    });

    return updatedPayroll;
  }

  private async calculateDeductions(employeeId: string, payrollId: string, availableNet: number): Promise<{ totalDeductions: number; deductionDetails: any }> {
    // Fetch active loans
    const loans = await this.prisma.loan.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        balance: { gt: 0 },
      },
    });

    let totalDeductions = 0;
    const loanDeductions = [];

    for (const loan of loans) {
      // Determine deduction amount
      let amount = loan.perPayPeriodDeduction;
      
      // Cap at remaining balance
      if (amount > loan.balance) {
        amount = loan.balance;
      }

      // Cap at available net pay (prevent negative paycheck)
      if (totalDeductions + amount > availableNet) {
         amount = availableNet - totalDeductions;
         if (amount < 0) amount = 0;
      }

      if (amount > 0) {
        totalDeductions += amount;
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
