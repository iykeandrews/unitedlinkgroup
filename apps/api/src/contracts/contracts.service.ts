import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';

@Injectable()
export class ContractsService {
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
    if (q?.type) where.type = q.type;
    if (q?.employeeId) where.employeeId = q.employeeId;
    if (q?.clientId) where.clientId = q.clientId;
    if (q?.from || q?.to) {
      where.effectiveDate = {};
      if (q.from) where.effectiveDate.gte = new Date(q.from);
      if (q.to) where.effectiveDate.lte = new Date(q.to);
    }
    return this.prisma.contractDocument.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, name: true } },
      },
    });
  }

  async create(user: any, headerBusinessId: string | undefined, dto: any, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const userId = this.getUserId(user);
    let status = dto.status || 'DRAFT';
    if (dto.endDate && new Date(dto.endDate) < new Date()) status = 'EXPIRED';
    return this.prisma.contractDocument.create({
      data: {
        businessId,
        title: dto.title,
        type: dto.type || 'EMPLOYMENT',
        status,
        employeeId: dto.employeeId || null,
        clientId: dto.clientId || null,
        counterpartyName: dto.counterpartyName || null,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        fileUrl: dto.fileUrl || null,
        createdByUserId: userId,
      } as any,
    });
  }

  async update(user: any, headerBusinessId: string | undefined, id: string, dto: any, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const existing = await this.prisma.contractDocument.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('Contract not found');
    const data: any = {};
    for (const k of ['title', 'type', 'status', 'employeeId', 'clientId', 'counterpartyName', 'fileUrl']) {
      if (dto[k] !== undefined) data[k] = dto[k] || null;
    }
    if (dto.effectiveDate !== undefined) data.effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.endDate && new Date(dto.endDate) < new Date()) data.status = 'EXPIRED';
    return this.prisma.contractDocument.update({ where: { id }, data });
  }

  async delete(user: any, headerBusinessId: string | undefined, id: string, queryBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const existing = await this.prisma.contractDocument.findFirst({ where: { id, businessId } });
    if (!existing) throw new NotFoundException('Contract not found');
    return this.prisma.contractDocument.delete({ where: { id } });
  }
}

