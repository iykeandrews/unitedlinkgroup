import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';
import * as bcrypt from 'bcryptjs';

const VENDOR_ROLE = 'VENDOR';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  private defaultPermissions() {
    return {
      accessReports: true,
      accessContracts: true,
      accessCompliance: true,
      accessAnnouncements: true,
      accessIncidentReports: false,
      accessTimeTracking: false,
    };
  }

  private normalizeSlug(value: string) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private buildPortalUrl(slug: string) {
    const base = String(process.env.VENDOR_PORTAL_BASE_URL || '').trim().replace(/\/$/, '');
    if (base) return `${base}/login?vendor=${encodeURIComponent(slug)}`;
    return `/vendor/login?vendor=${encodeURIComponent(slug)}`;
  }

  private getUserId(user: any) {
    return user?.userId || user?.sub || user?.id || null;
  }

  private assertSuperAdmin(user: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only superadmin can manage vendors');
    }
  }

  private async resolveManagedBusinessId(user: any, businessIdHeader?: string) {
    this.assertSuperAdmin(user);
    const businessId = String(businessIdHeader || '').trim();
    if (!businessId) {
      throw new BadRequestException('Select a business before managing vendors');
    }
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, status: true },
    });
    if (!business || business.status === 'DELETED') {
      throw new BadRequestException('Business not found');
    }
    return business;
  }

  private vendorWhereForBusiness(businessId: string) {
    return { businessId };
  }

  private mapVendor(row: any) {
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

  private async getVendorOrThrowByUser(userId: string) {
    const vendor = await (this.prisma as any).vendor.findFirst({
      where: { userId },
      include: {
        business: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    if (String(vendor.status || '').toUpperCase() !== 'ACTIVE') {
      throw new ForbiddenException('Vendor access is inactive');
    }
    return vendor;
  }

  async list(user: any, businessIdHeader?: string) {
    const business = await this.resolveManagedBusinessId(user, businessIdHeader);
    const rows = await (this.prisma as any).vendor.findMany({
      where: this.vendorWhereForBusiness(business.id),
      orderBy: [{ companyName: 'asc' }, { createdAt: 'desc' }],
      include: {
        business: { select: { id: true, name: true, status: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return {
      business,
      vendors: rows.map((row: any) => this.mapVendor(row)),
    };
  }

  async create(user: any, dto: any, businessIdHeader?: string) {
    const business = await this.resolveManagedBusinessId(user, businessIdHeader);
    const businessId = business.id;
    const email = String(dto.email || '').trim().toLowerCase();
    const password = String(dto.password || '').trim();
    const companyName = String(dto.companyName || '').trim();
    const portalSlug = this.normalizeSlug(dto.portalSlug || companyName);

    if (!email) throw new BadRequestException('Vendor email is required');
    if (!password || password.length < 8) throw new BadRequestException('Vendor password must be at least 8 characters');
    if (!companyName) throw new BadRequestException('Vendor company name is required');
    if (!portalSlug) throw new BadRequestException('Vendor portal slug is required');

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new BadRequestException('A user with this email already exists');

    const existingVendor = await (this.prisma as any).vendor.findFirst({
      where: {
        OR: [{ email }, { portalSlug }],
      },
      select: { id: true },
    });
    if (existingVendor) throw new BadRequestException('Vendor email or portal slug already exists');

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt());

    return this.prisma.$transaction(async (tx: any) => {
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

  async update(user: any, id: string, dto: any, businessIdHeader?: string) {
    const business = await this.resolveManagedBusinessId(user, businessIdHeader);
    const existing = await (this.prisma as any).vendor.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!existing) throw new NotFoundException('Vendor not found');
    if (existing.businessId !== business.id) throw new ForbiddenException('Vendor does not belong to the selected business');

    const data: any = {};
    const userData: any = {};

    if (dto.companyName !== undefined) data.companyName = dto.companyName || existing.companyName;
    if (dto.contactFirstName !== undefined) {
      data.contactFirstName = dto.contactFirstName || null;
      userData.firstName = dto.contactFirstName || null;
    }
    if (dto.contactLastName !== undefined) {
      data.contactLastName = dto.contactLastName || null;
      userData.lastName = dto.contactLastName || null;
    }
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.website !== undefined) data.website = dto.website || null;
    if (dto.serviceCategory !== undefined) data.serviceCategory = dto.serviceCategory || null;
    if (dto.notes !== undefined) data.notes = dto.notes || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.accessReports !== undefined) data.accessReports = !!dto.accessReports;
    if (dto.accessContracts !== undefined) data.accessContracts = !!dto.accessContracts;
    if (dto.accessCompliance !== undefined) data.accessCompliance = !!dto.accessCompliance;
    if (dto.accessAnnouncements !== undefined) data.accessAnnouncements = !!dto.accessAnnouncements;
    if (dto.accessIncidentReports !== undefined) data.accessIncidentReports = !!dto.accessIncidentReports;
    if (dto.accessTimeTracking !== undefined) data.accessTimeTracking = !!dto.accessTimeTracking;
    if (dto.agreementStartDate !== undefined) data.agreementStartDate = dto.agreementStartDate ? new Date(dto.agreementStartDate) : null;
    if (dto.agreementEndDate !== undefined) data.agreementEndDate = dto.agreementEndDate ? new Date(dto.agreementEndDate) : null;

    if (dto.email !== undefined) {
      const email = String(dto.email || '').trim().toLowerCase();
      if (!email) throw new BadRequestException('Vendor email is required');
      const otherUser = await this.prisma.user.findUnique({ where: { email } });
      if (otherUser && otherUser.id !== existing.userId) throw new BadRequestException('A user with this email already exists');
      const otherVendor = await (this.prisma as any).vendor.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
      if (otherVendor) throw new BadRequestException('Another vendor already uses this email');
      data.email = email;
      userData.email = email;
    }

    if (dto.portalSlug !== undefined) {
      const portalSlug = this.normalizeSlug(dto.portalSlug);
      if (!portalSlug) throw new BadRequestException('Vendor portal slug is required');
      const otherVendor = await (this.prisma as any).vendor.findFirst({ where: { portalSlug, NOT: { id } }, select: { id: true } });
      if (otherVendor) throw new BadRequestException('Another vendor already uses this portal slug');
      data.portalSlug = portalSlug;
    }

    if (dto.password) {
      if (String(dto.password).trim().length < 8) throw new BadRequestException('Vendor password must be at least 8 characters');
      userData.password = await bcrypt.hash(String(dto.password), await bcrypt.genSalt());
    }

    return this.prisma.$transaction(async (tx: any) => {
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

  async setStatus(user: any, id: string, status: 'ACTIVE' | 'INACTIVE', businessIdHeader?: string) {
    const business = await this.resolveManagedBusinessId(user, businessIdHeader);
    const vendor = await (this.prisma as any).vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (vendor.businessId !== business.id) throw new ForbiddenException('Vendor does not belong to the selected business');
    const updated = await (this.prisma as any).vendor.update({
      where: { id },
      data: { status },
      include: {
        business: { select: { id: true, name: true, status: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return this.mapVendor(updated);
  }

  async getPublicBySlug(slug: string) {
    const portalSlug = this.normalizeSlug(slug);
    const vendor = await (this.prisma as any).vendor.findFirst({
      where: { portalSlug },
      include: { business: { select: { name: true, logoUrl: true } } },
    });
    if (!vendor) throw new NotFoundException('Vendor portal not found');
    return {
      companyName: vendor.companyName,
      businessName: vendor.business?.name || 'Business',
      logoUrl: vendor.business?.logoUrl || null,
      portalSlug: vendor.portalSlug,
      status: vendor.status,
      loginUrl: this.buildPortalUrl(vendor.portalSlug),
    };
  }

  async getMyProfile(user: any) {
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

  async getMyPortalData(user: any) {
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

    const [
      business,
      clientCount,
      locationCount,
      invoiceRows,
      paymentRows,
      contracts,
      complianceDocuments,
      announcements,
      incidentReports,
      timesheets,
    ] = await Promise.all([
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
      permissions.accessReports ? this.prisma.location.count({ where: { businessId, status: 'ACTIVE' } as any }) : Promise.resolve(0),
      permissions.accessReports ? this.prisma.invoice.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { client: { select: { id: true, name: true } } },
      }) : Promise.resolve([] as any[]),
      permissions.accessReports ? this.prisma.payment.findMany({
        where: { businessId },
        orderBy: { date: 'desc' },
        take: 8,
      }) : Promise.resolve([] as any[]),
      permissions.accessContracts ? this.prisma.contractDocument.findMany({
        where: {
          businessId,
          employeeId: null,
          type: { in: ['CLIENT', 'NDA', 'MSA', 'SOW', 'OTHER'] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }) : Promise.resolve([] as any[]),
      permissions.accessCompliance ? this.prisma.complianceDocument.findMany({
        where: { businessId, status: { not: 'ARCHIVED' } },
        orderBy: [{ reviewDate: 'asc' }, { updatedAt: 'desc' }],
        take: 12,
      }) : Promise.resolve([] as any[]),
      permissions.accessAnnouncements ? this.prisma.announcement.findMany({
        where: { businessId, status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }) : Promise.resolve([] as any[]),
      permissions.accessIncidentReports ? this.prisma.incidentReport.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          location: { select: { id: true, name: true } },
          reportingOfficer: { select: { id: true, firstName: true, lastName: true } },
          assignedSupervisor: { select: { id: true, firstName: true, lastName: true } },
        },
      }) : Promise.resolve([] as any[]),
      permissions.accessTimeTracking ? this.prisma.timesheet.findMany({
        where: { employee: { businessId } },
        orderBy: { startTime: 'desc' },
        take: 12,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          location: { select: { id: true, name: true } },
        },
      }) : Promise.resolve([] as any[]),
    ]);

    const invoiceTotals = invoiceRows.reduce(
      (acc: any, row: any) => {
        const total = Number(row.total || 0);
        acc.invoiced += total;
        if (!['PAID', 'VOID'].includes(String(row.status || '').toUpperCase())) {
          acc.outstanding += total;
        }
        return acc;
      },
      { invoiced: 0, outstanding: 0 }
    );
    const paymentsTotal = paymentRows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);

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
          currencyCode: business?.currencyCode || 'USD',
        },
        recentInvoices: invoiceRows.map((row: any) => ({
          id: row.id,
          invoiceNumber: row.invoiceNumber,
          clientName: row.client?.name || 'N/A',
          total: row.total,
          status: row.status,
          dueDate: row.dueDate,
          createdAt: row.createdAt,
        })),
        recentPayments: paymentRows.map((row: any) => ({
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
        ? incidentReports.map((row: any) => ({
            id: row.id,
            reportNumber: row.reportNumber,
            title: row.title,
            type: row.type,
            severity: row.severity,
            status: row.status,
            date: row.date,
            locationName: row.location?.name || null,
            reportingOfficerName: row.reportingOfficer ? `${row.reportingOfficer.firstName} ${row.reportingOfficer.lastName}`.trim() : null,
            assignedSupervisorName: row.assignedSupervisor ? `${row.assignedSupervisor.firstName} ${row.assignedSupervisor.lastName}`.trim() : null,
          }))
        : [],
      timeTracking: permissions.accessTimeTracking
        ? timesheets.map((row: any) => ({
            id: row.id,
            employeeName: `${row.employee?.firstName || ''} ${row.employee?.lastName || ''}`.trim(),
            startTime: row.startTime,
            endTime: row.endTime,
            status: row.status,
            locationName: row.location?.name || null,
            clockInIp: row.clockInIp,
            clockOutIp: row.clockOutIp,
          }))
        : [],
    };
  }
}
