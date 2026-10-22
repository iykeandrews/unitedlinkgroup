import { loadInvoiceLogo } from "../invoices/invoice-logo";
import { buildTimesheetReport, validateReportPeriod, reportPdf, reportExcel } from './timesheet-report';
import { MobileOperationsService } from "./mobile-operations.service";
import { Optional } from "@nestjs/common";
import { calculateHours, paidIntervals } from "../payroll/hours";
import { effectivePay } from "../employees/employment.util";
import { adminClockInShift } from "./admin-shift-location";
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma.service";
import { Timesheet } from "@unitedlinkgroup/database";
import * as XLSX from "xlsx";
import { NotificationsService } from "../notifications/notifications.service";
import { PushService } from "../push/push.service";

@Injectable()
export class TimeTrackingService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private push: PushService,
    @Optional() private operations?: MobileOperationsService,
  ) {}

  private async applyShortShiftBreakRule(tx: any, record: any, businessId?: string) {
    if (!record.endTime || +new Date(record.endTime) <= +new Date(record.startTime) || (+new Date(record.endTime)-+new Date(record.startTime)) >= 4*3600000) return;
    const scope = businessId || (await tx.employee.findUnique({where:{id:record.employeeId},select:{businessId:true}}))?.businessId;
    if (!scope) return;
    const business = await tx.business.findUnique({where:{id:scope},select:{settings:true}});
    let minutes = 0;
    try { minutes = JSON.parse(business?.settings || "{}").timeTrackingBreakRules?.noUnpaidBreakUnderMinutes || 0; } catch {}
    if (minutes !== 240) return;
    const changed = await tx.break.updateMany({where:{timesheetId:record.id,type:{not:"PAID"}},data:{type:"PAID"}});
    if (changed.count) {
      if (record.breaks) record.breaks = record.breaks.map((entry: any)=>({...entry,type:"PAID"}));
      await tx.auditLog.create({data:{businessId:scope,action:"SHORT_SHIFT_BREAK_DEDUCTION_EXEMPTED",resource:"TIMESHEET",resourceId:record.id,details:JSON.stringify({thresholdMinutes:240,breaksMadePaid:changed.count})}});
    }
  }

  private async validateBusinessAccess(targetBusinessId: string, user: any) {
    if (user.role === "SUPER_ADMIN") return;

    // Check if user owns the business
    const ownedBusiness = await this.prisma.business.findFirst({
      where: { ownerId: user.userId || user.sub || user.id },
    });
    if (ownedBusiness && ownedBusiness.id === targetBusinessId) return;

    // Check if user is an employee of the business
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId: user.userId || user.sub || user.id,
        businessId: targetBusinessId,
      },
    });
    if (employee) return;

    throw new BadRequestException(
      "Access denied: You do not have access to this business data",
    );
  }

  async myHistory(user: any, yearText?: string) {
    const year = Number(yearText || new Date().getUTCFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 9999)
      throw new BadRequestException("Choose a valid year");
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId: user.userId || user.sub || user.id,
        ...(user.businessId ? { businessId: user.businessId } : {}),
      },
      include: { w2Profile: true, contractorProfile: true, business: true },
    });
    if (!employee) throw new BadRequestException("Employee profile not found");
    const lower = new Date(Date.UTC(year, 0, 1)),
      upper = new Date(Date.UTC(year + 1, 0, 1));
    const sheets = await this.prisma.timesheet.findMany({
      where: {
        employeeId: employee.id,
        status: { in: ["APPROVED", "PENDING", "REJECTED"] },
        endTime: { not: null },
        startTime: { gte: new Date(+lower - 7 * 86400000), lt: upper },
      },
      include: { breaks: true, location: true },
      orderBy: { startTime: "asc" },
    });
    const parseChanges = (details: string | null) => {
      try {
        return JSON.parse(details || "{}").changes || [];
      } catch {
        return [];
      }
    };
    const changes = await this.prisma.auditLog.findMany({
      where: {
        businessId: employee.businessId,
        resource: "EMPLOYEE_RATE",
        resourceId: employee.id,
        action: "RATE_CHANGE",
      },
      orderBy: { createdAt: "asc" },
    });
    let settings: any = {};
    try {
      settings = JSON.parse(employee.business.settings || "{}");
    } catch {}
    const anchor = new Date(
      settings.payrollTaxes?.workweekAnchor || "2026-01-04T00:00:00Z",
    );
    const approved = sheets.filter((sheet) => sheet.status === "APPROVED");
    return sheets
      .filter((sheet) => sheet.startTime >= lower)
      .map((sheet) => {
        const pay = effectivePay({ ...employee, workerType: sheet.workerType });
        let rate = pay.hourlyRate,
          payType = pay.payType;
        // Recover the pay basis in force before a later rate change.
        const next = changes.find(
          (change) =>
            change.createdAt > sheet.startTime &&
            parseChanges(change.details).some(
              (entry: any) => entry.classification === sheet.workerType,
            ),
        );
        if (next) {
          const entry = parseChanges(next.details).find(
            (entry: any) => entry.classification === sheet.workerType,
          );
          rate = entry.previousRate;
          payType = entry.previousPayType;
        }
        let hours: number | null = null,
          gross: number | null = null,
          regularHours: number | null = null,
          overtimeHours: number | null = null;
        if (sheet.status === "APPROVED") {
          hours = paidIntervals(sheet).reduce(
            (total, [a, b]) => total + (b - a) / 3600000,
            0,
          );
          if (payType === "HOURLY" && typeof rate === "number" && rate > 0) {
            const result = calculateHours(
              approved
                .filter((t) => t.workerType === sheet.workerType)
                .map((t) => ({ ...t, paidExternally: false })),
              sheet.startTime,
              new Date(+sheet.endTime! - 1),
              rate,
              sheet.workerType === "W2" && pay.overtimeEligible,
              anchor,
            );
            gross = result.grossPay;
            regularHours = result.regularHours;
            overtimeHours = result.overtimeHours;
          }
        }
        return {
          id: sheet.id,
          startTime: sheet.startTime,
          endTime: sheet.endTime,
          timeZone:
            sheet.timeZone || sheet.location?.timeZone || "America/New_York",
          location: sheet.location
            ? { id: sheet.location.id, name: sheet.location.name }
            : null,
          status: sheet.status,
          approvedHours: hours,
          regularHours,
          overtimeHours,
          estimatedGross: gross,
          rate: payType === "HOURLY" ? rate : null,
          paidExternally: sheet.paidExternally,
        };
      })
      .reverse();
  }

  async exportTimesheetReport(query: any, user: any, businessId: string) {
    if (!["SUPER_ADMIN", "BUSINESS_ADMIN", "MANAGER"].includes(user?.role))
      throw new ForbiddenException("Only administrators and managers can export timesheets");
    await this.validateBusinessAccess(businessId, user);
    validateReportPeriod(query.from, query.to);
    if (!["pdf", "xlsx"].includes(query.format)) throw new BadRequestException("Choose PDF or Excel");
    const business = await this.prisma.business.findUnique({where:{id:businessId}});
    if (!business) throw new BadRequestException("Choose a business");
    // Include the preceding workweek, across all sites and statuses, for overtime.
    const lower = new Date(Date.parse(query.from) - 9 * 86400000);
    const upper = new Date(Date.parse(query.to) + 2 * 86400000);
    const sheets = await this.prisma.timesheet.findMany({
      where:{employee:{businessId},status:{in:["APPROVED","PENDING"]},startTime:{gte:lower,lt:upper}},
      include:{employee:{select:{id:true,firstName:true,lastName:true,badgeNumber:true,workerType:true,payType:true,hourlyRate:true,salary:true,overtimeEligible:true,w2Profile:true,contractorProfile:true}},location:true,breaks:true},
      orderBy:{startTime:"asc"},
    });
    const changes = await this.prisma.auditLog.findMany({
      where:{businessId,resource:"EMPLOYEE_RATE",action:"RATE_CHANGE",resourceId:{in:[...new Set(sheets.map(s=>s.employeeId))]}},
      orderBy:{createdAt:"asc"},
    });
    const report = buildTimesheetReport(business,sheets,changes,query);
    report.logo = await loadInvoiceLogo(business.logoUrl);
    return query.format === "pdf" ? reportPdf(report) : reportExcel(report);
  }

  async getUntrackedShifts(employeeId: string | undefined, user: any, businessId?: string) {
    if (!["SUPER_ADMIN", "BUSINESS_ADMIN"].includes(user?.role))
      throw new ForbiddenException(
        "Only administrators can view missing attendance",
      );
    const employee = employeeId ? await this.prisma.employee.findUnique({
      where: { id: employeeId },
    }) : null;
    if (employeeId && !employee) throw new BadRequestException("Choose an employee");
    const scope = employee?.businessId || businessId;
    if (!scope) throw new BadRequestException("Choose a business");
    await this.validateBusinessAccess(scope, user);
    const shifts = await this.prisma.shift.findMany({
      where: {
        businessId: scope,
        ...(employee ? { employeeId: employee.id } : { employeeId: { not: null } }),
        locationId: { not: null },
        endTime: { lte: new Date() },
        status: { in: ["DRAFT", "PUBLISHED", "OPEN", "COMPLETED"] },
      },
      include: { location: true },
      orderBy: { startTime: "desc" },
    });
    if (!shifts.length) return [];
    const drafts = await this.prisma.shift.findMany({
      where: {
        businessId: scope,
        status: "DRAFT",
        groupId: { in: shifts.map((s) => s.groupId || s.id) },
      },
    });
    const byGroup = new Map(drafts.map((s) => [s.groupId || s.id, s.id]));
    const records = await this.prisma.timesheet.findMany({
      where: {
        employeeId: { in: [...new Set(shifts.map((s) => s.employeeId).filter((id): id is string => !!id))] },
        status: { notIn: ["DISCARDED", "REJECTED"] },
      },
    });
    const groups = new Set<string>();
    return shifts
      .filter((shift) => {
        const group = shift.groupId || shift.id;
        if (
          groups.has(group) ||
          (byGroup.has(group) && byGroup.get(group) !== shift.id)
        )
          return false;
        groups.add(group);
        return !records.some(
          (record) =>
            record.employeeId === shift.employeeId &&
            record.locationId === shift.locationId &&
            record.startTime < shift.endTime &&
            (!record.endTime || record.endTime > shift.startTime),
        );
      })
      .map((shift) => ({
        id: shift.id,
        employeeId: shift.employeeId,
        locationId: shift.locationId,
        locationName: shift.location?.name || "Location",
        startTime: shift.startTime,
        endTime: shift.endTime,
        timeZone:
          shift.timeZone || shift.location?.timeZone || "America/New_York",
        breakMinutes: shift.breakMinutes,
      }));
  }

  async createManualTimesheet(data: any, user: any) {
    if (!["SUPER_ADMIN", "BUSINESS_ADMIN"].includes(user?.role))
      throw new ForbiddenException(
        "Only administrators can add manual timesheets",
      );
    const employee = await this.prisma.employee.findUnique({
      where: { id: String(data.employeeId || "") },
    });
    if (!employee) throw new BadRequestException("Choose an employee");
    await this.validateBusinessAccess(employee.businessId, user);
    const location = await this.prisma.location.findFirst({
      where: {
        id: String(data.locationId || ""),
        businessId: employee.businessId,
      },
    });
    if (!location)
      throw new BadRequestException("Choose a location from this business");
    const startTime = new Date(data.startTime),
      endTime = new Date(data.endTime);
    if (
      !Number.isFinite(+startTime) ||
      !Number.isFinite(+endTime) ||
      endTime <= startTime ||
      endTime > new Date()
    )
      throw new BadRequestException(
        "Enter completed clock-in and clock-out times, with clock-out after clock-in",
      );
    const timeZone = data.timeZone || location.timeZone || "America/New_York";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone }).format(startTime);
    } catch {
      throw new BadRequestException("Invalid record time zone");
    }
    if (
      employee.workerType === "BOTH" &&
      !["W2", "CONTRACTOR_1099"].includes(data.workerType)
    )
      throw new BadRequestException("Select W-2 or 1099 for this timesheet");
    if (data.breaks !== undefined && !Array.isArray(data.breaks))
      throw new BadRequestException("Invalid breaks");
    const breaks = (data.breaks || [])
      .map((entry: any) => ({
        startTime: new Date(entry.startTime),
        endTime: new Date(entry.endTime),
        type: entry.type || "UNPAID",
      }))
      .sort((a: any, b: any) => +a.startTime - +b.startTime);
    for (let i = 0; i < breaks.length; i++) {
      const entry = breaks[i];
      if (
        !["PAID", "UNPAID"].includes(entry.type) ||
        !Number.isFinite(+entry.startTime) ||
        !Number.isFinite(+entry.endTime) ||
        entry.startTime < startTime ||
        entry.endTime > endTime ||
        entry.endTime <= entry.startTime
      )
        throw new BadRequestException(
          "Every break must have valid start and end times within the worked period",
        );
      if (i && entry.startTime < breaks[i - 1].endTime)
        throw new BadRequestException("Breaks cannot overlap");
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE',
        employee.id,
      );
      if (data.shiftId) {
        const shift = await tx.shift.findFirst({
          where: { id: data.shiftId, businessId: employee.businessId },
        });
        if (
          !shift ||
          shift.employeeId !== employee.id ||
          shift.locationId !== location.id ||
          ["ARCHIVED", "CANCELLED"].includes(shift.status)
        )
          throw new BadRequestException(
            "The shift assignment changed; review the employee and location before recording time",
          );
        if (shift.endTime > new Date())
          throw new BadRequestException("Choose a completed scheduled shift");
        const tracked = await tx.timesheet.findFirst({
          where: {
            employeeId: employee.id,
            locationId: location.id,
            status: { notIn: ["DISCARDED", "REJECTED"] },
            startTime: { lt: shift.endTime },
            OR: [{ endTime: null }, { endTime: { gt: shift.startTime } }],
          },
        });
        if (tracked)
          throw new BadRequestException(
            "This scheduled shift already has a clock-in record; refresh the list",
          );
      }
      const overlap = await tx.timesheet.findFirst({
        where: {
          employeeId: employee.id,
          status: { notIn: ["DISCARDED", "REJECTED"] },
          startTime: { lt: endTime },
          OR: [{ endTime: null }, { endTime: { gt: startTime } }],
        },
      });
      if (overlap)
        throw new BadRequestException(
          "This employee already has an overlapping attendance record",
        );
      const created = await tx.timesheet.create({
        data: {
          employeeId: employee.id,
          locationId: location.id,
          startTime,
          endTime,
          timeZone,
          workerType:
            employee.workerType === "BOTH"
              ? data.workerType
              : employee.workerType,
          status: "PENDING",
          clockInIp: "Manual admin entry",
          clockOutIp: "Manual admin entry",
          employeeNote:
            typeof data.employeeNote === "string"
              ? data.employeeNote.trim()
              : null,
          breaks: { create: breaks },
        },
        include: { breaks: true },
      });
      await this.applyShortShiftBreakRule(tx, created, employee.businessId);
      await tx.auditLog.create({
        data: {
          businessId: employee.businessId,
          userId: user.userId || user.sub || user.id,
          action: "CREATE_MANUAL_TIMESHEET",
          resource: "Timesheet",
          resourceId: created.id,
          details: JSON.stringify({
            employeeId: employee.id,
            locationId: location.id,
            startTime,
            endTime,
            timeZone,
            breaks,
            shiftId: data.shiftId || null,
            status: "PENDING",
          }),
        },
      });
      return created;
    });
  }

  async importTimesheets(
    fileBuffer: Buffer,
    businessId: string,
    user: any,
  ): Promise<any> {
    await this.validateBusinessAccess(businessId, user);

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    let count = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        // Expected columns: EmployeeEmail, Date, StartTime, EndTime
        const email = row["EmployeeEmail"] || row["Email"];
        const dateStr = row["Date"]; // YYYY-MM-DD
        const startStr = row["StartTime"]; // HH:mm
        const endStr = row["EndTime"]; // HH:mm

        if (!email || !dateStr || !startStr || !endStr) {
          errors.push(
            "Each row needs employee email, date, start and end time",
          );
          continue;
        }

        const employee = await this.prisma.employee.findFirst({
          where: {
            businessId,
            OR: [{ email: email }, { user: { email: email } }],
          },
        });

        if (!employee) {
          errors.push(`Employee not found for ${email}`);
          continue;
        }

        const start = new Date(`${dateStr}T${startStr}`);
        const end = new Date(`${dateStr}T${endStr}`);
        if (
          !Number.isFinite(start.getTime()) ||
          !Number.isFinite(end.getTime())
        )
          throw new BadRequestException("Invalid date or time");
        if (end < start) end.setDate(end.getDate() + 1);
        if (end <= start || end > new Date())
          throw new BadRequestException(
            "Imported timesheets must be completed with valid start and end times",
          );
        const duplicate = await this.prisma.timesheet.findFirst({
          where: { employeeId: employee.id, startTime: start },
        });
        if (duplicate)
          throw new BadRequestException(
            "Timesheet already exists for this employee and start time",
          );

        if (
          employee.workerType === "BOTH" &&
          row["WorkerType"] &&
          !["W2", "CONTRACTOR_1099"].includes(
            String(row["WorkerType"]).toUpperCase(),
          )
        )
          throw new BadRequestException(
            "WorkerType must be W2 or CONTRACTOR_1099",
          );
        await this.prisma.timesheet.create({
          data: {
            employeeId: employee.id,
            workerType:
              employee.workerType === "BOTH"
                ? String(row["WorkerType"] || "W2").toUpperCase()
                : employee.workerType,
            startTime: start,
            endTime: end,
            status: "PENDING",
            clockInIp: "Imported",
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        count++;
      } catch (e: any) {
        errors.push(
          `Failed to import row: ${JSON.stringify(row)} - ${e.message}`,
        );
      }
    }

    return { count, errors };
  }

  async getEmployeeRecord(
    userId: string,
    businessId?: string,
    user?: any,
  ): Promise<string> {
    const where: any = { userId };
    if (businessId) {
      if (user) await this.validateBusinessAccess(businessId, user);
      where.businessId = businessId;
    }

    const employee = await this.prisma.employee.findFirst({
      where,
    });

    if (!employee) {
      throw new BadRequestException("Employee record not found for this user");
    }
    return employee.id;
  }

  async clockIn(
    employeeId: string,
    locationId: string | undefined,
    lat: number | undefined,
    lng: number | undefined,
    ip?: string,
    opts?: { bypassGeofence?: boolean; workerType?: string; timeZone?: string },
  ): Promise<Timesheet> {
    // Check if already clocked in
    const activeTimesheet = await this.prisma.timesheet.findFirst({
      where: {
        employeeId,
        endTime: null,
      },
    });

    if (activeTimesheet) {
      throw new BadRequestException(`This officer is already clocked in. Clock out the officer in Time & Attendance before attempting another clock-in.`);
    }

    const employment = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { workerType: true },
    });
    if (!employment) throw new BadRequestException("Employee not found");
    const workerType =
      opts?.workerType ||
      (employment.workerType === "CONTRACTOR_1099" ? "CONTRACTOR_1099" : "W2");
    if (
      !["W2", "CONTRACTOR_1099"].includes(workerType) ||
      (employment.workerType !== "BOTH" && workerType !== employment.workerType)
    )
      throw new BadRequestException(
        "Clock-in classification must match the employee employment info",
      );
    if (!opts?.bypassGeofence) {
      if (!locationId) {
        throw new BadRequestException(
          "Shift location is required for clock-in",
        );
      }

      const hasCoords =
        typeof lat === "number" &&
        Number.isFinite(lat) &&
        typeof lng === "number" &&
        Number.isFinite(lng);
      if (!hasCoords) {
        throw new BadRequestException(
          "Location permission is required to clock in",
        );
      }

      const [employee, location] = await Promise.all([
        this.prisma.employee.findUnique({
          where: { id: employeeId },
          select: { businessId: true },
        }),
        this.prisma.location.findUnique({
          where: { id: locationId },
          select: {
            id: true,
            businessId: true,
            name: true,
            geoLat: true,
            geoLng: true,
            radius: true,
          },
        }),
      ]);
      if (!employee) throw new BadRequestException("Employee not found");
      if (!location)
        throw new BadRequestException("Clock-in location not found");
      if (location.businessId !== employee.businessId)
        throw new BadRequestException("Invalid clock-in location");
      if (
        typeof location.geoLat !== "number" ||
        typeof location.geoLng !== "number"
      ) {
        throw new BadRequestException(
          "Clock-in geofence is not configured for this site",
        );
      }

      const radiusMeters =
        typeof location.radius === "number" &&
        Number.isFinite(location.radius) &&
        location.radius > 0
          ? location.radius
          : 100;
      const distance = this.calculateDistance(
        lat,
        lng,
        location.geoLat,
        location.geoLng,
      );
      if (distance > radiusMeters) {
        throw new BadRequestException(
          `You are about ${Math.round(distance)}m from ${location.name}. You must be within ${radiusMeters}m to clock in`,
        );
      }
    }

    const siteZone = locationId
      ? await this.prisma.location.findUnique({
          where: { id: locationId },
          select: { timeZone: true },
        })
      : null;
    const timesheet = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE', employeeId,
      );
      const existing = await tx.timesheet.findFirst({ where: { employeeId, endTime: null } });
      if (existing) {
        throw new BadRequestException("This officer is already clocked in. Clock out the officer in Time & Attendance before attempting another clock-in.");
      }
      return tx.timesheet.create({
        data: {
          timeZone: opts?.timeZone || siteZone?.timeZone || "America/New_York",
          employeeId,
          workerType,
          startTime: new Date(),
          status: "IN_PROGRESS",
          locationId: locationId || undefined,
          clockInIp: ip,
          clockInLat:
            typeof lat === "number" && Number.isFinite(lat) ? lat : undefined,
          clockInLng:
            typeof lng === "number" && Number.isFinite(lng) ? lng : undefined,
        },
      });
    });

    void this.operations?.notify(employeeId, "clocked in", timesheet);
    return timesheet;
  }

  private async validateWithinClockLocation(
    employeeId: string,
    locationId: string | undefined,
    lat?: number,
    lng?: number,
  ) {
    if (!locationId) {
      throw new BadRequestException("Shift location is required");
    }

    const hasCoords =
      typeof lat === "number" &&
      Number.isFinite(lat) &&
      typeof lng === "number" &&
      Number.isFinite(lng);
    if (!hasCoords) {
      throw new BadRequestException("Location permission is required");
    }

    const [employee, location] = await Promise.all([
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { businessId: true },
      }),
      this.prisma.location.findUnique({
        where: { id: locationId },
        select: {
          id: true,
          businessId: true,
          name: true,
          geoLat: true,
          geoLng: true,
          radius: true,
        },
      }),
    ]);

    if (!employee) throw new BadRequestException("Employee not found");
    if (!location) throw new BadRequestException("Clock location not found");
    if (location.businessId !== employee.businessId)
      throw new BadRequestException("Invalid clock location");
    if (
      typeof location.geoLat !== "number" ||
      typeof location.geoLng !== "number"
    ) {
      throw new BadRequestException(
        "Clock-in geofence is not configured for this site",
      );
    }

    const radiusMeters =
      typeof location.radius === "number" &&
      Number.isFinite(location.radius) &&
      location.radius > 0
        ? location.radius
        : 100;
    const distance = this.calculateDistance(
      lat,
      lng,
      location.geoLat,
      location.geoLng,
    );
    if (distance > radiusMeters) {
      throw new BadRequestException(
        `You are about ${Math.round(distance)}m from ${location.name}. You must be within ${radiusMeters}m to continue`,
      );
    }
  }

  private async getClockLocationStatus(
    employeeId: string,
    locationId: string | undefined,
    lat?: number,
    lng?: number,
  ) {
    if (!locationId) {
      throw new BadRequestException("Shift location is required");
    }

    const hasCoords =
      typeof lat === "number" &&
      Number.isFinite(lat) &&
      typeof lng === "number" &&
      Number.isFinite(lng);
    if (!hasCoords) {
      throw new BadRequestException("Location permission is required");
    }

    const [employee, location] = await Promise.all([
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          businessId: true,
          userId: true,
          firstName: true,
          lastName: true,
        },
      }),
      this.prisma.location.findUnique({
        where: { id: locationId },
        select: {
          id: true,
          businessId: true,
          name: true,
          address: true,
          geoLat: true,
          geoLng: true,
          radius: true,
        },
      }),
    ]);

    if (!employee) throw new BadRequestException("Employee not found");
    if (!location) throw new BadRequestException("Clock location not found");
    if (location.businessId !== employee.businessId)
      throw new BadRequestException("Invalid clock location");
    if (
      typeof location.geoLat !== "number" ||
      typeof location.geoLng !== "number"
    ) {
      throw new BadRequestException(
        "Clock-in geofence is not configured for this site",
      );
    }

    const radiusMeters =
      typeof location.radius === "number" &&
      Number.isFinite(location.radius) &&
      location.radius > 0
        ? location.radius
        : 100;
    const distance = this.calculateDistance(
      lat,
      lng,
      location.geoLat,
      location.geoLng,
    );
    const within = distance <= radiusMeters;

    return {
      within,
      distanceMeters: distance,
      radiusMeters,
      location,
      employee,
    };
  }

  async locationPing(employeeId: string, lat?: number, lng?: number) {
    const activeTimesheet = await this.prisma.timesheet.findFirst({
      where: { employeeId, endTime: null },
      include: {
        breaks: { where: { endTime: null } },
        location: true,
        employee: true,
      } as any,
      orderBy: { startTime: "desc" },
    });

    if (!activeTimesheet) {
      throw new BadRequestException("No active timesheet found");
    }

    if (!activeTimesheet.locationId) {
      return { ok: true, status: "NO_LOCATION" };
    }

    const onBreak =
      Array.isArray((activeTimesheet as any).breaks) &&
      (activeTimesheet as any).breaks.length > 0;
    if (onBreak) {
      return { ok: true, status: "ON_BREAK" };
    }

    const outsideBreak = await this.prisma.break.findFirst({
      where: {
        timesheetId: activeTimesheet.id,
        endTime: null,
        type: "UNPAID_OUTSIDE",
      },
      orderBy: { startTime: "desc" },
    });

    const status = await this.getClockLocationStatus(
      employeeId,
      activeTimesheet.locationId || undefined,
      lat,
      lng,
    );

    if (!status.within) {
      if (outsideBreak) {
        return {
          ok: true,
          status: "OUTSIDE",
          distanceMeters: Math.round(status.distanceMeters),
          radiusMeters: status.radiusMeters,
        };
      }

      const created = await this.prisma.break.create({
        data: {
          timesheetId: activeTimesheet.id,
          startTime: new Date(),
          type: "UNPAID_OUTSIDE",
        },
      });

      const employeeName =
        `${status.employee.firstName || ""} ${status.employee.lastName || ""}`.trim() ||
        "Employee";
      const siteName = status.location?.name || "site";
      const siteAddress = status.location?.address || "";
      const msg = `${employeeName} left ${siteName}${siteAddress ? ` (${siteAddress})` : ""}. Outside: ${Math.round(status.distanceMeters)}m (radius ${status.radiusMeters}m).`;

      await this.notifyLeavingSite({
        employeeId,
        businessId: status.employee.businessId,
        employeeUserId: status.employee.userId || undefined,
        title: "Employee left site",
        message: msg,
        metadata: {
          kind: "LEFT_SITE",
          timesheetId: activeTimesheet.id,
          employeeId,
          locationId: status.location.id,
          breakId: created.id,
        },
      });

      return {
        ok: true,
        status: "LEFT_SITE",
        distanceMeters: Math.round(status.distanceMeters),
        radiusMeters: status.radiusMeters,
      };
    }

    if (outsideBreak) {
      await this.prisma.break.update({
        where: { id: outsideBreak.id },
        data: { endTime: new Date() },
      });
      return { ok: true, status: "BACK_ON_SITE" };
    }

    return { ok: true, status: "ON_SITE" };
  }

  private async notifyLeavingSite(args: {
    employeeId: string;
    businessId: string;
    employeeUserId?: string;
    title: string;
    message: string;
    metadata?: any;
  }) {
    const [business, adminEmployees, superAdmins] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: args.businessId },
        select: { ownerId: true },
      }),
      this.prisma.employee.findMany({
        where: {
          businessId: args.businessId,
          role: { in: ["BUSINESS_ADMIN", "MANAGER"] },
          userId: { not: null },
        },
        select: { userId: true },
      }),
      this.prisma.user.findMany({
        where: { role: "SUPER_ADMIN" },
        select: { id: true },
      }),
    ]);

    const recipientIds = new Set<string>();
    if (args.employeeUserId) recipientIds.add(args.employeeUserId);
    if (business?.ownerId) recipientIds.add(business.ownerId);
    for (const e of adminEmployees) if (e.userId) recipientIds.add(e.userId);
    for (const u of superAdmins) recipientIds.add(u.id);

    const recipients = Array.from(recipientIds);
    await Promise.all(
      recipients.map(async (userId) => {
        await this.notifications.createNotification(
          userId,
          "WARNING",
          args.title,
          args.message,
          args.metadata,
        );
        await this.notifications.sendPush(userId, {
          type: "WARNING",
          title: args.title,
          message: args.message,
          metadata: args.metadata,
        });
        await this.push.send(userId, {
          type: "WARNING",
          title: args.title,
          message: args.message,
          metadata: args.metadata,
          actionUrl: "/dashboard/time",
        });
      }),
    );
  }

  async requireClockInShift(employeeId: string) {
    const now = new Date();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const shift = await this.prisma.shift.findFirst({
      where: {
        employeeId,
        status: "PUBLISHED",
        startTime: { lt: endOfToday },
        endTime: { gt: now },
      } as any,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        locationId: true,
        timeZone: true,
      },
      orderBy: { startTime: "asc" },
    });
    if (!shift) {
      throw new BadRequestException(
        "No scheduled shift available for clock-in today",
      );
    }
    if (!shift.locationId) {
      throw new BadRequestException(
        "This shift has no assigned site. Contact your manager.",
      );
    }
    return shift;
  }

  async adminClockIn(
    employeeId: string,
    _locationId?: string,
    user?: any,
  ): Promise<any> {
    await this.operations?.requireAdmin(user, employeeId);
    if (!["SUPER_ADMIN", "BUSINESS_ADMIN"].includes(user?.role))
      throw new ForbiddenException(
        "Only administrators can clock in an employee",
      );
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new BadRequestException("Employee not found");
    await this.validateBusinessAccess(employee.businessId, user);
    const now = new Date();
    const shifts = await this.prisma.shift.findMany({
      where: {
        employeeId,
        businessId: employee.businessId,
        status: "PUBLISHED",
        endTime: { gt: now },
        startTime: { lte: new Date(+now + 86400000) },
      },
      include: { location: true },
      orderBy: { startTime: "asc" },
    });
    const shift = adminClockInShift(shifts, now, employee.businessId);
    // No default site or synthetic schedule: unassigned time can be reviewed by an admin.
    const result = await this.clockIn(
      employeeId,
      shift?.locationId || undefined,
      undefined,
      undefined,
      undefined,
      {
        bypassGeofence: true,
        timeZone: shift?.timeZone || shift?.location?.timeZone || undefined,
      },
    );
    await this.operations?.audit(user, employeeId, "ADMIN_CLOCK_IN", {
      id: result.id,
    });
    return result;
  }

  async adminClockOut(employeeId: string, user?: any): Promise<any> {
    await this.operations?.requireAdmin(user, employeeId);
    if (!["SUPER_ADMIN", "BUSINESS_ADMIN"].includes(user?.role))
      throw new ForbiddenException(
        "Only administrators may clock out officers",
      );
    if (user) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) throw new BadRequestException("Employee not found");
      await this.validateBusinessAccess(employee.businessId, user);
    }

    // 1. Check for active break and end it if exists (Force end break)
    const activeTimesheet = await this.prisma.timesheet.findFirst({
      where: {
        employeeId,
        endTime: null,
      },
    });

    if (activeTimesheet) {
      const activeBreak = await this.prisma.break.findFirst({
        where: {
          timesheetId: activeTimesheet.id,
          endTime: null,
        },
      });

      if (activeBreak) {
        await this.prisma.break.update({
          where: { id: activeBreak.id },
          data: { endTime: new Date() },
        });
      }
    }

    // 2. Clock Out (update timesheet)
    const timesheet = await this.clockOut(employeeId);

    await this.operations?.audit(user, employeeId, "ADMIN_CLOCK_OUT", {
      id: timesheet.id,
    });

    return timesheet;
  }

  async clockOut(
    employeeId: string,
    ip?: string,
    note?: string,
    lat?: number,
    lng?: number,
  ): Promise<Timesheet> {
    const activeTimesheet = await this.prisma.timesheet.findFirst({
      where: {
        employeeId,
        endTime: null,
      },
    });

    if (!activeTimesheet) {
      throw new BadRequestException(
        "No active timesheet found to clock out from",
      );
    }

    // Check if there is an active break
    const activeBreak = await this.prisma.break.findFirst({
      where: {
        timesheetId: activeTimesheet.id,
        endTime: null,
      },
    });

    if (activeBreak) {
      throw new BadRequestException(
        "You must end your break before clocking out",
      );
    }

    const result = await this.prisma.$transaction(async tx => {
    const updated = await tx.timesheet.update({
      where: { id: activeTimesheet.id },
      data: {
        endTime: new Date(),
        status: "PENDING", // Pending approval
        clockOutIp: ip,
        clockOutLat:
          typeof lat === "number" && Number.isFinite(lat) ? lat : undefined,
        clockOutLng:
          typeof lng === "number" && Number.isFinite(lng) ? lng : undefined,
        employeeNote: note,
      },
    });
    await this.applyShortShiftBreakRule(tx, updated);
    return updated;
    }, {timeout:15000});
    void this.operations?.notify(employeeId, "clocked out", result);
    return result;
  }

  async startBreak(
    employeeId: string,
    type: string = "UNPAID",
    lat?: number,
    lng?: number,
  ): Promise<any> {
    const activeTimesheet = await this.prisma.timesheet.findFirst({
      where: {
        employeeId,
        endTime: null,
      },
    });

    if (!activeTimesheet) {
      throw new BadRequestException(
        "No active timesheet found to start a break",
      );
    }

    await this.validateWithinClockLocation(
      employeeId,
      activeTimesheet.locationId || undefined,
      lat,
      lng,
    );

    const activeBreak = await this.prisma.break.findFirst({
      where: {
        timesheetId: activeTimesheet.id,
        endTime: null,
      },
    });

    if (activeBreak) {
      throw new BadRequestException("You are already on a break");
    }

    const normalizedType =
      String(type || "").toUpperCase() === "PAID" ? "PAID" : "UNPAID";
    const result = await this.prisma.break.create({
      data: {
        timesheetId: activeTimesheet.id,
        startTime: new Date(),
        type: normalizedType,
      },
    });
    void this.operations?.notify(
      employeeId,
      "started a break",
      activeTimesheet,
    );
    return result;
  }

  async endBreak(employeeId: string, lat?: number, lng?: number): Promise<any> {
    const activeTimesheet = await this.prisma.timesheet.findFirst({
      where: {
        employeeId,
        endTime: null,
      },
    });

    if (!activeTimesheet) {
      throw new BadRequestException("No active timesheet found");
    }

    await this.validateWithinClockLocation(
      employeeId,
      activeTimesheet.locationId || undefined,
      lat,
      lng,
    );

    const activeBreak = await this.prisma.break.findFirst({
      where: {
        timesheetId: activeTimesheet.id,
        endTime: null,
      },
    });

    if (!activeBreak) {
      throw new BadRequestException("No active break found to end");
    }

    const result = await this.prisma.break.update({
      where: { id: activeBreak.id },
      data: {
        endTime: new Date(),
      },
    });
    void this.operations?.notify(
      employeeId,
      "returned from break",
      activeTimesheet,
    );
    return result;
  }

  async adminBreak(
    employeeId: string,
    action: string,
    type: string | undefined,
    user: any,
  ) {
    if (!["start", "end"].includes(action))
      throw new BadRequestException("Choose start or end break");
    if (type && !["PAID", "UNPAID"].includes(type))
      throw new BadRequestException("Invalid break type");
    await this.operations?.requireAdmin(user, employeeId);
    if (!["SUPER_ADMIN", "BUSINESS_ADMIN"].includes(user?.role))
      throw new ForbiddenException("Only administrators may manage breaks");
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new BadRequestException("Officer not found");
    await this.validateBusinessAccess(employee.businessId, user);
    const sheet = await this.prisma.timesheet.findFirst({
      where: { employeeId, endTime: null },
      include: { breaks: true },
    });
    if (!sheet) throw new BadRequestException("Officer is not clocked in");
    const active = sheet.breaks.find((b) => !b.endTime);
    if (action === "start" && active)
      throw new BadRequestException("Officer is already on break");
    if (action === "end" && !active)
      throw new BadRequestException("No active break");
    const result =
      action === "start"
        ? await this.prisma.break.create({
            data: {
              timesheetId: sheet.id,
              startTime: new Date(),
              type: type || "UNPAID",
            },
          })
        : await this.prisma.break.update({
            where: { id: active!.id },
            data: { endTime: new Date() },
          });
    await this.operations?.audit(
      user,
      employeeId,
      action === "start" ? "ADMIN_BREAK_START" : "ADMIN_BREAK_END",
      { id: sheet.id, breakId: result.id, type: result.type },
    );
    void this.operations?.notify(
      employeeId,
      action === "start" ? "started a break" : "returned from break",
      sheet,
    );
    return result;
  }

  async getEmployeeStatus(employeeId: string, user?: any) {
    if (user) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (employee)
        await this.validateBusinessAccess(employee.businessId, user);
    }
    const activeTimesheet = await this.prisma.timesheet.findFirst({
      where: {
        employeeId,
        endTime: null,
      },
      include: {
        breaks: {
          where: { endTime: null },
        },
      },
    });

    if (!activeTimesheet) {
      return { status: "CLOCKED_OUT", startTime: null };
    }

    if (activeTimesheet.breaks.length > 0) {
      return {
        status: "ON_BREAK",
        startTime: activeTimesheet.startTime,
        breakStartTime: activeTimesheet.breaks[0].startTime,
      };
    }

    return { status: "CLOCKED_IN", startTime: activeTimesheet.startTime };
  }

  async getTimesheets(
    employeeId: string,
    start: Date,
    end: Date,
    user?: any,
  ): Promise<Timesheet[]> {
    if (user) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (employee)
        await this.validateBusinessAccess(employee.businessId, user);
    }

    this.validateRange(start, end);
    const where: any = {
      employeeId,
      startTime: { lte: end },
      OR: [{ endTime: { gt: start } }, { endTime: null }],
    };

    return this.prisma.timesheet.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            hourlyRate: true,
            salary: true,
            payType: true,
            overtimeEligible: true,
            w2Profile: {
              select: { rate: true, payType: true, overtimeEligible: true },
            },
            contractorProfile: { select: { rate: true } },
            workerType: true,
            role: true,
          },
        },
        breaks: true,
        location: true,
      } as any,
    });
  }

  async updateTimesheet(id: string, data: any, user?: any): Promise<Timesheet> {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!timesheet) throw new BadRequestException("Timesheet not found");
    if (timesheet.paidExternally)
      throw new BadRequestException(
        "This historical timesheet was already paid externally and is read-only.",
      );

    if (user) {
      await this.validateBusinessAccess(timesheet.employee.businessId, user);
    }

    const paid = await this.prisma.payStub.findFirst({
      where: {
        employeeId: timesheet.employeeId,
        payroll: {
          status: "PAID",
          periodStart: { lte: timesheet.endTime || new Date() },
          periodEnd: {
            gte: new Date(
              timesheet.startTime.toISOString().slice(0, 10) + "T00:00:00Z",
            ),
          },
        },
      },
    });
    if (paid)
      throw new BadRequestException(
        "This attendance is included in paid payroll and is read-only.",
      );
    const start =
      data.startTime === undefined
        ? timesheet.startTime
        : new Date(data.startTime);
    const end =
      data.endTime === undefined
        ? timesheet.endTime
        : data.endTime === null
          ? null
          : new Date(data.endTime);
    if (
      !Number.isFinite(start.getTime()) ||
      (end && !Number.isFinite(end.getTime())) ||
      (end && end <= start)
    ) {
      throw new BadRequestException(
        "Enter valid start and end times, with end after start",
      );
    }
    const status =
      data.status ??
      (end
        ? timesheet.status === "IN_PROGRESS"
          ? "PENDING"
          : timesheet.status
        : "IN_PROGRESS");
    if (
      !["PENDING", "APPROVED", "IN_PROGRESS", "REJECTED", "DISCARDED"].includes(
        status,
      )
    )
      throw new BadRequestException("Invalid timesheet status");
    if (
      status === "APPROVED" &&
      (!end || start > new Date() || end > new Date())
    )
      throw new BadRequestException(
        "Only completed timesheets can be approved",
      );
    if ((end && status === "IN_PROGRESS") || (!end && status !== "IN_PROGRESS"))
      throw new BadRequestException(
        "Running attendance must be in progress; completed attendance must have a clock-out time",
      );
    if (data.locationId) {
      const loc = await this.prisma.location.findFirst({
        where: {
          id: data.locationId,
          businessId: timesheet.employee.businessId,
        },
      });
      if (!loc)
        throw new BadRequestException("Location must belong to this business");
    }
    const updateData: any = { startTime: start, endTime: end, status };
    if (data.locationId !== undefined)
      updateData.location = data.locationId
        ? { connect: { id: data.locationId } }
        : { disconnect: true };
    const existingBreaks = await this.prisma.break.findMany({
      where: { timesheetId: id },
    });
    if (data.breaks !== undefined && !Array.isArray(data.breaks))
      throw new BadRequestException("Invalid breaks");
    const breaks:
      | Array<{
          startTime: string | Date;
          endTime?: string | Date | null;
          type?: string;
        }>
      | undefined = data.breaks;
    if (
      (breaks ?? existingBreaks).some(
        (b) => b.type !== undefined && !["PAID", "UNPAID"].includes(b.type),
      )
    )
      throw new BadRequestException("Break type must be PAID or UNPAID");
    const validatedBreaks = (breaks ?? existingBreaks).map((b) => ({
      start: new Date(b.startTime),
      end: b.endTime ? new Date(b.endTime) : null,
    }));
    validatedBreaks.sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 0; i < validatedBreaks.length; i++) {
      const b = validatedBreaks[i];
      if (
        !Number.isFinite(b.start.getTime()) ||
        (b.end && !Number.isFinite(b.end.getTime())) ||
        b.start < start ||
        (b.end && b.end <= b.start) ||
        (end && (!b.end || b.end > end || b.start >= end))
      )
        throw new BadRequestException(
          "Breaks must be valid and within the timesheet",
        );
      if (
        i &&
        (!validatedBreaks[i - 1].end || b.start < validatedBreaks[i - 1].end!)
      )
        throw new BadRequestException("Breaks cannot overlap");
    }
    if (data.employeeNote !== undefined) {
      updateData.employeeNote = data.employeeNote;
    }

    // Use transaction to avoid nested write issues and provide clearer errors
    let result: Timesheet | null = null;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        if (data.startTime !== undefined || data.endTime !== undefined) {
          if (start > new Date() || (end && end > new Date()))
            throw new BadRequestException(
              "Attendance cannot be recorded in the future",
            );
          await tx.$queryRawUnsafe(
            'SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE',
            timesheet.employeeId,
          );
          const overlap = await tx.timesheet.findFirst({
            where: {
              id: { not: id },
              employeeId: timesheet.employeeId,
              status: { notIn: ["DISCARDED", "REJECTED"] },
              startTime: { lt: end || new Date("9999-01-01T00:00:00Z") },
              OR: [{ endTime: null }, { endTime: { gt: start } }],
            },
          });
          if (overlap)
            throw new BadRequestException(
              "This correction overlaps another attendance record",
            );
        }
        // Update base timesheet fields and relations
        const updated = await tx.timesheet.update({
          where: { id },
          data: updateData,
          include: {
            employee: true,
            breaks: true,
            location: true,
          } as any,
        });

        // Replace breaks if provided
        if (breaks !== undefined) {
          await tx.break.deleteMany({ where: { timesheetId: id } });
          if (breaks.length > 0) {
            await tx.break.createMany({
              data: breaks.map((b) => ({
                timesheetId: id,
                startTime: new Date(b.startTime),
                endTime: b.endTime ? new Date(b.endTime) : null,
                type: b.type || "UNPAID",
              })),
            });
          }
        }

        await this.applyShortShiftBreakRule(tx, {...timesheet, startTime:start, endTime:end}, timesheet.employee.businessId);
        // Return hydrated timesheet
        return tx.timesheet.findUnique({
          where: { id },
          include: {
            employee: true,
            breaks: true,
            location: true,
          } as any,
        });
      });
    } catch (e: any) {
      // Normalize Prisma errors to 400 to avoid opaque 500 Internal Server Errors
      const message = e?.message || "Failed to update timesheet";
      throw new BadRequestException(message);
    }

    await this.operations?.audit(
      user,
      timesheet.employeeId,
      "ADMIN_TIME_ADJUSTMENT",
      {
        id,
        before: {
          startTime: timesheet.startTime,
          endTime: timesheet.endTime,
          status: timesheet.status,
          breaks: existingBreaks,
        },
        after: {
          startTime: start,
          endTime: end,
          status,
          breaks: breaks ?? existingBreaks,
        },
        reason:
          typeof data.reason === "string" ? data.reason.slice(0, 500) : null,
      },
    );
    return result!;
  }

  async deleteTimesheet(
    id: string,
    requestingEmployeeId?: string,
    user?: any,
  ): Promise<Timesheet> {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!timesheet) throw new BadRequestException("Timesheet not found");
    if (timesheet.paidExternally)
      throw new BadRequestException(
        "This historical timesheet was already paid externally and cannot be deleted.",
      );

    if (user) {
      await this.validateBusinessAccess(timesheet.employee.businessId, user);
    }

    if (requestingEmployeeId && timesheet.employeeId !== requestingEmployeeId) {
      throw new ForbiddenException("You can only delete your own timesheets");
    }

    if (!timesheet.endTime && !["SUPER_ADMIN", "BUSINESS_ADMIN"].includes(user?.role))
      throw new BadRequestException(
        "End the active timesheet before discarding it",
      );
    if (requestingEmployeeId && timesheet.status === "APPROVED")
      throw new ForbiddenException(
        "Approved timesheets require a manager to make changes",
      );
    const paid = await this.prisma.payStub.findFirst({
      where: {
        employeeId: timesheet.employeeId,
        payroll: {
          status: "PAID",
          periodStart: { lte: timesheet.endTime || new Date() },
          periodEnd: { gte: new Date(timesheet.startTime.toISOString().slice(0, 10) + "T00:00:00Z") },
        },
      },
    });
    if (paid) throw new BadRequestException("This attendance is included in paid payroll and is read-only.");
    return this.prisma.$transaction(async tx => {
      await tx.$queryRawUnsafe('SELECT id FROM "Employee" WHERE id = $1 FOR UPDATE', timesheet.employeeId);
      const current = await tx.timesheet.findUnique({ where: { id } });
      if (!current || current.updatedAt.getTime() !== timesheet.updatedAt.getTime())
        throw new BadRequestException("This timesheet changed. Refresh before discarding it.");
      const endTime = current.endTime || new Date();
      await tx.break.updateMany({ where: { timesheetId: id, endTime: null }, data: { endTime } });
      const discarded = await tx.timesheet.update({ where: { id }, data: { status: "DISCARDED", endTime } });
      await tx.auditLog.create({data: {
        businessId: timesheet.employee.businessId,
        userId: user?.userId || user?.sub || user?.id || null,
        action: "TIMESHEET_DISCARDED", resource: "TIMESHEET", resourceId: id,
        details: JSON.stringify({ before: current, endedActiveClockIn: !current.endTime }),
      }});
      return discarded;
    });
  }

  async restoreTimesheet(
    id: string,
    requestingEmployeeId?: string,
    user?: any,
  ): Promise<Timesheet> {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!timesheet) throw new BadRequestException("Timesheet not found");

    if (user) {
      await this.validateBusinessAccess(timesheet.employee.businessId, user);
    }

    if (requestingEmployeeId && timesheet.employeeId !== requestingEmployeeId) {
      throw new ForbiddenException("You can only restore your own timesheets");
    }

    if (!["DISCARDED", "REJECTED"].includes(timesheet.status))
      throw new BadRequestException(
        "Only discarded timesheets can be restored",
      );
    // Restore by setting status to PENDING
    return this.prisma.timesheet.update({
      where: { id },
      data: { status: "PENDING" },
    });
  }

  async getBusinessTimesheets(
    businessId: string,
    start: Date,
    end: Date,
    user?: any,
  ): Promise<Timesheet[]> {
    this.validateRange(start, end);
    if (user) await this.validateBusinessAccess(businessId, user);
    return this.prisma.timesheet.findMany({
      where: {
        employee: {
          businessId,
        },
        // Overlap logic: Timesheet starts before the window ends...
        startTime: { lte: end },
        // ...and ends after the window starts (or hasn't ended yet)
        OR: [{ endTime: { gte: start } }, { endTime: null }],
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            hourlyRate: true,
            salary: true,
            payType: true,
            overtimeEligible: true,
            w2Profile: {
              select: { rate: true, payType: true, overtimeEligible: true },
            },
            contractorProfile: { select: { rate: true } },
            workerType: true,
            role: true,
          },
        },
        breaks: true,
        location: true,
      } as any,
      orderBy: {
        startTime: "desc",
      },
    });
  }

  private validateRange(start: Date, end: Date) {
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end < start
    )
      throw new BadRequestException("Invalid date range");
  }

  async getBusinessId(userId: string): Promise<string> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!employee)
      throw new BadRequestException("User is not associated with a business");
    return employee.businessId;
  }

  // Haversine formula to calculate distance in meters
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoClockOut() {
    const logger = new Logger("AutoClockOut");
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const staleTimesheets = await this.prisma.timesheet.findMany({
      where: {
        endTime: null,
        startTime: {
          lt: twentyFourHoursAgo,
        },
      },
    });

    if (staleTimesheets.length === 0) return;

    logger.log(
      `Found ${staleTimesheets.length} stale timesheets to auto-clock out.`,
    );

    for (const ts of staleTimesheets) {
      const autoEndTime = new Date(
        ts.startTime.getTime() + 24 * 60 * 60 * 1000,
      );

      try {
        await this.prisma.timesheet.update({
          where: { id: ts.id },
          data: {
            endTime: autoEndTime,
            employeeNote:
              (ts.employeeNote ? ts.employeeNote + "\n" : "") +
              "[System] Auto-clocked out after 24 hours.",
          },
        });
        logger.log(`Auto-clocked out timesheet ${ts.id}`);
      } catch (error: any) {
        logger.error(
          `Failed to auto-clock out timesheet ${ts.id}: ${error.message}`,
        );
      }
    }
  }
}
