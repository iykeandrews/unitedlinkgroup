import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';
import { UpsertComplianceDocumentDto } from './dto/upsert-compliance-document.dto';

@Injectable()
export class ComplianceDocumentsService {
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
    const owns = await this.prisma.business.findFirst({ where: { id: businessId, ownerId: userId }, select: { id: true } });
    if (!owns) throw new ForbiddenException();
  }

  async list(user: any, headerBusinessId?: string, queryBusinessId?: string, q?: any) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const where: any = { businessId };
    if (q?.status) where.status = q.status;
    if (q?.category) where.category = q.category;
    if (q?.ownerEmployeeId) where.ownerEmployeeId = q.ownerEmployeeId;
    if (q?.search) {
      const s = String(q.search).trim();
      if (s) {
        where.OR = [{ title: { contains: s, mode: 'insensitive' } }, { tags: { contains: s, mode: 'insensitive' } }];
      }
    }
    return this.prisma.complianceDocument.findMany({
      where,
      orderBy: [{ status: 'asc' }, { reviewDate: 'asc' }, { updatedAt: 'desc' }],
      include: {
        ownerEmployee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async create(user: any, headerBusinessId: string | undefined, dto: UpsertComplianceDocumentDto, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const userId = this.getUserId(user);
    return this.prisma.complianceDocument.create({
      data: {
        businessId,
        title: dto.title,
        category: dto.category || 'POLICY',
        status: dto.status || 'ACTIVE',
        version: dto.version || null,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
        ownerEmployeeId: dto.ownerEmployeeId || null,
        acknowledgementRequired: !!dto.acknowledgementRequired,
        tags: dto.tags || null,
        fileUrl: dto.fileUrl || null,
        createdByUserId: userId,
      } as any,
    });
  }

  async update(user: any, headerBusinessId: string | undefined, id: string, dto: Partial<UpsertComplianceDocumentDto>, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const existing = await this.prisma.complianceDocument.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('Compliance document not found');
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.version !== undefined) data.version = dto.version || null;
    if (dto.effectiveDate !== undefined) data.effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
    if (dto.reviewDate !== undefined) data.reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : null;
    if (dto.ownerEmployeeId !== undefined) data.ownerEmployeeId = dto.ownerEmployeeId || null;
    if (dto.acknowledgementRequired !== undefined) data.acknowledgementRequired = !!dto.acknowledgementRequired;
    if (dto.tags !== undefined) data.tags = dto.tags || null;
    if (dto.fileUrl !== undefined) data.fileUrl = dto.fileUrl || null;
    return this.prisma.complianceDocument.update({ where: { id }, data });
  }

  async delete(user: any, headerBusinessId: string | undefined, id: string, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const existing = await this.prisma.complianceDocument.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('Compliance document not found');
    return this.prisma.complianceDocument.delete({ where: { id } });
  }
}

