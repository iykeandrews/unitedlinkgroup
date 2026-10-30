import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PushService } from "../push/push.service";
import { CreateConductDto, ConductActionDto } from "./conduct.dto";

const admins = ["SUPER_ADMIN", "BUSINESS_ADMIN", "MANAGER"];
const include = {
  employee: {
    select: { id: true, firstName: true, lastName: true, userId: true },
  },
  events: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
};
const fullName = (employee: any) =>
  [employee?.firstName, employee?.lastName].filter(Boolean).join(" ");

@Injectable()
export class ConductService {
  private logger = new Logger(ConductService.name);
  constructor(
    private db: PrismaService,
    private notifications: NotificationsService,
    private push: PushService,
  ) {}
  private isAdmin(user: any) {
    return admins.includes(user.role);
  }
  private userId(user: any) {
    return user.userId || user.id || user.sub;
  }
  async scope(user: any, header?: string) {
    const userId = this.userId(user);
    if (!userId || (!this.isAdmin(user) && user.role !== "EMPLOYEE"))
      throw new ForbiddenException("Access denied");
    if (user.role === "SUPER_ADMIN") {
      if (!header) throw new BadRequestException("Select a business");
      return header;
    }
    const owned = await this.db.business.findFirst({
      where: { ownerId: userId, ...(header ? { id: header } : {}) },
      select: { id: true },
    });
    if (owned && this.isAdmin(user)) return owned.id;
    const employee = await this.db.employee.findFirst({
      where: { userId, ...(header ? { businessId: header } : {}) },
      select: { businessId: true, role: true },
    });
    if (!employee)
      throw new ForbiddenException("Access denied for this business");
    if (
      user.role === "BUSINESS_ADMIN" &&
      !["BUSINESS_ADMIN", "MANAGER"].includes(employee.role)
    )
      throw new ForbiddenException(
        "Administrator access is not assigned in this business",
      );
    return employee.businessId;
  }
  private visible(user: any, businessId: string): any {
    return this.isAdmin(user)
      ? { businessId }
      : {
          businessId,
          kind: "QUERY",
          issuedAt: { not: null },
          employee: { userId: this.userId(user) },
        };
  }
  private employeeView(row: any) {
    // Explicit allow-list: never expose customer details, linked complaints or internal notes.
    return {
      id: row.id,
      reference: row.reference,
      kind: row.kind,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      dueAt: row.dueAt,
      issuedAt: row.issuedAt,
      resolvedAt: row.resolvedAt,
      closedAt: row.closedAt,
      outcome: row.outcome,
      resolution: row.resolution,
      correctiveAction: row.correctiveAction,
      preventiveAction: row.preventiveAction,
      version: row.version,
      createdAt: row.createdAt,
      locationName: row.locationName,
      events: (row.events || [])
        .filter((event: any) => event.visibility === "EMPLOYEE")
        .map((event: any) => ({
          id: event.id,
          type: event.type,
          message: event.message,
          actorName: event.actorName,
          createdAt: event.createdAt,
        })),
    };
  }
  async list(user: any, header: string | undefined, query: any) {
    const businessId = await this.scope(user, header),
      where = this.visible(user, businessId);
    if (!this.isAdmin(user) && query.kind && query.kind !== "QUERY")
      throw new ForbiddenException("Customer complaints are confidential");
    if (query.mine === "true")
      Object.assign(where, {
        kind: "QUERY",
        issuedAt: { not: null },
        employee: { userId: this.userId(user) },
      });
    if (query.kind && this.isAdmin(user)) {
      if (!["QUERY", "COMPLAINT"].includes(query.kind))
        throw new BadRequestException("Invalid case type");
      where.kind = query.kind;
    }
    if (query.status) where.status = query.status;
    if (query.search?.trim())
      where.OR = [
        "reference",
        "title",
        "description",
        ...(this.isAdmin(user) ? ["customerName", "customerContact"] : []),
      ].map((key) => ({
        [key]: {
          contains: query.search.trim().slice(0, 200),
          mode: "insensitive",
        },
      }));
    if (query.overdue === "true")
      Object.assign(where, {
        dueAt: { lt: new Date() },
        status: { notIn: ["DRAFT", "RESOLVED", "CLOSED"] },
      });
    const page = Math.max(1, Math.min(100000, Number(query.page) || 1));
    const [items, total] = await Promise.all([
      this.db.conductCase.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: (Math.floor(page) - 1) * 25,
        take: 25,
      }),
      this.db.conductCase.count({ where }),
    ]);
    const base: any = this.visible(user, businessId);
    if (query.mine === "true")
      Object.assign(base, {
        kind: "QUERY",
        issuedAt: { not: null },
        employee: { userId: this.userId(user) },
      });
    if (query.kind && this.isAdmin(user)) base.kind = query.kind;
    const [groups, overdue] = await Promise.all([
      this.db.conductCase.groupBy({
        by: ["status"],
        where: base,
        _count: { _all: true },
      }),
      this.db.conductCase.count({
        where: {
          ...base,
          dueAt: { lt: new Date() },
          status: { notIn: ["DRAFT", "RESOLVED", "CLOSED"] },
        },
      }),
    ]);
    return {
      items: this.isAdmin(user)
        ? items
        : items.map((row) => this.employeeView(row)),
      total,
      page: Math.floor(page),
      stats: {
        statuses: Object.fromEntries(
          groups.map((group) => [group.status, group._count._all]),
        ),
        overdue,
      },
    };
  }
  async detail(id: string, user: any, header?: string) {
    const businessId = await this.scope(user, header);
    const row = await this.db.conductCase.findFirst({
      where: { id, ...this.visible(user, businessId) },
      include,
    });
    if (!row) throw new NotFoundException("Case not found");
    return this.isAdmin(user) ? row : this.employeeView(row);
  }
  async options(user: any, header?: string) {
    if (!this.isAdmin(user))
      throw new ForbiddenException("Administrator access required");
    const businessId = await this.scope(user, header);
    const [employees, locations] = await Promise.all([
      this.db.employee.findMany({
        where: { businessId, status: { in: ["ACTIVE", "ON_LEAVE"] } },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      this.db.location.findMany({
        where: { businessId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { employees, locations };
  }
  private async officer(id: string | undefined, businessId: string) {
    if (!id) return null;
    const employee = await this.db.employee.findFirst({
      where: { id, businessId, status: { in: ["ACTIVE", "ON_LEAVE"] } },
    });
    if (!employee)
      throw new BadRequestException("Choose an employee in this business");
    return employee;
  }
  private date(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    if (!Number.isFinite(+date))
      throw new BadRequestException("Enter a valid date");
    return date;
  }
  private async actor(user: any) {
    const person = await this.db.user.findUnique({
      where: { id: this.userId(user) },
      select: { firstName: true, lastName: true },
    });
    return {
      actorUserId: this.userId(user),
      actorName:
        fullName(person) || (this.isAdmin(user) ? "Administrator" : "Employee"),
    };
  }
  async create(data: CreateConductDto, user: any, header?: string) {
    if (!this.isAdmin(user))
      throw new ForbiddenException("Administrator access required");
    const businessId = await this.scope(user, header);
    if (data.title.trim().length < 3 || data.description.trim().length < 10)
      throw new BadRequestException("Enter a clear title and detailed account");
    if (
      (data.kind === "QUERY" || data.subject === "EMPLOYEE") &&
      !data.employeeId
    )
      throw new BadRequestException("Select the employee concerned");
    await this.officer(data.employeeId, businessId);
    const owner = await this.officer(data.ownerEmployeeId, businessId);
    const location = data.locationId
      ? await this.db.location.findFirst({
          where: { id: data.locationId, businessId },
        })
      : null;
    if (data.locationId && !location)
      throw new BadRequestException("Choose a location in this business");
    if (data.sourceCaseId) {
      const source = await this.db.conductCase.findFirst({
        where: { id: data.sourceCaseId, businessId, kind: "COMPLAINT" },
      });
      if (!source || data.kind !== "QUERY")
        throw new BadRequestException(
          "Choose a customer complaint from this business",
        );
    }
    const actor = await this.actor(user);
    return this.db.conductCase.create({
      data: {
        businessId,
        reference: `${data.kind === "QUERY" ? "QRY" : "CMP"}-${new Date().getUTCFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
        kind: data.kind,
        subject: data.kind === "QUERY" ? "EMPLOYEE" : data.subject,
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category.trim(),
        priority: data.priority || "MEDIUM",
        status: data.kind === "QUERY" ? "DRAFT" : "OPEN",
        employeeId: data.employeeId || null,
        locationId: location?.id,
        locationName: location?.name,
        customerName:
          data.kind === "COMPLAINT" ? data.customerName?.trim() : null,
        customerContact:
          data.kind === "COMPLAINT" ? data.customerContact?.trim() : null,
        ownerEmployeeId: owner?.id,
        ownerName: fullName(owner) || null,
        sourceCaseId: data.sourceCaseId || null,
        dueAt: this.date(data.dueAt),
        createdById: actor.actorUserId,
        events: {
          create: {
            ...actor,
            type: "CREATED",
            message:
              data.kind === "QUERY"
                ? "Query drafted for review before issue."
                : "Customer complaint recorded.",
            visibility: "INTERNAL",
          },
        },
      },
      include,
    });
  }
  async action(id: string, data: ConductActionDto, user: any, header?: string) {
    const visible = await this.detail(id, user, header),
      admin = this.isAdmin(user),
      action = data.action,
      message = data.message?.trim() || "";
    const row: any = admin
      ? visible
      : await this.db.conductCase.findUnique({ where: { id }, include });
    if (!admin && !["ACKNOWLEDGE", "RESPOND"].includes(action))
      throw new ForbiddenException("Administrator access required");
    if (row.version !== data.version)
      throw new ConflictException("This case changed. Refresh before saving.");
    const closed = ["RESOLVED", "CLOSED"].includes(row.status),
      update: any = {},
      changes: any = {};
    let visibility = admin ? "INTERNAL" : "EMPLOYEE",
      eventMessage = message;
    if (
      !["ISSUE", "ACKNOWLEDGE", "ASSIGN"].includes(action) &&
      message.length < 3
    )
      throw new BadRequestException("Add a note explaining this action");
    if (action === "EDIT") {
      if (row.status !== "DRAFT")
        throw new BadRequestException(
          "An issued query cannot be rewritten. Add a shared update instead.",
        );
      if (!data.title?.trim() || !data.description?.trim())
        throw new BadRequestException("Enter a title and allegation");
      Object.assign(update, {
        title: data.title.trim(),
        description: data.description.trim(),
      });
    } else if (action === "ISSUE") {
      if (row.kind !== "QUERY" || row.status !== "DRAFT")
        throw new BadRequestException("Only a draft query can be issued");
      if (!row.dueAt || +new Date(row.dueAt) <= Date.now())
        throw new BadRequestException(
          "Set a future response deadline before issuing",
        );
      Object.assign(update, {
        status: "AWAITING_RESPONSE",
        issuedAt: new Date(),
      });
      visibility = "EMPLOYEE";
      eventMessage =
        message ||
        "The company has issued this query and requests your response by the stated deadline.";
    } else if (action === "ACKNOWLEDGE") {
      if (row.kind !== "QUERY" || !row.issuedAt)
        throw new BadRequestException("This query has not been issued");
      if (admin)
        throw new BadRequestException(
          "Only the employee can acknowledge receipt",
        );
      const type = closed ? "DECISION_ACKNOWLEDGED" : "ACKNOWLEDGED";
      if (
        row.events.some(
          (event: any) =>
            event.type === type &&
            (!closed ||
              +new Date(event.createdAt) >= +new Date(row.resolvedAt)),
        )
      )
        return this.detail(id, user, header);
      eventMessage = closed
        ? "Employee acknowledged receipt of the company decision."
        : "Employee acknowledged receipt of the query.";
      changes.eventType = type;
    } else if (action === "RESPOND") {
      if (admin || row.kind !== "QUERY" || !row.issuedAt || closed)
        throw new BadRequestException(
          "An employee response is only available on an open issued query",
        );
      update.status = "UNDER_REVIEW";
    } else if (action === "REVIEW") {
      if (closed || row.status === "DRAFT")
        throw new BadRequestException("Issue or reopen the case before review");
      update.status = "UNDER_REVIEW";
    } else if (action === "ASSIGN") {
      if (closed)
        throw new BadRequestException("Reopen the case before reassignment");
      const owner =
        data.ownerEmployeeId !== undefined
          ? await this.officer(data.ownerEmployeeId, row.businessId)
          : undefined;
      if (data.employeeId !== undefined) {
        if (row.kind === "QUERY" && row.status !== "DRAFT")
          throw new BadRequestException(
            "The officer on an issued query cannot be changed",
          );
        const employee = await this.officer(data.employeeId, row.businessId);
        update.employeeId = employee?.id || null;
        if (row.kind === "QUERY" && !employee)
          throw new BadRequestException("Select the officer concerned");
      }
      Object.assign(update, {
        ...(data.priority ? { priority: data.priority } : {}),
        ...(data.category?.trim() ? { category: data.category.trim() } : {}),
        ...(data.ownerEmployeeId !== undefined
          ? {
              ownerEmployeeId: owner?.id || null,
              ownerName: fullName(owner) || null,
            }
          : {}),
        ...(data.dueAt ? { dueAt: this.date(data.dueAt) } : {}),
      });
      if (!Object.keys(update).length)
        throw new BadRequestException(
          "Choose an owner, officer or updated deadline",
        );
      eventMessage = message || "Case ownership or deadline updated.";
    } else if (action === "RESOLVE") {
      if (closed || row.status === "DRAFT")
        throw new BadRequestException("Only an open case can be resolved");
      if (
        !data.outcome ||
        !data.resolution?.trim() ||
        !data.correctiveAction?.trim()
      )
        throw new BadRequestException(
          "Record the finding, resolution and corrective action (or state that none is required)",
        );
      Object.assign(update, {
        status: "RESOLVED",
        resolvedAt: new Date(),
        outcome: data.outcome,
        resolution: data.resolution.trim(),
        rootCause: data.rootCause?.trim(),
        correctiveAction: data.correctiveAction.trim(),
        preventiveAction: data.preventiveAction?.trim(),
        followUpAt: this.date(data.followUpAt),
      });
      visibility = row.kind === "QUERY" ? "EMPLOYEE" : "INTERNAL";
      eventMessage = [
        message,
        `Finding: ${data.outcome}`,
        `Company decision: ${data.resolution.trim()}`,
        `Corrective action: ${data.correctiveAction.trim()}`,
        data.preventiveAction
          ? `Prevention: ${data.preventiveAction.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      if (row.kind === "COMPLAINT") {
        visibility = "CUSTOMER";
        eventMessage = `Company resolution: ${data.resolution.trim()}`;
      }
    } else if (action === "CLOSE") {
      if (row.status !== "RESOLVED")
        throw new BadRequestException("Resolve the case before closing it");
      Object.assign(update, { status: "CLOSED", closedAt: new Date() });
      visibility = row.kind === "QUERY" ? "EMPLOYEE" : "INTERNAL";
    } else if (action === "REOPEN") {
      if (!closed)
        throw new BadRequestException(
          "Only a resolved or closed case can be reopened",
        );
      Object.assign(update, {
        status: "UNDER_REVIEW",
        resolvedAt: null,
        closedAt: null,
        outcome: null,
        resolution: null,
        rootCause: null,
        correctiveAction: null,
        preventiveAction: null,
        followUpAt: null,
      });
      visibility = row.kind === "QUERY" ? "EMPLOYEE" : "INTERNAL";
    } else if (action === "FOLLOW_UP_COMPLETE") {
      if (!row.followUpAt)
        throw new BadRequestException("No follow-up is scheduled");
      update.followUpAt = null;
    } else if (action === "NOTE" || action === "CUSTOMER_UPDATE") {
      if (action === "CUSTOMER_UPDATE" && row.kind !== "COMPLAINT")
        throw new BadRequestException("Customer updates belong to complaints");
      if (action === "CUSTOMER_UPDATE") visibility = "CUSTOMER";
      if (data.visibility === "EMPLOYEE") {
        if (row.kind !== "QUERY" || !row.issuedAt)
          throw new BadRequestException(
            "Only issued query notes can be shared with an employee",
          );
        visibility = "EMPLOYEE";
      }
    } else throw new BadRequestException("Unknown case action");
    for (const key of Object.keys(update))
      changes[key] = { before: row[key] ?? null, after: update[key] };
    const actor = await this.actor(user);
    await this.db.$transaction(async (tx) => {
      const saved = await tx.conductCase.updateMany({
        where: { id, version: data.version },
        data: { ...update, version: { increment: 1 } },
      });
      if (saved.count !== 1)
        throw new ConflictException(
          "This case changed. Refresh before saving.",
        );
      await tx.conductCaseEvent.create({
        data: {
          caseId: id,
          ...actor,
          type: changes.eventType || action,
          visibility,
          message: eventMessage,
          changes: JSON.stringify(changes),
        },
      });
      if (row.kind === "COMPLAINT" && ["CLOSE", "REOPEN"].includes(action))
        await tx.conductCaseEvent.create({
          data: {
            caseId: id,
            ...actor,
            type: action,
            visibility: "CUSTOMER",
            message:
              action === "CLOSE"
                ? "The company has closed this ticket after recording a resolution."
                : "The company has reopened this ticket for further review.",
          },
        });
    });
    if (
      ["ISSUE", "RESOLVE", "CLOSE", "REOPEN"].includes(action) &&
      row.kind === "QUERY"
    ) {
      const employee = await this.db.employee.findUnique({
        where: { id: row.employeeId },
        select: { userId: true },
      });
      if (employee?.userId)
        await this.notify(
          employee.userId,
          id,
          row.reference,
          action === "ISSUE"
            ? "A query requires your response"
            : "Your query has been updated",
        );
    }
    if (action === "RESPOND") {
      const business = await this.db.business.findUnique({
        where: { id: row.businessId },
        select: { ownerId: true },
      });
      if (business?.ownerId)
        await this.notify(
          business.ownerId,
          id,
          row.reference,
          "Employee response received",
        );
    }
    return this.detail(id, user, header);
  }
  private async notify(
    userId: string,
    id: string,
    reference: string,
    title: string,
    kind: string = "QUERY",
  ) {
    try {
      const metadata = {
        kind: "CONDUCT_CASE",
        caseId: id,
        actionUrl: `/dashboard/insights/${kind === "COMPLAINT" ? "complaints" : "queries"}?caseId=${id}`,
      };
      await this.notifications.createNotification(
        userId,
        "INFO",
        title,
        reference,
        metadata,
      );
      await this.notifications.sendPush(userId, {
        type: "INFO",
        title,
        message: reference,
        metadata,
      });
      if (kind === "COMPLAINT") return;
      await this.push.send(userId, {
        type: "INFO",
        title,
        message: reference,
        metadata,
        actionUrl: metadata.actionUrl,
      });
    } catch {
      this.logger.warn("Case saved; a notification could not be delivered");
    }
  }
  async incomingComplaint(businessId: string, id: string, reference: string) {
    const business = await this.db.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });
    if (business?.ownerId)
      await this.notify(
        business.ownerId,
        id,
        reference,
        "New customer complaint received",
        "COMPLAINT",
      );
  }
}
