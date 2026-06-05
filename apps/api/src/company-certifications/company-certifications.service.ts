import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';
import { UpsertCompanyCertificationDto } from './dto/upsert-company-certification.dto';

@Injectable()
export class CompanyCertificationsService {
  constructor(private prisma: PrismaService) {}

  private getUserId(user: any) {
    return user?.userId || user?.sub || user?.id || null;
  }

  private async resolveBusinessId(user: any, headerBusinessId?: string, queryBusinessId?: string) {
    const fromHeaderOrQuery = queryBusinessId || headerBusinessId || null;
    if (user?.role === UserRole.SUPER_ADMIN) {
      if (!fromHeaderOrQuery) throw new BadRequestException('Business context required for Super Admin');
      return fromHeaderOrQuery;
    }

    const userId = this.getUserId(user);
    if (!userId) throw new BadRequestException('Business context required');
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) return ownedBusiness.id;
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) return employee.businessId;
    throw new BadRequestException('User is not associated with a business');
  }

  private async assertBusinessAccess(user: any, businessId: string) {
    if (user?.role === UserRole.SUPER_ADMIN) return;
    if (user?.role !== UserRole.BUSINESS_ADMIN) throw new ForbiddenException();
    const userId = this.getUserId(user);
    if (!userId) throw new ForbiddenException();
    const ownedBusiness = await this.prisma.business.findFirst({ where: { id: businessId, ownerId: userId }, select: { id: true } });
    if (!ownedBusiness) throw new ForbiddenException();
  }

  async list(user: any, headerBusinessId?: string, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    return this.prisma.companyCertification.findMany({
      where: { businessId },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async create(user: any, headerBusinessId: string | undefined, dto: UpsertCompanyCertificationDto, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const userId = this.getUserId(user);

    let status = dto.status || 'ACTIVE';
    if (dto.expiryDate && new Date(dto.expiryDate) < new Date()) status = 'EXPIRED';

    return this.prisma.companyCertification.create({
      data: {
        businessId,
        name: dto.name,
        type: dto.type || 'CERTIFICATION',
        issuingOrganization: dto.issuingOrganization || null,
        credentialId: dto.credentialId || null,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        fileUrl: dto.fileUrl || null,
        status,
        createdByUserId: userId,
      } as any,
    });
  }

  async update(user: any, headerBusinessId: string | undefined, id: string, dto: Partial<UpsertCompanyCertificationDto>, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const existing = await this.prisma.companyCertification.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('Company certification not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.issuingOrganization !== undefined) data.issuingOrganization = dto.issuingOrganization || null;
    if (dto.credentialId !== undefined) data.credentialId = dto.credentialId || null;
    if (dto.issueDate !== undefined) data.issueDate = dto.issueDate ? new Date(dto.issueDate) : null;
    if (dto.expiryDate !== undefined) data.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    if (dto.fileUrl !== undefined) data.fileUrl = dto.fileUrl || null;

    if (dto.status !== undefined) {
      data.status = dto.status;
    } else if (dto.expiryDate) {
      data.status = new Date(dto.expiryDate) < new Date() ? 'EXPIRED' : 'ACTIVE';
    }

    return this.prisma.companyCertification.update({ where: { id }, data });
  }

  async delete(user: any, headerBusinessId: string | undefined, id: string, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const existing = await this.prisma.companyCertification.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('Company certification not found');
    return this.prisma.companyCertification.delete({ where: { id } });
  }
}

