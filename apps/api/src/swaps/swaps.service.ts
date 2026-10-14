import {
  fitsAvailability,
  overlapsLeave,
} from "../scheduling/availability.util";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UserRole } from "@unitedlinkgroup/types";
import { CreateShiftSwapDto } from "./dto/create-shift-swap.dto";

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
    const ownedBusiness = await this.prisma.business.findFirst({
      where: { ownerId: userId },
    });
    if (ownedBusiness) return ownedBusiness.id;
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (employee) return employee.businessId;
    throw new BadRequestException("User is not associated with a business");
  }

  private async resolveBusinessId(
    user: any,
    headerBusinessId?: string,
    queryBusinessId?: string,
  ) {
    const fromHeaderOrQuery = queryBusinessId || headerBusinessId || null;
    if (fromHeaderOrQuery) return fromHeaderOrQuery;
    const userId = this.getUserId(user);
    if (!userId) throw new BadRequestException("Business context required");
    if (user?.role === UserRole.SUPER_ADMIN)
      throw new BadRequestException("Business context required");
    return this.getBusinessIdForUser(userId);
  }

  private async requireEmployeeForUser(user: any, businessId: string) {
    const userId = this.getUserId(user);
    if (!userId) throw new BadRequestException("Employee profile required");
    const employee = await this.prisma.employee.findFirst({
      where: { userId, businessId },
    });
    if (!employee) throw new BadRequestException("Employee profile required");
    return employee;
  }

  private async assertBusinessAccess(user: any, businessId: string) {
    if (user?.role === UserRole.SUPER_ADMIN) return;
    const userId = this.getUserId(user);
    if (!userId) throw new ForbiddenException();
    const employee = await this.prisma.employee.findFirst({
      where: { userId, businessId },
      select: { id: true },
    });
    const owns = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId },
      select: { id: true },
    });
    if (!employee && !owns) throw new ForbiddenException();
  }

  async list(
    user: any,
    headerBusinessId?: string,
    queryBusinessId?: string,
    status?: string,
  ) {
    const businessId = await this.resolveBusinessId(
      user,
      headerBusinessId,
      queryBusinessId,
    );
    await this.assertBusinessAccess(user, businessId);
    const where: any = { businessId };
    if (
      status &&
      !["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)
    )
      throw new BadRequestException("Invalid swap status");
    if (status) where.status = status;
    return this.prisma.shiftSwapRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        requesterEmployee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        offeredShift: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            location: true,
          },
        } as any,
        requestedShift: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            location: true,
          },
        } as any,
      },
    });
  }

  async listMy(user: any, headerBusinessId?: string) {
    const businessId = await this.resolveBusinessId(
      user,
      headerBusinessId,
      undefined,
    );
    const me = await this.requireEmployeeForUser(user, businessId);
    return this.prisma.shiftSwapRequest.findMany({
      where: {
        businessId,
        OR: [
          { requesterEmployeeId: me.id },
          { offeredEmployeeId: me.id },
          { requestedEmployeeId: me.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        requesterEmployee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        offeredShift: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            location: true,
          },
        } as any,
        requestedShift: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            location: true,
          },
        } as any,
      },
    });
  }

  async create(
    user: any,
    headerBusinessId: string | undefined,
    dto: CreateShiftSwapDto,
  ) {
    const businessId = await this.resolveBusinessId(
      user,
      headerBusinessId,
      undefined,
    );
    await this.assertBusinessAccess(user, businessId);

    const offered = await this.prisma.shift.findFirst({
      where: { id: dto.offeredShiftId, businessId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        location: true,
      } as any,
    });
    if (!offered) throw new NotFoundException("Offered shift not found");
    if (!offered.employeeId)
      throw new BadRequestException("Offered shift must be assigned");

    const requested = await this.prisma.shift.findFirst({
      where: { id: dto.requestedShiftId, businessId },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        location: true,
      } as any,
    });
    if (!requested) throw new NotFoundException("Requested shift not found");
    if (!requested.employeeId)
      throw new BadRequestException("Requested shift must be assigned");

    if (offered.id === requested.id)
      throw new BadRequestException("Cannot swap the same shift");
    if (offered.employeeId === requested.employeeId)
      throw new BadRequestException(
        "Shifts must belong to different employees",
      );

    for (const shift of [offered, requested])
      if (
        shift.status !== "PUBLISHED" ||
        shift.startTime <= new Date() ||
        !shift.endTime ||
        shift.endTime <= shift.startTime
      )
        throw new BadRequestException(
          "Only upcoming published shifts can be swapped",
        );
    if (
      dto.requesterEmployeeId &&
      dto.requesterEmployeeId !== offered.employeeId
    )
      throw new BadRequestException("Requester must own the offered shift");
    let requesterEmployeeId = dto.requesterEmployeeId || offered.employeeId;
    if (!requesterEmployeeId)
      throw new BadRequestException("Requester employee required");

    if (user?.role === UserRole.EMPLOYEE) {
      const me = await this.requireEmployeeForUser(user, businessId);
      if (me.id !== requesterEmployeeId) throw new ForbiddenException();
      if (offered.employeeId !== me.id)
        throw new BadRequestException("You can only offer your own shift");
    }

    const existing = await this.prisma.shiftSwapRequest.findFirst({
      where: {
        businessId,
        status: "PENDING",
        offeredShiftId: offered.id,
        requestedShiftId: requested.id,
      },
      select: { id: true },
    });
    if (existing)
      throw new BadRequestException(
        "A pending swap request already exists for these shifts",
      );

    return this.prisma.shiftSwapRequest.create({
      data: {
        businessId,
        requesterEmployeeId,
        offeredShiftId: offered.id,
        requestedShiftId: requested.id,
        offeredEmployeeId: offered.employeeId,
        requestedEmployeeId: requested.employeeId,
        message: dto.message || null,
        status: "PENDING",
      } as any,
      include: {
        requesterEmployee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        offeredShift: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            location: true,
          },
        } as any,
        requestedShift: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            location: true,
          },
        } as any,
      },
    });
  }

  async cancel(user: any, headerBusinessId: string | undefined, id: string) {
    const businessId = await this.resolveBusinessId(
      user,
      headerBusinessId,
      undefined,
    );
    await this.assertBusinessAccess(user, businessId);
    const swap = await this.prisma.shiftSwapRequest.findFirst({
      where: { id, businessId },
    });
    if (!swap) throw new NotFoundException("Swap request not found");
    if (swap.status !== "PENDING")
      throw new BadRequestException("Only pending requests can be cancelled");

    if (user?.role === UserRole.EMPLOYEE) {
      const me = await this.requireEmployeeForUser(user, businessId);
      if (swap.requesterEmployeeId !== me.id) throw new ForbiddenException();
    }

    const changed = await this.prisma.shiftSwapRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "CANCELLED" } as any,
    });
    if (changed.count !== 1)
      throw new BadRequestException("Swap changed. Refresh the queue");
    return this.prisma.shiftSwapRequest.findUnique({ where: { id } });
  }

  async approve(user: any, headerBusinessId: string | undefined, id: string) {
    const businessId = await this.resolveBusinessId(
      user,
      headerBusinessId,
      undefined,
    );
    await this.assertBusinessAccess(user, businessId);
    if (!(this.isAdminRole(user?.role) || user?.role === UserRole.MANAGER))
      throw new ForbiddenException();

    const swap = await this.prisma.shiftSwapRequest.findFirst({
      where: { id, businessId },
      include: { offeredShift: true, requestedShift: true } as any,
    });
    if (!swap) throw new NotFoundException("Swap request not found");
    if (swap.status !== "PENDING")
      throw new BadRequestException("Only pending requests can be approved");

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT "id" FROM "Employee" WHERE "id" IN ($1,$2) ORDER BY "id" FOR UPDATE',
        swap.offeredEmployeeId,
        swap.requestedEmployeeId,
      );
      await tx.$queryRawUnsafe(
        'SELECT "id" FROM "Shift" WHERE "id" IN ($1,$2) ORDER BY "id" FOR UPDATE',
        swap.offeredShiftId,
        swap.requestedShiftId,
      );
      const current = await tx.shiftSwapRequest.findUnique({ where: { id } });
      if (!current || current.status !== "PENDING")
        throw new BadRequestException("Only pending requests can be approved");
      const offered = await tx.shift.findUnique({
        where: { id: swap.offeredShiftId },
      });
      const requested = await tx.shift.findUnique({
        where: { id: swap.requestedShiftId },
      });
      if (
        !offered ||
        !requested ||
        offered.employeeId !== swap.offeredEmployeeId ||
        requested.employeeId !== swap.requestedEmployeeId
      )
        throw new BadRequestException(
          "Shift assignments changed since request was created",
        );
      for (const [shift, employeeId] of [
        [offered, swap.requestedEmployeeId],
        [requested, swap.offeredEmployeeId],
      ] as const) {
        if (
          shift.status !== "PUBLISHED" ||
          shift.startTime <= new Date() ||
          !shift.endTime
        )
          throw new BadRequestException(
            "Only upcoming published shifts can be swapped",
          );
        const employee = await tx.employee.findFirst({
          where: { id: employeeId, businessId, status: "ACTIVE" },
        });
        if (!employee)
          throw new BadRequestException(
            "Both workers must be active in this business",
          );
        const overlap = await tx.shift.findFirst({
          where: {
            businessId,
            employeeId,
            id: { notIn: [offered.id, requested.id] },
            status: { in: ["PUBLISHED", "OPEN"] },
            startTime: { lt: shift.endTime },
            endTime: { gt: shift.startTime },
          },
        });
        if (overlap)
          throw new BadRequestException(
            "This swap overlaps another assigned shift",
          );
        const leave = await tx.leaveRequest.findMany({
          where: { employeeId, status: "APPROVED" },
        });
        if (
          leave.some((l) => overlapsLeave(l, shift.startTime, shift.endTime!))
        )
          throw new BadRequestException(
            "This swap conflicts with approved leave",
          );
        const availability = await tx.availability.findMany({
          where: { employeeId },
        });
        if (!fitsAvailability(availability, shift.startTime, shift.endTime))
          throw new BadRequestException(
            "This swap conflicts with worker availability",
          );
      }
      const changed = await tx.shiftSwapRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "APPROVED", reviewedByUserId: this.getUserId(user) },
      });
      if (changed.count !== 1)
        throw new BadRequestException("Swap changed. Refresh the queue");
      await tx.shift.update({
        where: { id: offered.id },
        data: { employeeId: swap.requestedEmployeeId },
      });
      await tx.shift.update({
        where: { id: requested.id },
        data: { employeeId: swap.offeredEmployeeId },
      });
      const locations = [offered.locationId, requested.locationId].filter(
        Boolean,
      ) as string[];
      const members = await tx.employee.findMany({
        where: {
          businessId,
          status: "ACTIVE",
          OR: [
            { id: { in: [swap.offeredEmployeeId, swap.requestedEmployeeId] } },
            { defaultLocationId: { in: locations } },
          ],
        },
        include: { customRole: true },
      });
      const recipients = new Set<string>(),
        supervisors = new Set<string>();
      for (const employee of members) {
        const scheduled = [
          swap.offeredEmployeeId,
          swap.requestedEmployeeId,
        ].includes(employee.id);
        const role =
          `${employee.role} ${employee.customRole?.name || ""}`.toUpperCase();
        if (employee.supervisorId) supervisors.add(employee.supervisorId);
        if (
          employee.userId &&
          (scheduled ||
            role.includes("SUPERVISOR") ||
            role.split(/\s+/).includes("MANAGER"))
        )
          recipients.add(employee.userId);
      }
      if (supervisors.size) {
        for (const employee of await tx.employee.findMany({
          where: { businessId, status: "ACTIVE", id: { in: [...supervisors] } },
          select: { userId: true },
        }))
          if (employee.userId) recipients.add(employee.userId);
      }
      for (const userId of recipients)
        await tx.notification.create({
          data: {
            userId,
            title: "Shift swap approved",
            message:
              "The approved swap updated your location schedule. Review your assigned shifts.",
            type: "INFO",
            metadata: JSON.stringify({
              kind: "SHIFT_SWAP_APPROVED",
              swapId: id,
              businessId,
              shiftIds: [offered.id, requested.id],
            }),
          },
        });
      return tx.shiftSwapRequest.findUnique({
        where: { id },
        include: {
          requesterEmployee: {
            select: { id: true, firstName: true, lastName: true },
          },
          offeredShift: { include: { location: true } },
          requestedShift: { include: { location: true } },
        },
      });
    });
  }

  async reject(
    user: any,
    headerBusinessId: string | undefined,
    id: string,
    rejectionReason?: string,
  ) {
    const businessId = await this.resolveBusinessId(
      user,
      headerBusinessId,
      undefined,
    );
    await this.assertBusinessAccess(user, businessId);
    if (!(this.isAdminRole(user?.role) || user?.role === UserRole.MANAGER))
      throw new ForbiddenException();

    const swap = await this.prisma.shiftSwapRequest.findFirst({
      where: { id, businessId },
    });
    if (!swap) throw new NotFoundException("Swap request not found");
    if (swap.status !== "PENDING")
      throw new BadRequestException("Only pending requests can be rejected");

    const reviewerUserId = this.getUserId(user);
    const changed = await this.prisma.shiftSwapRequest.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "REJECTED",
        reviewedByUserId: reviewerUserId,
        rejectionReason: rejectionReason?.trim() || null,
      } as any,
    });
    if (changed.count !== 1)
      throw new BadRequestException("Swap changed. Refresh the queue");
    return this.prisma.shiftSwapRequest.findUnique({ where: { id } });
  }
}
