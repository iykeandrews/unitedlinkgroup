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
exports.LoansService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
let LoansService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var LoansService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        async getBusinessId(user, businessIdHeader) {
            if (user.role === types_1.UserRole.SUPER_ADMIN) {
                if (!businessIdHeader)
                    throw new common_1.BadRequestException('Business context required for Super Admin');
                return businessIdHeader;
            }
            let userBusinessId = user.businessId;
            if (!userBusinessId) {
                const employee = await this.prisma.employee.findFirst({ where: { userId: user.userId } });
                if (employee)
                    userBusinessId = employee.businessId;
                if (!userBusinessId) {
                    const business = await this.prisma.business.findFirst({ where: { ownerId: user.userId } });
                    if (business)
                        userBusinessId = business.id;
                }
            }
            if (!userBusinessId) {
                throw new common_1.BadRequestException('User is not associated with a business');
            }
            if (businessIdHeader && businessIdHeader !== userBusinessId) {
                throw new common_1.BadRequestException('Access denied: Cannot access another business data');
            }
            return userBusinessId;
        }
        async requestLoan(userId, amount, termMonths = 12, reason, businessIdHeader) {
            const employee = await this.prisma.employee.findFirst({
                where: { userId },
            });
            if (!employee) {
                throw new common_1.BadRequestException('User is not an employee');
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
                throw new common_1.BadRequestException('Employee does not belong to the current business context');
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
        async requestLoanByEmployeeId(employeeId, amount, termMonths = 12, reason, requestingUser, businessIdHeader) {
            const businessId = await this.getBusinessId(requestingUser, businessIdHeader);
            const employee = await this.prisma.employee.findUnique({
                where: { id: employeeId },
            });
            if (!employee) {
                throw new common_1.NotFoundException('Employee not found');
            }
            if (employee.businessId !== businessId) {
                throw new common_1.BadRequestException('Employee does not belong to the current business context');
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
        async findAll(user, businessIdHeader) {
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
        async findByEmployee(userId) {
            // This is for "my-loans", so it's always for the current user.
            // No strict need for businessIdHeader check unless we want to enforce context even for self-access,
            // but usually "my data" is safe.
            // However, if a user belongs to multiple businesses (not supported yet, but good practice), context helps.
            // For now, finding by userId is safe as it returns loans for that user.
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (!employee)
                throw new common_1.BadRequestException('Employee not found');
            return this.prisma.loan.findMany({
                where: { employeeId: employee.id },
            });
        }
        async findOne(id, user, businessIdHeader) {
            const loan = await this.prisma.loan.findUnique({
                where: { id },
                include: { employee: true, repayments: true },
            });
            if (!loan)
                throw new common_1.NotFoundException('Loan not found');
            // Access Control
            if (user.role === types_1.UserRole.SUPER_ADMIN) {
                if (businessIdHeader && loan.employee.businessId !== businessIdHeader) {
                    throw new common_1.BadRequestException('Loan does not belong to the current business context');
                }
                // If no header, Super Admin can see it (optional, or force header)
                // Sticking to "Business context required" pattern for consistency
                if (!businessIdHeader)
                    throw new common_1.BadRequestException('Business context required for Super Admin');
            }
            else {
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
                    throw new common_1.BadRequestException('Access denied');
                }
                // Only Admin/Manager can see others' loans
                if (user.role === types_1.UserRole.EMPLOYEE) {
                    throw new common_1.BadRequestException('Access denied');
                }
            }
            return loan;
        }
        async approveLoan(id, approverUser, businessIdHeader) {
            const businessId = await this.getBusinessId(approverUser, businessIdHeader);
            const loan = await this.prisma.loan.findUnique({
                where: { id },
                include: { employee: true }
            });
            if (!loan)
                throw new common_1.NotFoundException('Loan not found');
            if (loan.employee.businessId !== businessId) {
                throw new common_1.BadRequestException('Access denied: Loan belongs to another business');
            }
            return this.prisma.loan.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedBy: approverUser.userId,
                },
            });
        }
        async rejectLoan(id, rejectorUser, reason, businessIdHeader) {
            const businessId = await this.getBusinessId(rejectorUser, businessIdHeader);
            const loan = await this.prisma.loan.findUnique({
                where: { id },
                include: { employee: true }
            });
            if (!loan)
                throw new common_1.NotFoundException('Loan not found');
            if (loan.employee.businessId !== businessId) {
                throw new common_1.BadRequestException('Access denied: Loan belongs to another business');
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
    };
    __setFunctionName(_classThis, "LoansService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LoansService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LoansService = _classThis;
})();
exports.LoansService = LoansService;
