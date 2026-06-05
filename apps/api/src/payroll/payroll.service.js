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
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const payslip_pdf_1 = require("./payslip-pdf");
let PayrollService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PayrollService = _classThis = class {
        constructor(prisma, leave) {
            this.prisma = prisma;
            this.leave = leave;
        }
        async getBusinessId(userId) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee)
                return employee.businessId;
            const business = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (business)
                return business.id;
            throw new common_1.BadRequestException('User is not associated with a business');
        }
        async getPayStubsForUser(userId) {
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                return []; // Return empty if not linked to an employee
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
        async getBusinessPayStubs(businessId, user) {
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
        async downloadPayStubPdf(payStubId, user) {
            var _a, _b, _c;
            const stub = await this.prisma.payStub.findUnique({
                where: { id: payStubId },
                include: {
                    payroll: { include: { business: true } },
                    employee: true,
                },
            });
            if (!stub)
                throw new common_1.NotFoundException('Pay stub not found');
            if (((_a = stub.payroll) === null || _a === void 0 ? void 0 : _a.status) !== 'PAID')
                throw new common_1.BadRequestException('Pay stub is not available');
            await this.assertPayStubAccess(stub, user);
            const payDate = ((_b = stub.payroll) === null || _b === void 0 ? void 0 : _b.payDate) ? new Date(stub.payroll.payDate) : new Date();
            const datePart = Number.isFinite(payDate.getTime()) ? payDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
            const payrollData = {
                ...stub.payroll,
                payStubs: [
                    {
                        ...stub,
                        employee: stub.employee,
                    },
                ],
            };
            const businessData = ((_c = stub === null || stub === void 0 ? void 0 : stub.payroll) === null || _c === void 0 ? void 0 : _c.business) || {};
            const pdf = await (0, payslip_pdf_1.generatePayslipPdfBuffer)(payrollData, businessData);
            const filename = `Payroll_${datePart}.pdf`;
            return { filename, data: pdf };
        }
        async assertPayStubAccess(stub, user) {
            var _a, _b;
            if (!user)
                throw new common_1.BadRequestException('Access denied');
            if (user.role === 'SUPER_ADMIN')
                return;
            const payrollBusinessId = (_a = stub === null || stub === void 0 ? void 0 : stub.payroll) === null || _a === void 0 ? void 0 : _a.businessId;
            if (!payrollBusinessId)
                throw new common_1.BadRequestException('Access denied');
            if (user.role === 'BUSINESS_ADMIN' || user.role === 'MANAGER' || user.role === 'FINANCE') {
                await this.validateBusinessAccess(payrollBusinessId, user);
                return;
            }
            const stubUserId = (_b = stub === null || stub === void 0 ? void 0 : stub.employee) === null || _b === void 0 ? void 0 : _b.userId;
            if (!stubUserId || stubUserId !== user.userId)
                throw new common_1.BadRequestException('Access denied');
        }
        async getPayrollsForUser(userId, user) {
            const businessId = await this.getBusinessId(userId);
            return this.getPayrolls(businessId, user);
        }
        async validateBusinessAccess(targetBusinessId, user) {
            if (user.role === 'SUPER_ADMIN')
                return;
            // Check if owner
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId } });
            if (ownedBusiness && ownedBusiness.id === targetBusinessId)
                return;
            // Check if employee of that business
            const employee = await this.prisma.employee.findFirst({
                where: { userId: user.userId, businessId: targetBusinessId }
            });
            if (employee)
                return;
            throw new common_1.BadRequestException('Access denied: You do not have access to this business data');
        }
        async createPayroll(businessId, periodStart, periodEnd, payDate, type = 'REGULAR', user) {
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
                throw new common_1.BadRequestException('A payroll run for this period already exists.');
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
        async getAnnualTaxReport(businessId, year, user) {
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
            const w2Totals = {};
            const contractorTotals = {};
            const initTotal = (emp) => ({
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
                    role: { notIn: ['SUPER_ADMIN', 'BUSINESS_ADMIN'] }
                }
            });
            for (const emp of activeEmployees) {
                if (emp.workerType === 'W2' || emp.workerType === 'BOTH') {
                    if (!w2Totals[emp.id])
                        w2Totals[emp.id] = initTotal(emp);
                }
                if (emp.workerType === 'CONTRACTOR_1099' || emp.workerType === 'BOTH') {
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
                    totalW2Gross: w2Employees.reduce((sum, e) => sum + e.grossPay, 0),
                    total1099Gross: contractors.reduce((sum, e) => sum + e.grossPay, 0),
                    totalTaxesWithheld: w2Employees.reduce((sum, e) => sum + e.taxes, 0),
                    totalEmployerTaxes: w2Employees.reduce((sum, e) => sum + e.employerTaxes, 0)
                }
            };
        }
        async getYearEndForms(businessId, year, user) {
            if (user) {
                await this.validateBusinessAccess(businessId, user);
            }
            const business = await this.prisma.business.findUnique({ where: { id: businessId } });
            if (!business)
                throw new common_1.NotFoundException('Business not found');
            const report = await this.getAnnualTaxReport(businessId, year, user);
            // W-2 Mapping
            const w2s = report.w2Employees.map((e) => ({
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
            const nec1099s = report.contractors.map((c) => ({
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
        async runPayrollCalculation(payrollId, user) {
            var _a, _b, _c, _d, _e;
            const payroll = await this.prisma.payroll.findUnique({
                where: { id: payrollId },
                include: { business: true },
            });
            if (!payroll) {
                throw new common_1.NotFoundException('Payroll not found');
            }
            if (user) {
                await this.validateBusinessAccess(payroll.businessId, user);
            }
            // Reset: Delete existing paystubs for this payroll to prevent duplicates
            await this.prisma.payStub.deleteMany({
                where: { payrollId }
            });
            // Accrue leave for the payroll period before computing pay
            const accrualSummary = await this.leave.accrueForPayrollPeriod(payroll.businessId, payroll.periodStart, payroll.periodEnd, user);
            const employees = await this.prisma.employee.findMany({
                where: {
                    businessId: payroll.businessId,
                    status: 'ACTIVE',
                    role: { notIn: ['SUPER_ADMIN', 'BUSINESS_ADMIN'] }
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
                        throw new common_1.BadRequestException(`Payroll Blocked: Employee ${employee.firstName} ${employee.lastName} is missing address/state required for tax calculation.`);
                    }
                    if (!employee.filingStatus) {
                        throw new common_1.BadRequestException(`Payroll Blocked: Employee ${employee.firstName} ${employee.lastName} is missing Filing Status (W-4).`);
                    }
                    // Determine Rate (Prefer Profile, fallback to Employee root fields)
                    const rate = ((_a = employee.w2Profile) === null || _a === void 0 ? void 0 : _a.rate) || employee.hourlyRate || 0;
                    const salary = ((_b = employee.w2Profile) === null || _b === void 0 ? void 0 : _b.payType) === 'SALARY' ? employee.w2Profile.rate : ((_c = employee.salary) !== null && _c !== void 0 ? _c : undefined);
                    const payType = ((_d = employee.w2Profile) === null || _d === void 0 ? void 0 : _d.payType) || employee.payType;
                    // 1. Calculate Gross Pay
                    const { grossPay, regularPay, overtimePay, regularHours, overtimeHours, bonus, commission, reimbursement } = await this.calculateGrossPay(employee, payroll.periodStart, payroll.periodEnd, 'W2', payType, rate, salary);
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
                    const rate = ((_e = employee.contractorProfile) === null || _e === void 0 ? void 0 : _e.rate) || employee.hourlyRate || 0;
                    // 1. Calculate Gross Pay (1099 Logic)
                    const { grossPay, regularPay, overtimePay, regularHours, overtimeHours, bonus, commission, reimbursement } = await this.calculateGrossPay(employee, payroll.periodStart, payroll.periodEnd, 'CONTRACTOR_1099', 'HOURLY', // Contractors are usually hourly/unit based here
                    rate, undefined // No salary for contractors in this context usually
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
        async updatePayStub(stubId, updates, user) {
            var _a, _b, _c, _d, _e;
            const stub = await this.prisma.payStub.findUnique({
                where: { id: stubId },
                include: { employee: true, payroll: true }
            });
            if (!stub)
                throw new common_1.NotFoundException('PayStub not found');
            if (user) {
                await this.validateBusinessAccess(stub.payroll.businessId, user);
            }
            let newGross = 0;
            let regularPay = 0;
            let overtimePay = 0;
            const regularHours = (_a = updates.regularHours) !== null && _a !== void 0 ? _a : stub.regularHours;
            const overtimeHours = (_b = updates.overtimeHours) !== null && _b !== void 0 ? _b : stub.overtimeHours;
            if (stub.employee.payType === 'HOURLY') {
                const rate = stub.employee.hourlyRate || 0;
                regularPay = regularHours * rate;
                overtimePay = overtimeHours * rate * 1.5;
                newGross = regularPay + overtimePay;
            }
            else {
                // Salary: Base Pay is constant unless we allow override.
                // For now, keep original Regular Pay, but allow Bonus/Commission additions.
                regularPay = stub.regularPay;
                overtimePay = 0;
                newGross = regularPay;
            }
            const bonus = (_c = updates.bonus) !== null && _c !== void 0 ? _c : stub.bonus;
            const commission = (_d = updates.commission) !== null && _d !== void 0 ? _d : stub.commission;
            const reimbursement = (_e = updates.reimbursement) !== null && _e !== void 0 ? _e : stub.reimbursement;
            newGross += bonus + commission;
            // Recalculate Taxes or Use Manual Overrides
            let employeeTaxes = 0;
            let employerTaxes = 0;
            let employeeTaxDetails = {};
            let employerTaxDetails = {};
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
                if (updates.federalTax !== undefined)
                    employeeTaxDetails.federalTax = updates.federalTax;
                if (updates.socialSecurity !== undefined)
                    employeeTaxDetails.socialSecurity = updates.socialSecurity;
                if (updates.medicare !== undefined)
                    employeeTaxDetails.medicare = updates.medicare;
                if (updates.stateTax !== undefined)
                    employeeTaxDetails.stateTax = updates.stateTax;
                // Re-sum employee taxes
                employeeTaxes = (employeeTaxDetails.federalTax || 0) +
                    (employeeTaxDetails.socialSecurity || 0) +
                    (employeeTaxDetails.medicare || 0) +
                    (employeeTaxDetails.stateTax || 0);
                // Employer taxes remain auto-calculated
                employerTaxes = calculated.employerTaxes;
                employerTaxDetails = calculated.employerTaxDetails;
            }
            else {
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
                }
                catch (e) { }
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
                }
                catch (e) {
                    deductionDetails = { manualOverride: true, total: totalDeductions };
                }
            }
            else {
                // Check if previously manual
                let isManual = false;
                try {
                    const existingDetails = stub.deductionDetails ? JSON.parse(stub.deductionDetails) : {};
                    if (existingDetails.manualOverride) {
                        isManual = true;
                        totalDeductions = stub.deductions;
                        deductionDetails = existingDetails;
                    }
                }
                catch (e) {
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
        async recalculatePayrollTotals(payrollId) {
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
        async getPayrolls(businessId, user) {
            if (user) {
                await this.validateBusinessAccess(businessId, user);
            }
            return this.prisma.payroll.findMany({
                where: { businessId, status: { not: 'CANCELLED' } },
                orderBy: { createdAt: 'desc' },
            });
        }
        async deletePayroll(id, user) {
            const payroll = await this.prisma.payroll.findUnique({ where: { id } });
            if (!payroll)
                throw new common_1.NotFoundException('Payroll not found');
            if (user) {
                await this.validateBusinessAccess(payroll.businessId, user);
            }
            if (payroll.status !== 'DRAFT' && payroll.status !== 'PROCESSED') {
                throw new common_1.BadRequestException('Only draft payrolls can be deleted');
            }
            // Delete associated records in transaction
            return this.prisma.$transaction([
                this.prisma.payStub.deleteMany({ where: { payrollId: id } }),
                this.prisma.loanRepayment.deleteMany({ where: { payrollId: id } }),
                this.prisma.payroll.delete({ where: { id } })
            ]);
        }
        async getPayrollById(id, user) {
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
            if (!payroll)
                throw new common_1.NotFoundException('Payroll not found');
            if (user) {
                await this.validateBusinessAccess(payroll.businessId, user);
            }
            const filtered = (payroll.payStubs || []).filter((s) => { var _a; return !['SUPER_ADMIN', 'BUSINESS_ADMIN'].includes(String(((_a = s === null || s === void 0 ? void 0 : s.employee) === null || _a === void 0 ? void 0 : _a.role) || '').toUpperCase()); });
            const totalGross = filtered.reduce((acc, s) => acc + ((s === null || s === void 0 ? void 0 : s.grossPay) || 0), 0);
            const totalNet = filtered.reduce((acc, s) => acc + ((s === null || s === void 0 ? void 0 : s.netPay) || 0), 0);
            const totalEmployeeTaxes = filtered.reduce((acc, s) => acc + ((s === null || s === void 0 ? void 0 : s.taxes) || 0), 0);
            const totalEmployerTaxes = filtered.reduce((acc, s) => acc + ((s === null || s === void 0 ? void 0 : s.employerTaxes) || 0), 0);
            const totalDeductions = filtered.reduce((acc, s) => acc + ((s === null || s === void 0 ? void 0 : s.deductions) || 0), 0);
            payroll.payStubs = filtered;
            payroll.totalGross = totalGross;
            payroll.totalNet = totalNet;
            payroll.totalEmployeeTaxes = totalEmployeeTaxes;
            payroll.totalEmployerTaxes = totalEmployerTaxes;
            payroll.totalDeductions = totalDeductions;
            return payroll;
        }
        async calculateGrossPay(employee, start, end, workerType, payType, rate, salary) {
            var _a;
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
                let divisors = {
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
                                    const t = String(b.type || '').toUpperCase();
                                    const isUnpaid = t !== 'PAID';
                                    if (isUnpaid)
                                        durationMs -= (b.endTime.getTime() - b.startTime.getTime());
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
                const weeklyHours = {};
                timesheets.forEach(ts => {
                    if (!ts.endTime)
                        return;
                    let durationMs = ts.endTime.getTime() - ts.startTime.getTime();
                    if (ts.breaks) {
                        ts.breaks.forEach(b => {
                            if (b.endTime) {
                                const t = String(b.type || '').toUpperCase();
                                const isUnpaid = t !== 'PAID';
                                if (isUnpaid)
                                    durationMs -= (b.endTime.getTime() - b.startTime.getTime());
                            }
                        });
                    }
                    const hours = durationMs / (1000 * 60 * 60);
                    const date = new Date(ts.startTime);
                    const day = date.getDay();
                    const diff = date.getDate() - day;
                    const weekStart = new Date(date.setDate(diff));
                    weekStart.setHours(0, 0, 0, 0);
                    const weekKey = weekStart.toISOString().split('T')[0];
                    weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + hours;
                });
                let regHours = 0;
                let otHours = 0;
                const isEligible = ((_a = employee.overtimeEligible) !== null && _a !== void 0 ? _a : true) && workerType !== 'CONTRACTOR_1099';
                Object.values(weeklyHours).forEach(weekTotal => {
                    if (isEligible && weekTotal > 40) {
                        regHours += 40;
                        otHours += (weekTotal - 40);
                    }
                    else {
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
        async getYTDGross(employeeId, year, workerType) {
            const where = {
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
        async getYTDTaxes(employeeId, year, workerType) {
            const where = {
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
        calculateTaxes(grossPay, employee, ytdGross, workerType) {
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
            let divisors = { 'WEEKLY': 52, 'BI_WEEKLY': 26, 'SEMI_MONTHLY': 24, 'MONTHLY': 12 };
            const payPeriods = divisors[employee.paySchedule || 'BI_WEEKLY'] || 24;
            const annualGross = grossPay * payPeriods;
            // 2024 Standard Deductions
            let standardDeduction = 14600; // Single / Married Filing Separately
            const status = (employee.filingStatus || 'SINGLE').toUpperCase();
            if (status === 'MARRIED_JOINT') {
                standardDeduction = 29200;
            }
            else if (status === 'HEAD_OF_HOUSEHOLD') {
                standardDeduction = 21900;
            }
            const taxableIncome = Math.max(0, annualGross - standardDeduction);
            let annualFedTax = 0;
            // 2024 Tax Brackets
            if (status === 'MARRIED_JOINT') {
                if (taxableIncome <= 23200)
                    annualFedTax = taxableIncome * 0.10;
                else if (taxableIncome <= 94300)
                    annualFedTax = 2320 + (taxableIncome - 23200) * 0.12;
                else if (taxableIncome <= 201050)
                    annualFedTax = 10852 + (taxableIncome - 94300) * 0.22;
                else if (taxableIncome <= 383900)
                    annualFedTax = 34337 + (taxableIncome - 201050) * 0.24;
                else if (taxableIncome <= 487450)
                    annualFedTax = 78221 + (taxableIncome - 383900) * 0.32;
                else
                    annualFedTax = 111357 + (taxableIncome - 487450) * 0.35;
            }
            else {
                // Single / MFS / HOH (Simplified HOH to Single for MVP, usually HOH is wider)
                if (taxableIncome <= 11600)
                    annualFedTax = taxableIncome * 0.10;
                else if (taxableIncome <= 47150)
                    annualFedTax = 1160 + (taxableIncome - 11600) * 0.12;
                else if (taxableIncome <= 100525)
                    annualFedTax = 5426 + (taxableIncome - 47150) * 0.22;
                else if (taxableIncome <= 191950)
                    annualFedTax = 17168.5 + (taxableIncome - 100525) * 0.24;
                else if (taxableIncome <= 243725)
                    annualFedTax = 39110.5 + (taxableIncome - 191950) * 0.32;
                else
                    annualFedTax = 55678.5 + (taxableIncome - 243725) * 0.35;
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
            }
            else if (state === 'DC') {
                // DC Logic (Simplified)
                const dcTaxable = Math.max(0, annualGross - 13700);
                let annualDcTax = 0;
                if (dcTaxable <= 10000)
                    annualDcTax = dcTaxable * 0.04;
                else if (dcTaxable <= 40000)
                    annualDcTax = 400 + (dcTaxable - 10000) * 0.06;
                else if (dcTaxable <= 60000)
                    annualDcTax = 2200 + (dcTaxable - 40000) * 0.065;
                else
                    annualDcTax = 3500 + (dcTaxable - 60000) * 0.085;
                details.employeeTaxDetails.stateTax = annualDcTax / payPeriods;
            }
            else {
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
        async finalizePayroll(payrollId, user) {
            const payroll = await this.prisma.payroll.findUnique({
                where: { id: payrollId },
                include: { payStubs: true }
            });
            if (!payroll)
                throw new common_1.NotFoundException('Payroll not found');
            if (user) {
                await this.validateBusinessAccess(payroll.businessId, user);
            }
            if (payroll.status !== 'PROCESSED' && payroll.status !== 'DRAFT') { // Allow finalizing from processed/draft
                throw new common_1.BadRequestException('Payroll already finalized or invalid status');
            }
            // 1. Commit Deductions (Loans)
            for (const stub of payroll.payStubs) {
                if (stub.deductionDetails) {
                    const details = JSON.parse(stub.deductionDetails);
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
                            const loan = await this.prisma.loan.findUnique({ where: { id: loanDed.loanId } });
                            await this.prisma.auditLog.create({
                                data: {
                                    businessId: payroll.businessId,
                                    action: 'LOAN_REPAYMENT',
                                    resource: 'Loan',
                                    resourceId: loanDed.loanId,
                                    details: JSON.stringify({
                                        payrollId: payroll.id,
                                        employeeId: loan === null || loan === void 0 ? void 0 : loan.employeeId,
                                        amount: loanDed.amount,
                                        newBalance: loan === null || loan === void 0 ? void 0 : loan.balance
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
        async calculateDeductions(employeeId, payrollId, availableNet) {
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
                    if (amount < 0)
                        amount = 0;
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
    };
    __setFunctionName(_classThis, "PayrollService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PayrollService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PayrollService = _classThis;
})();
exports.PayrollService = PayrollService;
