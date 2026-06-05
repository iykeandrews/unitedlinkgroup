import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@unitedlinkgroup/types';
import { CreateShiftSwapDto } from './dto/create-shift-swap.dto';

@Injectable()
export class SwapsService {
  constructor(private prisma: PrismaService) {}

  private getUserId(user: any) {
    return user?.userId || user?.sub || user?.id || null;
  }

  private isAdminRole(role: string | null | undefined) {
    return role === UserRole.SUPER_ADMIN || role === UserRole.BUSINESS_ADMIN;
  }

  private async getBusinessIdForUser(userId: string): Promise<string> {
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) return ownedBusiness.id;
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (employee) return employee.businessId;
    throw new BadRequestException('User is not associated with a business');
  }

  private async resolveBusinessId(user: any, headerBusinessId?: string, queryBusinessId?: string) {
    const fromHeaderOrQuery = queryBusinessId || headerBusinessId || null;
    if (fromHeaderOrQuery) return fromHeaderOrQuery;
    const userId = this.getUserId(user);
    if (!userId) throw new BadRequestException('Business context required');
    if (user?.role === UserRole.SUPER_ADMIN) throw new BadRequestException('Business context required');
    return this.getBusinessIdForUser(userId);
  }

  private async requireEmployeeForUser(user: any, businessId: string) {
    const userId = this.getUserId(user);
    if (!userId) throw new BadRequestException('Employee profile required');
    const employee = await this.prisma.employee.findFirst({ where: { userId, businessId } });
    if (!employee) throw new BadRequestException('Employee profile required');
    return employee;
  }

  private async assertBusinessAccess(user: any, businessId: string) {
    if (user?.role === UserRole.SUPER_ADMIN) return;
    const userId = this.getUserId(user);
    if (!userId) throw new ForbiddenException();
    const employee = await this.prisma.employee.findFirst({ where: { userId, businessId }, select: { id: true } });
    const owns = await this.prisma.business.findFirst({ where: { id: businessId, ownerId: userId }, select: { id: true } });
    if (!employee && !owns) throw new ForbiddenException();
  }

  async list(user: any, headerBusinessId?: string, queryBusinessId?: string, status?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, queryBusinessId);
    await this.assertBusinessAccess(user, businessId);
    const where: any = { businessId };
    if (status) where.status = status;
    return this.prisma.shiftSwapRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requesterEmployee: true,
        offeredShift: { include: { employee: true, location: true } } as any,
        requestedShift: { include: { employee: true, location: true } } as any,
      },
    });
  }

  async listMy(user: any, headerBusinessId?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
    const me = await this.requireEmployeeForUser(user, businessId);
    return this.prisma.shiftSwapRequest.findMany({
      where: {
        businessId,
        OR: [{ requesterEmployeeId: me.id }, { offeredEmployeeId: me.id }, { requestedEmployeeId: me.id }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        requesterEmployee: true,
        offeredShift: { include: { employee: true, location: true } } as any,
        requestedShift: { include: { employee: true, location: true } } as any,
      },
    });
  }

  async create(user: any, headerBusinessId: string | undefined, dto: CreateShiftSwapDto) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
    await this.assertBusinessAccess(user, businessId);

    const offered = await this.prisma.shift.findFirst({
      where: { id: dto.offeredShiftId, businessId },
      include: { employee: true, location: true } as any,
    });
    if (!offered) throw new NotFoundException('Offered shift not found');
    if (!offered.employeeId) throw new BadRequestException('Offered shift must be assigned');

    const requested = await this.prisma.shift.findFirst({
      where: { id: dto.requestedShiftId, businessId },
      include: { employee: true, location: true } as any,
    });
    if (!requested) throw new NotFoundException('Requested shift not found');
    if (!requested.employeeId) throw new BadRequestException('Requested shift must be assigned');

    if (offered.id === requested.id) throw new BadRequestException('Cannot swap the same shift');
    if (offered.employeeId === requested.employeeId) throw new BadRequestException('Shifts must belong to different employees');

    let requesterEmployeeId = dto.requesterEmployeeId || offered.employeeId;
    if (!requesterEmployeeId) throw new BadRequestException('Requester employee required');

    if (user?.role === UserRole.EMPLOYEE) {
      const me = await this.requireEmployeeForUser(user, businessId);
      if (me.id !== requesterEmployeeId) throw new ForbiddenException();
      if (offered.employeeId !== me.id) throw new BadRequestException('You can only offer your own shift');
    }

    const existing = await this.prisma.shiftSwapRequest.findFirst({
      where: { businessId, status: 'PENDING', offeredShiftId: offered.id, requestedShiftId: requested.id },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A pending swap request already exists for these shifts');

    return this.prisma.shiftSwapRequest.create({
      data: {
        businessId,
        requesterEmployeeId,
        offeredShiftId: offered.id,
        requestedShiftId: requested.id,
        offeredEmployeeId: offered.employeeId,
        requestedEmployeeId: requested.employeeId,
        message: dto.message || null,
        status: 'PENDING',
      } as any,
      include: {
        requesterEmployee: true,
        offeredShift: { include: { employee: true, location: true } } as any,
        requestedShift: { include: { employee: true, location: true } } as any,
      },
    });
  }

  async cancel(user: any, headerBusinessId: string | undefined, id: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
    const swap = await this.prisma.shiftSwapRequest.findFirst({ where: { id, businessId } });
    if (!swap) throw new NotFoundException('Swap request not found');
    if (swap.status !== 'PENDING') throw new BadRequestException('Only pending requests can be cancelled');

    if (user?.role === UserRole.EMPLOYEE) {
      const me = await this.requireEmployeeForUser(user, businessId);
      if (swap.requesterEmployeeId !== me.id) throw new ForbiddenException();
    }

    return this.prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: 'CANCELLED' } as any,
    });
  }

  async approve(user: any, headerBusinessId: string | undefined, id: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
    await this.assertBusinessAccess(user, businessId);
    if (!(this.isAdminRole(user?.role) || user?.role === UserRole.MANAGER)) throw new ForbiddenException();

    const swap = await this.prisma.shiftSwapRequest.findFirst({
      where: { id, businessId },
      include: { offeredShift: true, requestedShift: true } as any,
    });
    if (!swap) throw new NotFoundException('Swap request not found');
    if (swap.status !== 'PENDING') throw new BadRequestException('Only pending requests can be approved');

    const offered = await this.prisma.shift.findFirst({ where: { id: swap.offeredShiftId, businessId } });
    const requested = await this.prisma.shift.findFirst({ where: { id: swap.requestedShiftId, businessId } });
    if (!offered || !requested) throw new BadRequestException('Shifts no longer exist');

    if (!offered.employeeId || !requested.employeeId) throw new BadRequestException('Shifts must be assigned');
    if (offered.employeeId !== swap.offeredEmployeeId || requested.employeeId !== swap.requestedEmployeeId) {
      throw new BadRequestException('Shift assignments changed since request was created');
    }

    const reviewerUserId = this.getUserId(user);

    return this.prisma.$transaction(async (tx) => {
      await tx.shift.update({ where: { id: offered.id }, data: { employeeId: swap.requestedEmployeeId } as any });
      await tx.shift.update({ where: { id: requested.id }, data: { employeeId: swap.offeredEmployeeId } as any });
      return tx.shiftSwapRequest.update({
        where: { id: swap.id },
        data: { status: 'APPROVED', reviewedByUserId: reviewerUserId } as any,
        include: {
          requesterEmployee: true,
          offeredShift: { include: { employee: true, location: true } } as any,
          requestedShift: { include: { employee: true, location: true } } as any,
        },
      });
    });
  }

  async reject(user: any, headerBusinessId: string | undefined, id: string, rejectionReason?: string) {
    const businessId = await this.resolveBusinessId(user, headerBusinessId, undefined);
    await this.assertBusinessAccess(user, businessId);
    if (!(this.isAdminRole(user?.role) || user?.role === UserRole.MANAGER)) throw new ForbiddenException();

    const swap = await this.prisma.shiftSwapRequest.findFirst({ where: { id, businessId } });
    if (!swap) throw new NotFoundException('Swap request not found');
    if (swap.status !== 'PENDING') throw new BadRequestException('Only pending requests can be rejected');

    const reviewerUserId = this.getUserId(user);
    return this.prisma.shiftSwapRequest.update({
      where: { id },
      data: { status: 'REJECTED', reviewedByUserId: reviewerUserId, rejectionReason: rejectionReason || null } as any,
    });
  }
}

