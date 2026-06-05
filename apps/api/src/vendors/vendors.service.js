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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@unitedlinkgroup/types");
const bcrypt = __importStar(require("bcryptjs"));
const VENDOR_ROLE = 'VENDOR';
let VendorsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var VendorsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        defaultPermissions() {
            return {
                accessReports: true,
                accessContracts: true,
                accessCompliance: true,
                accessAnnouncements: true,
                accessIncidentReports: false,
                accessTimeTracking: false,
            };
        }
        normalizeSlug(value) {
            return String(value || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }
        buildPortalUrl(slug) {
            const base = String(process.env.VENDOR_PORTAL_BASE_URL || '').trim().replace(/\/$/, '');
            if (base)
                return `${base}/login?vendor=${encodeURIComponent(slug)}`;
            return `/vendor/login?vendor=${encodeURIComponent(slug)}`;
        }
        getUserId(user) {
            return (user === null || user === void 0 ? void 0 : user.userId) || (user === null || user === void 0 ? void 0 : user.sub) || (user === null || user === void 0 ? void 0 : user.id) || null;
        }
        assertSuperAdmin(user) {
            if ((user === null || user === void 0 ? void 0 : user.role) !== types_1.UserRole.SUPER_ADMIN) {
                throw new common_1.ForbiddenException('Only superadmin can manage vendors');
            }
        }
        async resolveManagedBusinessId(user, businessIdHeader) {
            this.assertSuperAdmin(user);
            const businessId = String(businessIdHeader || '').trim();
            if (!businessId) {
                throw new common_1.BadRequestException('Select a business before managing vendors');
            }
            const business = await this.prisma.business.findUnique({
                where: { id: businessId },
                select: { id: true, name: true, status: true },
            });
            if (!business || business.status === 'DELETED') {
                throw new common_1.BadRequestException('Business not found');
            }
            return business;
        }
        vendorWhereForBusiness(businessId) {
            return { businessId };
        }
        mapVendor(row) {
            return {
                ...row,
                portalUrl: this.buildPortalUrl(row.portalSlug),
                permissions: {
                    ...this.defaultPermissions(),
                    accessReports: row.accessReports !== false,
                    accessContracts: row.accessContracts !== false,
                    accessCompliance: row.accessCompliance !== false,
                    accessAnnouncements: row.accessAnnouncements !== false,
                    accessIncidentReports: !!row.accessIncidentReports,
                    accessTimeTracking: !!row.accessTimeTracking,
                },
            };
        }
        async getVendorOrThrowByUser(userId) {
            const vendor = await this.prisma.vendor.findFirst({
                where: { userId },
                include: {
                    business: true,
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
            });
            if (!vendor)
                throw new common_1.NotFoundException('Vendor profile not found');
            if (String(vendor.status || '').toUpperCase() !== 'ACTIVE') {
                throw new common_1.ForbiddenException('Vendor access is inactive');
            }
            return vendor;
        }
        async list(user, businessIdHeader) {
            const business = await this.resolveManagedBusinessId(user, businessIdHeader);
            const rows = await this.prisma.vendor.findMany({
                where: this.vendorWhereForBusiness(business.id),
                orderBy: [{ companyName: 'asc' }, { createdAt: 'desc' }],
                include: {
                    business: { select: { id: true, name: true, status: true } },
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
            });
            return {
                business,
                vendors: rows.map((row) => this.mapVendor(row)),
            };
        }
        async create(user, dto, businessIdHeader) {
            const business = await this.resolveManagedBusinessId(user, businessIdHeader);
            const businessId = business.id;
            const email = String(dto.email || '').trim().toLowerCase();
            const password = String(dto.password || '').trim();
            const companyName = String(dto.companyName || '').trim();
            const portalSlug = this.normalizeSlug(dto.portalSlug || companyName);
            if (!email)
                throw new common_1.BadRequestException('Vendor email is required');
            if (!password || password.length < 8)
                throw new common_1.BadRequestException('Vendor password must be at least 8 characters');
            if (!companyName)
                throw new common_1.BadRequestException('Vendor company name is required');
            if (!portalSlug)
                throw new common_1.BadRequestException('Vendor portal slug is required');
            const existingUser = await this.prisma.user.findUnique({ where: { email } });
            if (existingUser)
                throw new common_1.BadRequestException('A user with this email already exists');
            const existingVendor = await this.prisma.vendor.findFirst({
                where: {
                    OR: [{ email }, { portalSlug }],
                },
                select: { id: true },
            });
            if (existingVendor)
                throw new common_1.BadRequestException('Vendor email or portal slug already exists');
            const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt());
            return this.prisma.$transaction(async (tx) => {
                const vendorUser = await tx.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        firstName: dto.contactFirstName || null,
                        lastName: dto.contactLastName || null,
                        role: VENDOR_ROLE,
                    },
                });
                const vendor = await tx.vendor.create({
                    data: {
                        businessId,
                        userId: vendorUser.id,
                        companyName,
                        contactFirstName: dto.contactFirstName || null,
                        contactLastName: dto.contactLastName || null,
                        email,
                        phone: dto.phone || null,
                        website: dto.website || null,
                        serviceCategory: dto.serviceCategory || null,
                        portalSlug,
                        status: dto.status || 'ACTIVE',
                        notes: dto.notes || null,
                        accessReports: dto.accessReports !== false,
                        accessContracts: dto.accessContracts !== false,
                        accessCompliance: dto.accessCompliance !== false,
                        accessAnnouncements: dto.accessAnnouncements !== false,
                        accessIncidentReports: !!dto.accessIncidentReports,
                        accessTimeTracking: !!dto.accessTimeTracking,
                        agreementStartDate: dto.agreementStartDate ? new Date(dto.agreementStartDate) : null,
                        agreementEndDate: dto.agreementEndDate ? new Date(dto.agreementEndDate) : null,
                    },
                    include: {
                        business: { select: { id: true, name: true, status: true } },
                        user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    },
                });
                return this.mapVendor(vendor);
            });
        }
        async update(user, id, dto, businessIdHeader) {
            const business = await this.resolveManagedBusinessId(user, businessIdHeader);
            const existing = await this.prisma.vendor.findUnique({
                where: { id },
                include: { user: { select: { id: true, email: true } } },
            });
            if (!existing)
                throw new common_1.NotFoundException('Vendor not found');
            if (existing.businessId !== business.id)
                throw new common_1.ForbiddenException('Vendor does not belong to the selected business');
            const data = {};
            const userData = {};
            if (dto.companyName !== undefined)
                data.companyName = dto.companyName || existing.companyName;
            if (dto.contactFirstName !== undefined) {
                data.contactFirstName = dto.contactFirstName || null;
                userData.firstName = dto.contactFirstName || null;
            }
            if (dto.contactLastName !== undefined) {
                data.contactLastName = dto.contactLastName || null;
                userData.lastName = dto.contactLastName || null;
            }
            if (dto.phone !== undefined)
                data.phone = dto.phone || null;
            if (dto.website !== undefined)
                data.website = dto.website || null;
            if (dto.serviceCategory !== undefined)
                data.serviceCategory = dto.serviceCategory || null;
            if (dto.notes !== undefined)
                data.notes = dto.notes || null;
            if (dto.status !== undefined)
                data.status = dto.status;
            if (dto.accessReports !== undefined)
                data.accessReports = !!dto.accessReports;
            if (dto.accessContracts !== undefined)
                data.accessContracts = !!dto.accessContracts;
            if (dto.accessCompliance !== undefined)
                data.accessCompliance = !!dto.accessCompliance;
            if (dto.accessAnnouncements !== undefined)
                data.accessAnnouncements = !!dto.accessAnnouncements;
            if (dto.accessIncidentReports !== undefined)
                data.accessIncidentReports = !!dto.accessIncidentReports;
            if (dto.accessTimeTracking !== undefined)
                data.accessTimeTracking = !!dto.accessTimeTracking;
            if (dto.agreementStartDate !== undefined)
                data.agreementStartDate = dto.agreementStartDate ? new Date(dto.agreementStartDate) : null;
            if (dto.agreementEndDate !== undefined)
                data.agreementEndDate = dto.agreementEndDate ? new Date(dto.agreementEndDate) : null;
            if (dto.email !== undefined) {
                const email = String(dto.email || '').trim().toLowerCase();
                if (!email)
                    throw new common_1.BadRequestException('Vendor email is required');
                const otherUser = await this.prisma.user.findUnique({ where: { email } });
                if (otherUser && otherUser.id !== existing.userId)
                    throw new common_1.BadRequestException('A user with this email already exists');
                const otherVendor = await this.prisma.vendor.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
                if (otherVendor)
                    throw new common_1.BadRequestException('Another vendor already uses this email');
                data.email = email;
                userData.email = email;
            }
            if (dto.portalSlug !== undefined) {
                const portalSlug = this.normalizeSlug(dto.portalSlug);
                if (!portalSlug)
                    throw new common_1.BadRequestException('Vendor portal slug is required');
                const otherVendor = await this.prisma.vendor.findFirst({ where: { portalSlug, NOT: { id } }, select: { id: true } });
                if (otherVendor)
                    throw new common_1.BadRequestException('Another vendor already uses this portal slug');
                data.portalSlug = portalSlug;
            }
            if (dto.password) {
                if (String(dto.password).trim().length < 8)
                    throw new common_1.BadRequestException('Vendor password must be at least 8 characters');
                userData.password = await bcrypt.hash(String(dto.password), await bcrypt.genSalt());
            }
            return this.prisma.$transaction(async (tx) => {
                if (Object.keys(userData).length) {
                    await tx.user.update({ where: { id: existing.userId }, data: userData });
                }
                const vendor = await tx.vendor.update({
                    where: { id },
                    data,
                    include: {
                        business: { select: { id: true, name: true, status: true } },
                        user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    },
                });
                return this.mapVendor(vendor);
            });
        }
        async setStatus(user, id, status, businessIdHeader) {
            const business = await this.resolveManagedBusinessId(user, businessIdHeader);
            const vendor = await this.prisma.vendor.findUnique({ where: { id } });
            if (!vendor)
                throw new common_1.NotFoundException('Vendor not found');
            if (vendor.businessId !== business.id)
                throw new common_1.ForbiddenException('Vendor does not belong to the selected business');
            const updated = await this.prisma.vendor.update({
                where: { id },
                data: { status },
                include: {
                    business: { select: { id: true, name: true, status: true } },
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
            });
            return this.mapVendor(updated);
        }
        async getPublicBySlug(slug) {
            var _a, _b;
            const portalSlug = this.normalizeSlug(slug);
            const vendor = await this.prisma.vendor.findFirst({
                where: { portalSlug },
                include: { business: { select: { name: true, logoUrl: true } } },
            });
            if (!vendor)
                throw new common_1.NotFoundException('Vendor portal not found');
            return {
                companyName: vendor.companyName,
                businessName: ((_a = vendor.business) === null || _a === void 0 ? void 0 : _a.name) || 'Business',
                logoUrl: ((_b = vendor.business) === null || _b === void 0 ? void 0 : _b.logoUrl) || null,
                portalSlug: vendor.portalSlug,
                status: vendor.status,
                loginUrl: this.buildPortalUrl(vendor.portalSlug),
            };
        }
        async getMyProfile(user) {
            const vendor = await this.getVendorOrThrowByUser(this.getUserId(user));
            return {
                id: vendor.id,
                companyName: vendor.companyName,
                contactFirstName: vendor.contactFirstName,
                contactLastName: vendor.contactLastName,
                email: vendor.email,
                phone: vendor.phone,
                website: vendor.website,
                serviceCategory: vendor.serviceCategory,
                portalSlug: vendor.portalSlug,
                status: vendor.status,
                notes: vendor.notes,
                agreementStartDate: vendor.agreementStartDate,
                agreementEndDate: vendor.agreementEndDate,
                accessReports: vendor.accessReports,
                accessContracts: vendor.accessContracts,
                accessCompliance: vendor.accessCompliance,
                accessAnnouncements: vendor.accessAnnouncements,
                accessIncidentReports: !!vendor.accessIncidentReports,
                accessTimeTracking: !!vendor.accessTimeTracking,
                portalUrl: this.buildPortalUrl(vendor.portalSlug),
                business: vendor.business,
                user: vendor.user,
            };
        }
        async getMyPortalData(user) {
            const vendor = await this.getVendorOrThrowByUser(this.getUserId(user));
            const businessId = vendor.businessId;
            const permissions = {
                ...this.defaultPermissions(),
                accessReports: vendor.accessReports !== false,
                accessContracts: vendor.accessContracts !== false,
                accessCompliance: vendor.accessCompliance !== false,
                accessAnnouncements: vendor.accessAnnouncements !== false,
                accessIncidentReports: !!vendor.accessIncidentReports,
                accessTimeTracking: !!vendor.accessTimeTracking,
            };
            const [business, clientCount, locationCount, invoiceRows, paymentRows, contracts, complianceDocuments, announcements, incidentReports, timesheets,] = await Promise.all([
                this.prisma.business.findUnique({
                    where: { id: businessId },
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
                        mobile: true,
                        status: true,
                    },
                }),
                permissions.accessReports ? this.prisma.client.count({ where: { businessId, status: 'ACTIVE' } }) : Promise.resolve(0),
                permissions.accessReports ? this.prisma.location.count({ where: { businessId, status: 'ACTIVE' } }) : Promise.resolve(0),
                permissions.accessReports ? this.prisma.invoice.findMany({
                    where: { businessId },
                    orderBy: { createdAt: 'desc' },
                    take: 8,
                    include: { client: { select: { id: true, name: true } } },
                }) : Promise.resolve([]),
                permissions.accessReports ? this.prisma.payment.findMany({
                    where: { businessId },
                    orderBy: { date: 'desc' },
                    take: 8,
                }) : Promise.resolve([]),
                permissions.accessContracts ? this.prisma.contractDocument.findMany({
                    where: {
                        businessId,
                        employeeId: null,
                        type: { in: ['CLIENT', 'NDA', 'MSA', 'SOW', 'OTHER'] },
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: 12,
                }) : Promise.resolve([]),
                permissions.accessCompliance ? this.prisma.complianceDocument.findMany({
                    where: { businessId, status: { not: 'ARCHIVED' } },
                    orderBy: [{ reviewDate: 'asc' }, { updatedAt: 'desc' }],
                    take: 12,
                }) : Promise.resolve([]),
                permissions.accessAnnouncements ? this.prisma.announcement.findMany({
                    where: { businessId, status: 'PUBLISHED' },
                    orderBy: { createdAt: 'desc' },
                    take: 8,
                }) : Promise.resolve([]),
                permissions.accessIncidentReports ? this.prisma.incidentReport.findMany({
                    where: { businessId },
                    orderBy: { createdAt: 'desc' },
                    take: 12,
                    include: {
                        location: { select: { id: true, name: true } },
                        reportingOfficer: { select: { id: true, firstName: true, lastName: true } },
                        assignedSupervisor: { select: { id: true, firstName: true, lastName: true } },
                    },
                }) : Promise.resolve([]),
                permissions.accessTimeTracking ? this.prisma.timesheet.findMany({
                    where: { employee: { businessId } },
                    orderBy: { startTime: 'desc' },
                    take: 12,
                    include: {
                        employee: { select: { id: true, firstName: true, lastName: true } },
                        location: { select: { id: true, name: true } },
                    },
                }) : Promise.resolve([]),
            ]);
            const invoiceTotals = invoiceRows.reduce((acc, row) => {
                const total = Number(row.total || 0);
                acc.invoiced += total;
                if (!['PAID', 'VOID'].includes(String(row.status || '').toUpperCase())) {
                    acc.outstanding += total;
                }
                return acc;
            }, { invoiced: 0, outstanding: 0 });
            const paymentsTotal = paymentRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
            return {
                vendor: {
                    id: vendor.id,
                    companyName: vendor.companyName,
                    contactFirstName: vendor.contactFirstName,
                    contactLastName: vendor.contactLastName,
                    email: vendor.email,
                    phone: vendor.phone,
                    website: vendor.website,
                    serviceCategory: vendor.serviceCategory,
                    portalSlug: vendor.portalSlug,
                    status: vendor.status,
                    notes: vendor.notes,
                    agreementStartDate: vendor.agreementStartDate,
                    agreementEndDate: vendor.agreementEndDate,
                    permissions,
                },
                business,
                reports: permissions.accessReports ? {
                    summary: {
                        activeClients: clientCount,
                        activeLocations: locationCount,
                        invoicesTracked: invoiceRows.length,
                        recentPayments: paymentRows.length,
                        totalInvoiced: Math.round(invoiceTotals.invoiced * 100) / 100,
                        outstandingInvoices: Math.round(invoiceTotals.outstanding * 100) / 100,
                        paymentsReceived: Math.round(paymentsTotal * 100) / 100,
                        currencyCode: (business === null || business === void 0 ? void 0 : business.currencyCode) || 'USD',
                    },
                    recentInvoices: invoiceRows.map((row) => {
                        var _a;
                        return ({
                            id: row.id,
                            invoiceNumber: row.invoiceNumber,
                            clientName: ((_a = row.client) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
                            total: row.total,
                            status: row.status,
                            dueDate: row.dueDate,
                            createdAt: row.createdAt,
                        });
                    }),
                    recentPayments: paymentRows.map((row) => ({
                        id: row.id,
                        amount: row.amount,
                        paymentDate: row.date,
                        method: row.method,
                        reference: row.reference,
                        notes: row.notes,
                    })),
                } : null,
                contracts: permissions.accessContracts ? contracts : [],
                complianceDocuments: permissions.accessCompliance ? complianceDocuments : [],
                announcements: permissions.accessAnnouncements ? announcements : [],
                incidentReports: permissions.accessIncidentReports
                    ? incidentReports.map((row) => {
                        var _a;
                        return ({
                            id: row.id,
                            reportNumber: row.reportNumber,
                            title: row.title,
                            type: row.type,
                            severity: row.severity,
                            status: row.status,
                            date: row.date,
                            locationName: ((_a = row.location) === null || _a === void 0 ? void 0 : _a.name) || null,
                            reportingOfficerName: row.reportingOfficer ? `${row.reportingOfficer.firstName} ${row.reportingOfficer.lastName}`.trim() : null,
                            assignedSupervisorName: row.assignedSupervisor ? `${row.assignedSupervisor.firstName} ${row.assignedSupervisor.lastName}`.trim() : null,
                        });
                    })
                    : [],
                timeTracking: permissions.accessTimeTracking
                    ? timesheets.map((row) => {
                        var _a, _b, _c;
                        return ({
                            id: row.id,
                            employeeName: `${((_a = row.employee) === null || _a === void 0 ? void 0 : _a.firstName) || ''} ${((_b = row.employee) === null || _b === void 0 ? void 0 : _b.lastName) || ''}`.trim(),
                            startTime: row.startTime,
                            endTime: row.endTime,
                            status: row.status,
                            locationName: ((_c = row.location) === null || _c === void 0 ? void 0 : _c.name) || null,
                            clockInIp: row.clockInIp,
                            clockOutIp: row.clockOutIp,
                        });
                    })
                    : [],
            };
        }
    };
    __setFunctionName(_classThis, "VendorsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        VendorsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return VendorsService = _classThis;
})();
exports.VendorsService = VendorsService;
