import { createHash } from "crypto";
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PushService } from "../push/push.service";

export function isFieldLeader(employee: any) {
  const title = `${employee?.role || ""} ${employee?.customRole?.name || ""} ${employee?.department?.name || ""}`;
  return /\b(SUPERVISOR|LIEUTENANT|LEUTENANT|LT|MANAGER)\b/i.test(title);
}
export function siteDay(value: Date | string, zone = "America/New_York") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function onSiteDate(shift: any, date: string) {
  const zone = shift.timeZone || shift.location?.timeZone || "America/New_York";
  return (
    siteDay(shift.startTime, zone) <= date &&
    siteDay(new Date(+new Date(shift.endTime) - 1), zone) >= date
  );
}
const officerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  badgeNumber: true,
  department: { select: { name: true } },
  customRole: { select: { name: true } },
};
const sheetSelect = {
  id: true,
  employeeId: true,
  locationId: true,
  startTime: true,
  endTime: true,
  status: true,
  timeZone: true,
  paidExternally: true,
  breaks: { select: { id: true, startTime: true, endTime: true, type: true } },
};
@Injectable()
export class MobileOperationsService {
  private logger = new Logger(MobileOperationsService.name);
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private push: PushService,
  ) {}
  async access(user: any) {
    const userId = user.userId || user.sub || user.id;
    if (!userId) throw new ForbiddenException("Sign in again");
    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!account) throw new ForbiddenException("Account not found");
    const businessId = user.businessId;
    if (!businessId)
      throw new BadRequestException("Select your business first");
    const [business, employee] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, ownerId: true },
      }),
      this.prisma.employee.findFirst({
        where: { userId, businessId, status: "ACTIVE" },
        include: { customRole: true, department: true },
      }),
    ]);
    if (!business) throw new ForbiddenException("Business not found");
    const canManage =
      account.role === "SUPER_ADMIN" ||
      business.ownerId === userId ||
      (!!employee && [account.role, employee.role].includes("BUSINESS_ADMIN"));
    const canView =
      canManage ||
      (!!employee &&
        isFieldLeader({
          ...employee,
          role: employee.role + " " + account.role,
        }));
    return {
      businessId,
      employeeId: employee?.id,
      canManage,
      canView,
      scope: canManage ? "BUSINESS" : "SCHEDULED_LOCATIONS",
    };
  }
  async roster(user: any, dateText?: string) {
    const access = await this.access(user);
    if (!access.canView)
      throw new ForbiddenException(
        "Team schedule access requires an administrator, supervisor or lieutenant",
      );
    const date = dateText || siteDay(new Date());
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date + "T00:00:00Z")) ||
      new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date
    )
      throw new BadRequestException("Choose a valid date");
    // Filter by the recorded site date after a broad UTC query, including overnight shifts.
    const lower = new Date(Date.parse(date + "T00:00:00Z") - 86400000),
      upper = new Date(Date.parse(date + "T00:00:00Z") + 2 * 86400000);
    let locationIds: string[] | undefined;
    if (!access.canManage) {
      const own = await this.prisma.shift.findMany({
        where: {
          businessId: access.businessId,
          employeeId: access.employeeId,
          status: { in: ["PUBLISHED", "COMPLETED"] },
          startTime: { lt: upper },
          endTime: { gt: lower },
        },
        include: { location: true },
      });
      locationIds = [
        ...new Set(
          own
            .filter((s) => onSiteDate(s, date))
            .map((s) => s.locationId)
            .filter(Boolean),
        ),
      ] as string[];
      if (!locationIds.length)
        return { ...access, date, shifts: [], active: [], officers: [] };
    }
    const shifts = await this.prisma.shift.findMany({
      where: {
        businessId: access.businessId,
        status: {
          in: access.canManage
            ? ["DRAFT", "PUBLISHED", "COMPLETED", "OPEN"]
            : ["PUBLISHED", "COMPLETED", "OPEN"],
        },
        ...(locationIds ? { locationId: { in: locationIds } } : {}),
        startTime: { lt: upper },
        endTime: { gt: lower },
      },
      select: {
        id: true,
        groupId: true,
        status: true,
        startTime: true,
        endTime: true,
        timeZone: true,
        employeeId: true,
        locationId: true,
        employee: { select: officerSelect },
        location: {
          select: { id: true, name: true, address: true, timeZone: true },
        },
      },
      orderBy: { startTime: "asc" },
    });
    const visible = shifts.filter((s) => onSiteDate(s, date));
    const drafts = new Set(
      visible.filter((s) => s.status === "DRAFT").map((s) => s.groupId || s.id),
    );
    const selected = visible.filter(
      (s) => s.status === "DRAFT" || !drafts.has(s.groupId || s.id),
    );
    const ids = [
      ...new Set(selected.map((s) => s.employeeId).filter(Boolean)),
    ] as string[];
    const sheets = await this.prisma.timesheet.findMany({
      where: {
        employee: { businessId: access.businessId },
        status: { notIn: ["DISCARDED", "REJECTED"] },
        ...(locationIds
          ? { locationId: { in: locationIds }, employeeId: { in: ids } }
          : {}),
        startTime: { lt: upper },
        OR: [{ endTime: null }, { endTime: { gt: lower } }],
      },
      select: {
        ...sheetSelect,
        employee: { select: officerSelect },
        location: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
    });
    const now = Date.now();
    const rows = selected.map((s) => {
      const attendance = sheets.filter(
        (t) =>
          t.employeeId === s.employeeId &&
          t.locationId === s.locationId &&
          +t.startTime < +s.endTime &&
          (!t.endTime || +t.endTime > +s.startTime),
      );
      const current = attendance.find((t) => !t.endTime);
      const state = current
        ? current.breaks.some((b) => !b.endTime)
          ? "ON_BREAK"
          : "CLOCKED_IN"
        : attendance.length
          ? "CLOCKED_OUT"
          : s.status === "DRAFT"
            ? "DRAFT"
            : now > +s.endTime
              ? "MISSED"
              : now > +s.startTime + 5 * 60000
                ? "LATE"
                : "SCHEDULED";
      return { ...s, attendance, state };
    });
    const officers = access.canManage
      ? await this.prisma.employee.findMany({
          where: { businessId: access.businessId, status: "ACTIVE" },
          select: officerSelect,
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        })
      : [];
    const active = access.canManage
      ? await this.prisma.timesheet.findMany({
          where: {
            employee: { businessId: access.businessId },
            endTime: null,
            status: "IN_PROGRESS",
          },
          select: {
            ...sheetSelect,
            employee: { select: officerSelect },
            location: { select: { id: true, name: true } },
          },
          orderBy: { startTime: "asc" },
        })
      : sheets.filter(
          (t) =>
            !t.endTime &&
            selected.some(
              (s) =>
                s.employeeId === t.employeeId &&
                s.locationId === t.locationId &&
                +t.startTime < +s.endTime,
            ),
        );
    return { ...access, date, shifts: rows, active, officers };
  }
  async requireAdmin(user: any, employeeId?: string) {
    const access = await this.access(user);
    if (!access.canManage)
      throw new ForbiddenException("Only administrators may change attendance");
    if (
      employeeId &&
      !(await this.prisma.employee.findFirst({
        where: {
          id: employeeId,
          businessId: access.businessId,
          status: "ACTIVE",
        },
      }))
    )
      throw new ForbiddenException("Officer is not active in this business");
    return access;
  }
  async audit(user: any, employeeId: string, action: string, details: any) {
    await this.prisma.auditLog.create({
      data: {
        businessId: user.businessId,
        userId: user.userId,
        action,
        resource: "TIMESHEET",
        resourceId: details.id,
        details: JSON.stringify({ employeeId, ...details }),
      },
    });
  }
  async requireAttendanceAdmin(user: any, id: string) {
    const access = await this.requireAdmin(user);
    if (
      !(await this.prisma.timesheet.findFirst({
        where: { id, employee: { businessId: access.businessId } },
        select: { id: true },
      }))
    )
      throw new ForbiddenException(
        "Attendance is outside the selected business",
      );
  }
  async notify(
    employeeId: string,
    event: string,
    timesheet: any,
    eventKey?: string,
  ) {
    try {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: { business: { select: { ownerId: true } } },
      });
      if (!employee) return;
      const [admins, supers] = await Promise.all([
        this.prisma.employee.findMany({
          where: {
            businessId: employee.businessId,
            status: "ACTIVE",
            OR: [
              { role: "BUSINESS_ADMIN" },
              { user: { role: "BUSINESS_ADMIN" } },
            ],
            userId: { not: null },
          },
          select: { userId: true },
        }),
        this.prisma.user.findMany({
          where: { role: "SUPER_ADMIN" },
          select: { id: true },
        }),
      ]);
      const recipients = new Set(
        [
          employee.business.ownerId,
          ...admins.map((a) => a.userId),
          ...supers.map((a) => a.id),
        ].filter(Boolean) as string[],
      );
      const title = `${employee.firstName} ${employee.lastName} ${event}`;
      const site = timesheet.locationId
        ? await this.prisma.location.findUnique({
            where: { id: timesheet.locationId },
            select: { name: true },
          })
        : null;
      const message =
        title + (site ? " at " + site.name : ". Location pending");
      const metadata = {
        kind: "ATTENDANCE",
        event,
        employeeId,
        businessId: employee.businessId,
        locationId: timesheet.locationId || null,
        timesheetId: eventKey ? undefined : timesheet.id,
        shiftId: eventKey ? timesheet.id : undefined,
        eventKey,
      };
      for (const userId of recipients) {
        if (eventKey) {
          const id = createHash("sha256")
            .update(userId + ":" + eventKey)
            .digest("hex");
          try {
            await this.prisma.notification.create({
              data: {
                id,
                userId,
                type: "ATTENDANCE",
                title,
                message,
                metadata: JSON.stringify(metadata),
              },
            });
          } catch (error: any) {
            if (error?.code === "P2002") continue;
            throw error;
          }
        } else
          await this.notifications.createNotification(
            userId,
            "ATTENDANCE",
            title,
            message,
            metadata,
          );
        await Promise.allSettled([
          this.notifications.sendPush(userId, {
            type: "ATTENDANCE",
            title,
            message,
            metadata,
            actionUrl: "/mobile/operations",
          }),
          this.push.send(userId, {
            type: "ATTENDANCE",
            title,
            message,
            metadata,
            actionUrl: "/mobile/operations",
          }),
        ]);
      }
    } catch (error) {
      this.logger.warn(
        "Attendance notification failed; attendance remains saved",
      );
    }
  }
  @Cron(CronExpression.EVERY_MINUTE)
  async lateAlerts() {
    const now = new Date();
    const shifts = await this.prisma.shift.findMany({
      where: {
        status: "PUBLISHED",
        employeeId: { not: null },
        startTime: { lte: new Date(+now - 5 * 60000) },
        endTime: { gt: now },
      },
    });
    for (const shift of shifts) {
      const attendance = await this.prisma.timesheet.findFirst({
        where: {
          employeeId: shift.employeeId!,
          locationId: shift.locationId,
          status: { notIn: ["DISCARDED", "REJECTED"] },
          startTime: { lt: shift.endTime },
          OR: [{ endTime: null }, { endTime: { gt: shift.startTime } }],
        },
      });
      if (!attendance)
        await this.notify(
          shift.employeeId!,
          "is running late",
          shift,
          `late:${shift.id}`,
        );
    }
  }
}
