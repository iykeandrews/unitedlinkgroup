"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const types_1 = require("@unitedlinkgroup/types");
const crypto_1 = __importDefault(require("crypto"));
const VENDOR_ROLE = 'VENDOR';
let AuthService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AuthService = _classThis = class {
        constructor(usersService, jwtService, prisma) {
            this.usersService = usersService;
            this.jwtService = jwtService;
            this.prisma = prisma;
        }
        async validateUser(email, pass) {
            try {
                const user = await this.usersService.findOne(email);
                if (user) {
                    if (user.role === VENDOR_ROLE) {
                        return null;
                    }
                    const ok = await bcrypt.compare(pass, user.password);
                    if (!ok && user.role === types_1.UserRole.SUPER_ADMIN) {
                        // Dev login removed for security hardening
                        return null;
                    }
                }
                if (user && (await bcrypt.compare(pass, user.password))) {
                    // Enforce official email for employees/managers
                    const employee = await this.prisma.employee.findFirst({ where: { userId: user.id } });
                    if (employee && (employee.role === 'EMPLOYEE' || employee.role === 'MANAGER')) {
                        if (!employee.officialEmail || email !== employee.officialEmail) {
                            return null;
                        }
                    }
                    const { password, ...result } = user;
                    if (employee && (employee.role === 'EMPLOYEE' || employee.role === 'MANAGER')) {
                        return {
                            ...result,
                            role: employee.role,
                            businessId: employee.businessId,
                            employeeId: employee.id,
                        };
                    }
                    return result;
                }
                return null;
            }
            catch (error) {
                throw error;
            }
        }
        async validateVendorUser(email, pass, portalSlug) {
            const normalizedEmail = String(email || '').trim().toLowerCase();
            const user = await this.usersService.findOne(normalizedEmail);
            if (!user || user.role !== VENDOR_ROLE)
                return null;
            if (!(await bcrypt.compare(pass, user.password)))
                return null;
            const normalizedSlug = String(portalSlug || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            const vendor = await this.prisma.vendor.findFirst({
                where: {
                    userId: user.id,
                    status: 'ACTIVE',
                    ...(normalizedSlug ? { portalSlug: normalizedSlug } : {}),
                },
            });
            if (!vendor)
                return null;
            return {
                ...user,
                role: VENDOR_ROLE,
                businessId: vendor.businessId,
                vendorId: vendor.id,
                portalSlug: vendor.portalSlug,
            };
        }
        async devLogin(email) {
            const existing = await this.prisma.user.findUnique({ where: { email } });
            if (existing) {
                const updated = existing.role === types_1.UserRole.SUPER_ADMIN
                    ? existing
                    : await this.prisma.user.update({ where: { id: existing.id }, data: { role: types_1.UserRole.SUPER_ADMIN } });
                return this.login(updated);
            }
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(crypto_1.default.randomUUID(), salt);
            const created = await this.prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: types_1.UserRole.SUPER_ADMIN,
                }
            });
            return this.login(created);
        }
        async login(user) {
            let businessId;
            let business;
            let vendor;
            // Check if employee
            const employee = await this.prisma.employee.findFirst({ where: { userId: user.id } });
            if (employee) {
                businessId = employee.businessId;
            }
            else {
                vendor = await this.prisma.vendor.findFirst({ where: { userId: user.id } });
                if (vendor) {
                    businessId = vendor.businessId;
                }
                else {
                    // Check if owner
                    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.id } });
                    if (ownedBusiness) {
                        businessId = ownedBusiness.id;
                    }
                }
            }
            if (businessId) {
                business = await this.prisma.business.findUnique({
                    where: { id: businessId },
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                        ein: true,
                        mobile: true,
                        address: true,
                        city: true,
                        state: true,
                        zip: true,
                        country: true,
                        currencyCode: true,
                        ownerId: true,
                        modules: true,
                        createdAt: true,
                        updatedAt: true
                    }
                });
            }
            const effectiveRole = user.businessId && (user.role === types_1.UserRole.EMPLOYEE || user.role === types_1.UserRole.MANAGER) ? user.role : user.role;
            const payload = {
                email: user.email,
                sub: user.id,
                role: effectiveRole,
                businessId: user.businessId || businessId,
                ...((vendor === null || vendor === void 0 ? void 0 : vendor.id) || user.vendorId ? { vendorId: (vendor === null || vendor === void 0 ? void 0 : vendor.id) || user.vendorId } : {}),
                ...((vendor === null || vendor === void 0 ? void 0 : vendor.portalSlug) || user.portalSlug ? { portalSlug: (vendor === null || vendor === void 0 ? void 0 : vendor.portalSlug) || user.portalSlug } : {}),
            };
            return {
                access_token: this.jwtService.sign(payload),
                businessId,
                business,
                employeeType: (employee === null || employee === void 0 ? void 0 : employee.type) || null,
                vendor: vendor
                    ? {
                        id: vendor.id,
                        companyName: vendor.companyName,
                        portalSlug: vendor.portalSlug,
                        status: vendor.status,
                    }
                    : undefined,
            };
        }
        async getEnhancedProfile(user, businessId) {
            if ((user === null || user === void 0 ? void 0 : user.role) === VENDOR_ROLE) {
                const vendor = await this.prisma.vendor.findFirst({
                    where: { userId: user.userId },
                    select: { id: true, businessId: true, portalSlug: true, companyName: true, status: true },
                });
                return {
                    ...user,
                    vendorId: vendor === null || vendor === void 0 ? void 0 : vendor.id,
                    businessId: (vendor === null || vendor === void 0 ? void 0 : vendor.businessId) || user.businessId,
                    portalSlug: (vendor === null || vendor === void 0 ? void 0 : vendor.portalSlug) || user.portalSlug,
                    companyName: vendor === null || vendor === void 0 ? void 0 : vendor.companyName,
                    status: (vendor === null || vendor === void 0 ? void 0 : vendor.status) || user.status,
                };
            }
            const employee = await this.prisma.employee.findFirst({
                where: { userId: user.userId, ...(businessId ? { businessId } : {}) },
            });
            const fallback = employee ? null : await this.prisma.employee.findFirst({ where: { userId: user.userId } });
            return {
                ...user,
                employeeId: (employee === null || employee === void 0 ? void 0 : employee.id) || (fallback === null || fallback === void 0 ? void 0 : fallback.id),
                businessId: (employee === null || employee === void 0 ? void 0 : employee.businessId) || (fallback === null || fallback === void 0 ? void 0 : fallback.businessId) || user.businessId,
                employeeType: (employee === null || employee === void 0 ? void 0 : employee.type) || (fallback === null || fallback === void 0 ? void 0 : fallback.type) || null
            };
        }
        async getVendorProfile(user) {
            if ((user === null || user === void 0 ? void 0 : user.role) !== VENDOR_ROLE)
                throw new common_1.UnauthorizedException('Vendor access required');
            const vendor = await this.prisma.vendor.findFirst({
                where: { userId: user.userId, status: 'ACTIVE' },
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true,
                            logoUrl: true,
                            industry: true,
                            businessType: true,
                            address: true,
                            city: true,
                            state: true,
                            country: true,
                            currencyCode: true,
                        },
                    },
                },
            });
            if (!vendor)
                throw new common_1.UnauthorizedException('Vendor account is inactive');
            return {
                userId: user.userId,
                role: VENDOR_ROLE,
                vendorId: vendor.id,
                businessId: vendor.businessId,
                portalSlug: vendor.portalSlug,
                companyName: vendor.companyName,
                email: vendor.email,
                status: vendor.status,
                business: vendor.business,
            };
        }
        async register(registerDto) {
            const { email, password, firstName, lastName, businessName } = registerDto;
            // 1. Check if user exists
            const existingUser = await this.usersService.findOne(email);
            if (existingUser) {
                throw new common_1.UnauthorizedException('User already exists');
            }
            // 2. Hash password
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(password, salt);
            // 3. Transaction: Create User -> Business -> Employee
            return this.prisma.$transaction(async (tx) => {
                // Create User
                const user = await tx.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName,
                        lastName,
                        role: types_1.UserRole.BUSINESS_ADMIN,
                    }
                });
                // Create Business
                const business = await tx.business.create({
                    data: {
                        name: businessName,
                        ein: 'PENDING',
                        address: '',
                        ownerId: user.id,
                    }
                });
                // Create Employee Record
                await tx.employee.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        businessId: business.id,
                        userId: user.id,
                        role: types_1.UserRole.BUSINESS_ADMIN,
                        type: 'FULL_TIME',
                        payType: 'SALARY',
                        status: 'ACTIVE'
                    }
                });
                return user;
            });
        }
        async bootstrap(registerDto) {
            const count = await this.prisma.user.count();
            if (count > 0) {
                throw new common_1.BadRequestException('Bootstrap is disabled once users exist');
            }
            const user = await this.register(registerDto);
            return this.login(user);
        }
        async getUserCount() {
            return this.prisma.user.count();
        }
    };
    __setFunctionName(_classThis, "AuthService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
})();
exports.AuthService = AuthService;
