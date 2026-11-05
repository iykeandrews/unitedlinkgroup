import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { PushService } from "../push/push.service";
import { effectivePay } from "../employees/employment.util";
import { calculateHours } from "../payroll/hours";

export const flexCents = (v: unknown) => {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    v <= 0 ||
    Math.abs(v * 100 - Math.round(v * 100)) > 0.00001 ||
    v * 100 > 2147483647
  )
    throw new BadRequestException(
      "Enter a positive monetary amount with at most two decimals",
    );
  return Math.round(v * 100);
};
const include = {
  employee: {
    select: { id: true, firstName: true, lastName: true, userId: true },
  },
  shift: { include: { location: { select: { id: true, name: true } } } },
  timesheet: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      workerType: true,
    },
  },
  reconciliations: {
    include: {
      payroll: {
        select: {
          id: true,
          payDate: true,
          periodStart: true,
          periodEnd: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
};
const clean = (s: unknown, min = 0, max = 2000) => {
  if (typeof s !== "string" || s.trim().length < min || s.trim().length > max)
    throw new BadRequestException(
      "Enter a valid description (" + min + "–" + max + " characters)",
    );
  return s.trim();
};
export const flexView = (r: any) => ({
  ...r,
  amount: r.amountCents / 100,
  balance: r.balanceCents / 100,
  reconciliations: (r.reconciliations || []).map((x: any) => ({
    ...x,
    amount: x.amountCents / 100,
  })),
});

@Injectable()
export class FlexPayService {
  constructor(
    private prisma: PrismaService,
    private push: PushService,
  ) {}
  private async transaction(work: (tx: any) => Promise<any>) {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: "Serializable",
      });
    } catch (e: any) {
      if (["P2002", "P2034"].includes(e?.code))
        throw new ConflictException(
          "This record or payment reference changed in another request. Refresh before retrying.",
        );
      throw e;
    }
  }
  private db(db: any = this.prisma) {
    if (!db.flexPay || !db.flexPayReconciliation)
      throw new BadRequestException(
        "Flex Pay setup is pending. Generate the database client and apply the reviewed Flex Pay migration.",
      );
    return db;
  }
  private async scope(user: any, header?: string) {
    const id = user.userId || user.sub || user.id;
    const account = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!account) throw new ForbiddenException("Sign in again");
    const businessId = header || user.businessId;
    if (!businessId) throw new BadRequestException("Select a business");
    const [business, employee] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, ownerId: true },
      }),
      this.prisma.employee.findFirst({
        where: {
          businessId,
          userId: id,
          status: { in: ["ACTIVE", "ON_LEAVE"] },
        },
        select: { id: true, role: true },
      }),
    ]);
    const admin =
      account.role === "SUPER_ADMIN" ||
      business?.ownerId === id ||
      (!!employee && [account.role, employee.role].includes("BUSINESS_ADMIN"));
    if (!business || (!admin && !employee))
      throw new ForbiddenException("Access denied to this business");
    return { businessId, userId: id, employeeId: employee?.id, admin };
  }
  private async one(id: string, scope: any, db: any = this.prisma) {
    const row = await this.db(db).flexPay.findFirst({
      where: {
        id,
        businessId: scope.businessId,
        ...(!scope.admin ? { employeeId: scope.employeeId } : {}),
      },
      include,
    });
    if (!row) throw new NotFoundException("Flex Pay record not found");
    return row;
  }
  private admin(scope: any) {
    if (!scope.admin)
      throw new ForbiddenException("Only administrators may manage Flex Pay");
  }
  private unchanged(row: any) {
    if (
      row.shift.employeeId !== row.employeeId ||
      +row.shift.startTime !== +row.shiftStart ||
      +row.shift.endTime !== +row.shiftEnd ||
      row.shift.locationId !== row.locationId ||
      !["PUBLISHED", "COMPLETED"].includes(row.shift.status)
    )
      throw new ConflictException(
        "This calendar assignment changed. Cancel this offer and create a new one for the correct assignment.",
      );
  }
  private async audit(
    db: any,
    s: any,
    id: string,
    action: string,
    details: any,
  ) {
    await db.auditLog.create({
      data: {
        businessId: s.businessId,
        userId: s.userId,
        resource: "FLEX_PAY",
        resourceId: id,
        action,
        details: JSON.stringify(details),
      },
    });
  }
  private async notify(row: any, title: string, message: string) {
    if (!row.employee?.userId) return;
    const id = "flex-" + row.id + "-" + row.status;
    try {
      await this.prisma.notification.upsert({
        where: { id },
        update: {},
        create: {
          id,
          userId: row.employee.userId,
          type: "INFO",
          title,
          message,
          metadata: JSON.stringify({
            flexPayId: row.id,
            actionUrl: "/dashboard/finance/flex-pay",
          }),
        },
      });
      await this.push.send(row.employee.userId, {
        type: "INFO",
        title,
        message,
        metadata: { flexPayId: row.id },
        actionUrl: "/dashboard/finance/flex-pay",
      });
    } catch {
      /* Durable ledger must not be rolled back when push delivery is unavailable. */
    }
  }
  private async notifyAdmins(row: any) {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: row.businessId },
        select: { ownerId: true },
      });
      const admins = await this.prisma.employee.findMany({
        where: {
          businessId: row.businessId,
          status: "ACTIVE",
          role: "BUSINESS_ADMIN",
          userId: { not: null },
        },
        select: { userId: true },
      });
      const ids = new Set(
        [business?.ownerId, ...admins.map((e) => e.userId)].filter(Boolean),
      );
      for (const userId of ids) {
        const id = "flex-admin-" + row.id + "-" + row.status + "-" + userId,
          title = "Flex Pay offer " + row.status.toLowerCase(),
          message =
            [row.employee.firstName, row.employee.lastName].join(" ") +
            " responded to the emergency-shift payment agreement.";
        await this.prisma.notification.upsert({
          where: { id },
          update: {},
          create: {
            id,
            userId: userId!,
            type: "INFO",
            title,
            message,
            metadata: JSON.stringify({
              flexPayId: row.id,
              actionUrl: "/dashboard/finance/flex-pay",
            }),
          },
        });
        await this.push.send(userId!, {
          type: "INFO",
          title,
          message,
          metadata: { flexPayId: row.id },
          actionUrl: "/dashboard/finance/flex-pay",
        });
      }
    } catch {}
  }
  async list(user: any, header?: string) {
    const s = await this.scope(user, header);
    const where = {
      businessId: s.businessId,
      ...(!s.admin ? { employeeId: s.employeeId } : {}),
    };
    const [rows, groups] = await Promise.all([
      this.db().flexPay.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      this.db().flexPay.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { amountCents: true, balanceCents: true },
      }),
    ]);
    const count = (status: string) =>
      groups.find((g: any) => g.status === status)?._count._all || 0;
    const summary = {
      offered: count("OFFERED"),
      accepted: count("ACCEPTED"),
      paidAmount:
        groups
          .filter((g: any) => ["PAID", "RECONCILED"].includes(g.status))
          .reduce((n: number, g: any) => n + (g._sum.amountCents || 0), 0) /
        100,
      balance:
        groups.reduce(
          (n: number, g: any) => n + (g._sum.balanceCents || 0),
          0,
        ) / 100,
    };
    return {
      canManage: s.admin,
      employeeId: s.employeeId,
      rows: rows.map(flexView),
      summary,
    };
  }
  async options(user: any, header?: string) {
    const s = await this.scope(user, header);
    this.admin(s);
    const shifts = await this.prisma.shift.findMany({
      where: {
        businessId: s.businessId,
        status: { in: ["PUBLISHED", "COMPLETED"] },
        employeeId: { not: null },
        startTime: {
          gte: new Date(Date.now() - 90 * 86400000),
          lte: new Date(Date.now() + 30 * 86400000),
        },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        location: { select: { name: true } },
      },
      orderBy: { startTime: "desc" },
      take: 500,
    });
    return { shifts };
  }
  async offer(user: any, body: any, header?: string) {
    const s = await this.scope(user, header);
    this.admin(s);
    const amountCents = flexCents(body.amount),
      reason = clean(body.reason, 10),
      submissionId = clean(body.submissionId, 16, 100),
      shiftId = clean(body.shiftId, 1, 100);
    const row = await this.transaction(async (tx: any) => {
      const prior = await this.db(tx).flexPay.findUnique({
        where: { submissionId },
        include,
      });
      if (prior) {
        if (
          prior.businessId !== s.businessId ||
          prior.shiftId !== shiftId ||
          prior.amountCents !== amountCents ||
          prior.reason !== reason
        )
          throw new ConflictException("Request identifier was already used");
        return prior;
      }
      const shift = await tx.shift.findFirst({
        where: {
          id: shiftId,
          businessId: s.businessId,
          status: { in: ["PUBLISHED", "COMPLETED"] },
        },
        include: { employee: true, location: { select: { businessId: true } } },
      });
      if (
        !shift?.employeeId ||
        shift.employee?.businessId !== s.businessId ||
        (shift.locationId && shift.location?.businessId !== s.businessId) ||
        !shift.employee?.userId ||
        !["ACTIVE", "ON_LEAVE"].includes(shift.employee?.status)
      )
        throw new BadRequestException(
          "Choose a published emergency shift assigned to an active officer with a linked app account",
        );
      const duplicate = await tx.flexPay.findFirst({
        where: { shiftId, status: { notIn: ["CANCELLED", "DECLINED"] } },
      });
      if (duplicate)
        throw new ConflictException(
          "This emergency shift already has a Flex Pay agreement",
        );
      const result = await tx.flexPay.create({
        data: {
          submissionId,
          businessId: s.businessId,
          employeeId: shift.employeeId,
          shiftId,
          shiftStart: shift.startTime,
          shiftEnd: shift.endTime,
          locationId: shift.locationId,
          amountCents,
          reason,
          createdByUserId: s.userId,
        },
        include,
      });
      await this.audit(tx, s, result.id, "FLEX_PAY_OFFERED", {
        shiftId,
        amountCents,
        reason,
      });
      return result;
    });
    await this.notify(
      row,
      "Emergency shift Flex Pay offer",
      "Review your emergency-shift assignment and the immediate payment terms in Flex Pay.",
    );
    return flexView(row);
  }
  async respond(user: any, id: string, body: any, header?: string) {
    const s = await this.scope(user, header);
    if (!["ACCEPT", "DECLINE"].includes(body.decision))
      throw new BadRequestException("Choose accept or decline");
    const row = await this.transaction(async (tx: any) => {
      const r = await this.one(id, s, tx);
      if (r.employeeId !== s.employeeId)
        throw new ForbiddenException(
          "Only the assigned officer can agree to these terms",
        );
      if (r.status !== "OFFERED")
        throw new ConflictException("This offer was already answered");
      this.unchanged(r);
      const status = body.decision === "ACCEPT" ? "ACCEPTED" : "DECLINED",
        now = new Date();
      const updated = await tx.flexPay.updateMany({
        where: { id, status: "OFFERED" },
        data: {
          status,
          respondedAt: now,
          acceptedAt: status === "ACCEPTED" ? now : null,
          responseNote: body.note ? clean(body.note, 0, 1000) : null,
        },
      });
      if (updated.count !== 1)
        throw new ConflictException("This offer changed. Refresh and retry.");
      await this.audit(tx, s, id, "FLEX_PAY_" + status, {
        shiftId: r.shiftId,
        amountCents: r.amountCents,
      });
      return tx.flexPay.findUnique({ where: { id }, include });
    });
    await this.notifyAdmins(row);
    return flexView(row);
  }
  private sheetMatches(r: any, t: any) {
    return (
      t.employeeId === r.employeeId &&
      t.locationId === r.locationId &&
      t.status === "APPROVED" &&
      t.endTime &&
      +t.endTime <= Date.now() &&
      !t.paidExternally &&
      +t.startTime >= +r.shiftStart - 2 * 3600000 &&
      +t.endTime <= +r.shiftEnd + 2 * 3600000 &&
      +t.startTime < +r.shiftEnd &&
      +t.endTime > +r.shiftStart
    );
  }
  async attendance(user: any, id: string, header?: string) {
    const s = await this.scope(user, header);
    this.admin(s);
    const r = await this.one(id, s);
    const rows = await this.prisma.timesheet.findMany({
      where: {
        employeeId: r.employeeId,
        locationId: r.locationId,
        status: "APPROVED",
        paidExternally: false,
        startTime: {
          gte: new Date(+r.shiftStart - 2 * 3600000),
          lt: r.shiftEnd,
        },
        endTime: {
          gt: r.shiftStart,
          lte: new Date(Math.min(Date.now(), +r.shiftEnd + 2 * 3600000)),
        },
      },
      include: { breaks: true },
      orderBy: { startTime: "asc" },
    });
    return rows.filter((t) => this.sheetMatches(r, t));
  }
  async recordPayment(user: any, id: string, body: any, header?: string) {
    const s = await this.scope(user, header);
    this.admin(s);
    const method = clean(body.paymentMethod, 1, 40),
      reference = clean(body.paymentReference, 3, 120).toUpperCase(),
      timesheetId = clean(body.timesheetId, 1, 100);
    if (
      ![
        "BANK_TRANSFER",
        "CASH",
        "CHECK",
        "ZELLE",
        "CASH_APP",
        "OTHER",
      ].includes(method)
    )
      throw new BadRequestException("Choose a payment method");
    const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    if (!Number.isFinite(+paidAt) || +paidAt > Date.now() + 60000)
      throw new BadRequestException(
        "Choose the actual payment date, not a future date",
      );
    const row = await this.transaction(async (tx: any) => {
      const r = await this.one(id, s, tx);
      if (["PAID", "RECONCILED"].includes(r.status)) {
        if (
          r.paymentMethod === method &&
          r.paymentReference === reference &&
          r.timesheetId === timesheetId
        )
          return r;
        throw new ConflictException(
          "This payment is already recorded and cannot be paid again",
        );
      }
      if (r.status !== "ACCEPTED" || !r.acceptedAt)
        throw new BadRequestException(
          "The officer must accept the offer before payment",
        );
      this.unchanged(r);
      // Lock the same employee row used by payroll finalization.
      await tx.employee.update({
        where: { id: r.employeeId },
        data: { updatedAt: new Date() },
      });
      const sheet = await tx.timesheet.findFirst({
        where: { id: timesheetId, employeeId: r.employeeId },
        include: {
          breaks: true,
          employee: {
            include: {
              w2Profile: true,
              contractorProfile: true,
              business: true,
            },
          },
        },
      });
      if (
        !sheet ||
        sheet.employee?.businessId !== s.businessId ||
        !this.sheetMatches(r, sheet)
      )
        throw new BadRequestException(
          "Link completed, approved, unpaid attendance for this emergency shift",
        );
      if (+paidAt < +sheet.endTime || +paidAt < +r.acceptedAt)
        throw new BadRequestException(
          "Payment must follow shift completion and officer acceptance",
        );
      const paid = await tx.payStub.findFirst({
        where: {
          employeeId: r.employeeId,
          workerType: sheet.workerType,
          payroll: {
            status: { in: ["PAID", "PROCESSED"] },
            periodStart: { lt: sheet.endTime },
            periodEnd: { gte: sheet.startTime },
          },
        },
      });
      if (paid)
        throw new ConflictException(
          "This attendance is already included in paid/processed payroll. A Flex Pay payment would duplicate pay.",
        );
      const duplicate = await tx.flexPay.findFirst({
        where: {
          businessId: s.businessId,
          OR: [{ timesheetId }, { paymentReference: reference }],
          id: { not: id },
        },
      });
      if (duplicate)
        throw new ConflictException(
          "This attendance or payment reference already belongs to another Flex Pay record",
        );
      const employee = sheet.employee,
        pay = effectivePay({ ...employee, workerType: sheet.workerType });
      if (pay.payType !== "HOURLY" || !pay.hourlyRate)
        throw new BadRequestException(
          "An hourly pay rate must be recorded for this attendance",
        );
      let settings: any = {};
      try {
        settings = JSON.parse(employee.business.settings || "{}");
      } catch {}
      const anchor = new Date(
          settings.payrollTaxes?.workweekAnchor || "2026-01-04T00:00:00Z",
        ),
        week = 168 * 3600000;
      const weekStart = new Date(
        +anchor + Math.floor((+sheet.startTime - +anchor) / week) * week,
      );
      const work = await tx.timesheet.findMany({
        where: {
          employeeId: r.employeeId,
          workerType: sheet.workerType,
          status: "APPROVED",
          startTime: { lt: sheet.endTime },
          endTime: { gt: weekStart },
        },
        include: { breaks: true },
        orderBy: { startTime: "asc" },
      });
      const gross = calculateHours(
        work.map((t: any) => ({ ...t, paidExternally: false })),
        sheet.startTime,
        new Date(+sheet.endTime - 1),
        pay.hourlyRate,
        sheet.workerType === "W2" && pay.overtimeEligible,
        anchor,
      ).grossPay;
      if (r.amountCents > Math.round(gross * 100))
        throw new BadRequestException(
          "Flex Pay exceeds approved gross earnings for this attendance. Review its pay rate/additional compensation first.",
        );
      const result = await tx.flexPay.updateMany({
        where: { id, status: "ACCEPTED", timesheetId: null },
        data: {
          status: "PAID",
          timesheetId,
          paidAt,
          paymentMethod: method,
          paymentReference: reference,
          balanceCents: r.amountCents,
          recordedByUserId: s.userId,
        },
      });
      if (result.count !== 1)
        throw new ConflictException(
          "This payment changed. Refresh before continuing.",
        );
      await this.audit(tx, s, id, "FLEX_PAY_PAYMENT_RECORDED", {
        amountCents: r.amountCents,
        timesheetId,
        paymentMethod: method,
        paymentReference: reference,
        paidAt: paidAt.toISOString(),
      });
      return tx.flexPay.findUnique({ where: { id }, include });
    });
    await this.notify(
      row,
      "Flex Pay payment recorded",
      "Your external Flex Pay payment has been recorded. The amount already paid will be deducted after tax from regular payroll.",
    );
    return flexView(row);
  }
  async cancel(user: any, id: string, body: any, header?: string) {
    const s = await this.scope(user, header);
    this.admin(s);
    const reason = clean(body.reason, 5, 1000);
    const row = await this.transaction(async (tx: any) => {
      const r = await this.one(id, s, tx);
      if (!["OFFERED", "ACCEPTED"].includes(r.status))
        throw new ConflictException(
          "Only unpaid offers can be cancelled. Paid records are retained for reconciliation.",
        );
      const changed = await tx.flexPay.updateMany({
        where: { id, status: r.status },
        data: { status: "CANCELLED", responseNote: reason },
      });
      if (changed.count !== 1)
        throw new ConflictException("Offer changed. Refresh and retry.");
      await this.audit(tx, s, id, "FLEX_PAY_CANCELLED", { reason });
      return tx.flexPay.findUnique({ where: { id }, include });
    });
    await this.notify(
      row,
      "Flex Pay offer cancelled",
      "Your unpaid Flex Pay offer was cancelled. Review the record and confirm your assignment with scheduling.",
    );
    return flexView(row);
  }
}
