import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  OFFICER_CATEGORIES,
  SHIFT_CLASSIFICATIONS,
  billingPinList,
  resolveClientPin,
} from "./shift-pin.policy";
@Injectable()
export class ShiftConfigurationService {
  constructor(private prisma: PrismaService) {}
  async authorize(
    locationId: string,
    user: any,
    businessId?: string,
    write = false,
  ) {
    if (write && !["SUPER_ADMIN", "BUSINESS_ADMIN"].includes(user.role))
      throw new ForbiddenException("Only administrators can manage shift PINs");
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, ...(businessId ? { businessId } : {}) },
    });
    if (!location) throw new NotFoundException("Location not found");
    if (user.role !== "SUPER_ADMIN") {
      const userId = user.userId || user.sub || user.id;
      const allowed = await this.prisma.business.findFirst({
        where: {
          id: location.businessId,
          OR: [{ ownerId: userId }, { employees: { some: { userId } } }],
        },
      });
      if (!allowed)
        throw new ForbiddenException("Location is outside your business");
    }
    return location;
  }
  async list(locationId: string, user: any, businessId?: string) {
    const location = await this.authorize(locationId, user, businessId);
    const [configurations, pins, audits] = await Promise.all([
      this.prisma.locationShiftConfiguration.findMany({
        where: { locationId },
        orderBy: [{ startTime: "asc" }, { officerCategory: "asc" }],
        include: { pin: true },
      }),
      this.prisma.locationShiftPin.findMany({
        where: { locationId },
        include: { configurations: true },
        orderBy: { label: "asc" },
      }),
      this.prisma.auditLog.findMany({
        where: {
          businessId: location.businessId,
          resource: "LocationShiftConfiguration",
          resourceId: locationId,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, action: true, details: true, createdAt: true },
      }),
    ]);
    return {
      locationId,
      timeZone: location.timeZone,
      billingPins: billingPinList(location.billingPins),
      configurations,
      pins,
      audits,
    };
  }
  private audit(
    tx: any,
    location: any,
    user: any,
    action: string,
    details: any,
  ) {
    return tx.auditLog.create({
      data: {
        businessId: location.businessId,
        userId: user.userId || user.sub || user.id,
        action,
        resource: "LocationShiftConfiguration",
        resourceId: location.id,
        details: JSON.stringify(details),
      },
    });
  }
  async saveConfiguration(
    locationId: string,
    user: any,
    body: any,
    businessId?: string,
  ) {
    const location = await this.authorize(locationId, user, businessId, true);
    if (!body || typeof body.name !== "string")
      throw new BadRequestException("Enter a configuration name");
    if (
      !body.name?.trim() ||
      body.name.length > 120 ||
      !Object.prototype.hasOwnProperty.call(
        OFFICER_CATEGORIES,
        body.officerCategory,
      ) ||
      !(SHIFT_CLASSIFICATIONS as readonly string[]).includes(
        body.classification,
      ) ||
      ![body.startTime, body.endTime].every(
        (t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
      ) ||
      !Number.isInteger(body.requiredOfficers) ||
      body.requiredOfficers < 1 ||
      body.requiredOfficers > 100
    )
      throw new BadRequestException(
        "Enter a name, officer category, classification, valid times and 1–100 officers",
      );
    if (typeof body.isActive !== "boolean")
      throw new BadRequestException("Choose active or inactive");
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Location" WHERE id=${locationId} FOR UPDATE`;
      const liveLocation = await tx.location.findUniqueOrThrow({
        where: { id: locationId },
      });
      const before = body.id
        ? await tx.locationShiftConfiguration.findFirst({
            where: { id: body.id, locationId },
          })
        : null;
      if (body.id && !before)
        throw new NotFoundException("Shift configuration not found");
      const pin = body.pinId
        ? await tx.locationShiftPin.findFirst({
            where: { id: body.pinId, locationId },
            include: { configurations: true },
          })
        : null;
      if (
        body.pinId &&
        (!pin ||
          !billingPinList(liveLocation.billingPins).includes(pin.billingPin))
      )
        throw new BadRequestException(
          "Choose an existing billing PIN from this location",
        );
      if (
        pin &&
        !pin.allowCrossCategory &&
        pin.configurations.some(
          (c) => c.id !== body.id && c.officerCategory !== body.officerCategory,
        )
      )
        throw new BadRequestException(
          "This PIN does not permit sharing between officer categories",
        );
      const duplicate = await tx.locationShiftConfiguration.findFirst({
        where: {
          locationId,
          officerCategory: body.officerCategory,
          startTime: body.startTime,
          endTime: body.endTime,
          isActive: true,
          ...(body.id ? { id: { not: body.id } } : {}),
        },
      });
      if (body.isActive && duplicate)
        throw new BadRequestException(
          "An active configuration already covers these times and officer category",
        );
      const data = {
        name: body.name.trim(),
        officerCategory: body.officerCategory,
        classification: body.classification,
        startTime: body.startTime,
        endTime: body.endTime,
        requiredOfficers: body.requiredOfficers,
        isActive: body.isActive,
        pinId: pin?.id || null,
      };
      const result = before
        ? await tx.locationShiftConfiguration.update({
            where: { id: before.id },
            data,
          })
        : await tx.locationShiftConfiguration.create({
            data: { ...data, locationId },
          });
      await this.audit(
        tx,
        location,
        user,
        before ? "UPDATE_SHIFT_CONFIGURATION" : "CREATE_SHIFT_CONFIGURATION",
        { before, after: result },
      );
      return result;
    });
  }
  async savePin(locationId: string, user: any, body: any, businessId?: string) {
    const location = await this.authorize(locationId, user, businessId, true);
    if (!body) throw new BadRequestException("Choose a billing PIN");
    if (
      typeof body.billingPin !== "string" ||
      !billingPinList(location.billingPins).includes(body.billingPin) ||
      typeof body.label !== "string" ||
      !body.label.trim() ||
      body.label.length > 120 ||
      typeof body.isActive !== "boolean" ||
      typeof body.allowCrossCategory !== "boolean"
    )
      throw new BadRequestException(
        "Choose an existing billing PIN, a label, and activation/sharing settings",
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Location" WHERE id=${locationId} FOR UPDATE`;
      const liveLocation = await tx.location.findUniqueOrThrow({
        where: { id: locationId },
      });
      if (!billingPinList(liveLocation.billingPins).includes(body.billingPin))
        throw new BadRequestException(
          "This billing PIN was removed from the location",
        );
      const before = body.id
        ? await tx.locationShiftPin.findFirst({
            where: { id: body.id, locationId },
            include: { configurations: true },
          })
        : null;
      if (body.id && !before) throw new NotFoundException("PIN not found");
      if (before && before.billingPin !== body.billingPin)
        throw new BadRequestException(
          "Unlink the old PIN and select the replacement billing PIN",
        );
      if (
        !body.allowCrossCategory &&
        new Set(before?.configurations.map((c) => c.officerCategory)).size > 1
      )
        throw new BadRequestException(
          "Unlink other officer categories before disabling category sharing",
        );
      const data = {
        label: body.label.trim(),
        billingPin: body.billingPin,
        isActive: body.isActive,
        allowCrossCategory: body.allowCrossCategory,
      };
      if (
        !before &&
        (await tx.locationShiftPin.findUnique({
          where: {
            locationId_billingPin: { locationId, billingPin: body.billingPin },
          },
        }))
      )
        throw new BadRequestException(
          "This billing PIN already has a record. Edit it to share across shifts.",
        );
      const result = before
        ? await tx.locationShiftPin.update({ where: { id: before.id }, data })
        : await tx.locationShiftPin.create({ data: { ...data, locationId } });
      await this.audit(
        tx,
        location,
        user,
        before ? "UPDATE_CLIENT_SHIFT_PIN" : "REGISTER_CLIENT_SHIFT_PIN",
        {
          before: before
            ? {
                id: before.id,
                label: before.label,
                isActive: before.isActive,
                allowCrossCategory: before.allowCrossCategory,
              }
            : null,
          after: {
            id: result.id,
            label: result.label,
            isActive: result.isActive,
            allowCrossCategory: result.allowCrossCategory,
          },
        },
      );
      return result;
    });
  }
  async decorate(shifts: any[], employee?: any) {
    const ids = [
      ...new Set(shifts.map((s) => s.locationId).filter(Boolean)),
    ] as string[];
    if (!ids.length) return shifts;
    const locations = await this.prisma.location.findMany({
      where: { id: { in: ids } },
      include: {
        shiftConfigurations: {
          include: { pin: { include: { configurations: true } } },
        },
      },
    });
    return shifts.map((shift) => {
      const location = locations.find((l) => l.id === shift.locationId);
      return {
        ...shift,
        clientPinAssignment: location
          ? resolveClientPin(
              shift,
              location,
              location.shiftConfigurations,
              employee || shift.employee,
            )
          : { state: "NOT_CONFIGURED", pin: null },
      };
    });
  }
  async myPins(user: any, businessId?: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId: user.userId || user.sub || user.id,
        ...(businessId ? { businessId } : {}),
      },
    });
    if (!employee) throw new ForbiddenException("Employee profile not found");
    const now = new Date();
    const shifts = await this.prisma.shift.findMany({
      where: {
        businessId: employee.businessId,
        employeeId: employee.id,
        status: "PUBLISHED",
        endTime: { gte: now },
        startTime: { lte: new Date(+now + 14 * 86400000) },
      },
      include: { location: { select: { name: true } } },
      orderBy: { startTime: "asc" },
      take: 60,
    });
    return this.decorate(shifts, employee);
  }
}
