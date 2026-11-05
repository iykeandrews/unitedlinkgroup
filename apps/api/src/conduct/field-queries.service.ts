import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../prisma.service";
import { ConductService } from "./conduct.service";
import { MobileOperationsService } from "../time-tracking/mobile-operations.service";
@Injectable()
export class FieldQueriesService {
  constructor(
    private db: PrismaService,
    private conduct: ConductService,
    private operations: MobileOperationsService,
  ) {}
  private async access(user: any, header?: string) {
    const businessId = await this.conduct.scope(user, header);
    return this.operations.access({ ...user, businessId });
  }
  private actor(user: any, access: any) {
    // Used only after a database-backed leadership check, for the narrow query operations below.
    return { ...user, role: "MANAGER", businessId: access.businessId };
  }
  private async requireLeader(user: any, header?: string) {
    const access = await this.access(user, header);
    if (!access.canView)
      throw new ForbiddenException(
        "Only managers and supervisors can issue officer queries",
      );
    return access;
  }
  private where(user: any, access: any) {
    return {
      businessId: access.businessId,
      kind: "QUERY",
      ...(!access.canManage
        ? { createdById: user.userId || user.sub || user.id }
        : {}),
    };
  }
  private project(row: any, user: any) {
    const actor = user.userId || user.sub || user.id;
    const {
      id,
      reference,
      title,
      description,
      category,
      priority,
      status,
      dueAt,
      issuedAt,
      resolution,
      outcome,
      correctiveAction,
      preventiveAction,
      createdAt,
      version,
      locationName,
      employee,
    } = row;
    return {
      id,
      reference,
      title,
      description,
      category,
      priority,
      status,
      dueAt,
      issuedAt,
      resolution,
      outcome,
      correctiveAction,
      preventiveAction,
      createdAt,
      version,
      locationName,
      employee,
      events: (row.events || [])
        .filter(
          (e: any) => e.visibility === "EMPLOYEE" || e.actorUserId === actor,
        )
        .map((e: any) => ({
          id: e.id,
          type: e.type,
          message: e.message,
          createdAt: e.createdAt,
          actorName: e.actorName,
        })),
    };
  }
  async options(user: any, header?: string) {
    const access = await this.access(user, header);
    if (!access.canView)
      return { canIssue: false, employees: [], locations: [] };
    const options = await this.conduct.options(
      this.actor(user, access),
      access.businessId,
    );
    return {
      ...options,
      canIssue: true,
      employees: options.employees.filter(
        (e: any) => e.id !== access.employeeId,
      ),
    };
  }
  async list(user: any, header?: string, pageText?: number) {
    const access = await this.requireLeader(user, header),
      where = this.where(user, access);
    const page = Number(pageText || 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      throw new BadRequestException("Invalid page");
    const [rows, total, groups] = await Promise.all([
      this.db.conductCase.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * 10,
        take: 10,
      }),
      this.db.conductCase.count({ where }),
      this.db.conductCase.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
    ]);
    return {
      rows: rows.map((row) => this.project(row, user)),
      total,
      page,
      stats: Object.fromEntries(groups.map((g) => [g.status, g._count._all])),
    };
  }
  async detail(id: string, user: any, header?: string) {
    const access = await this.requireLeader(user, header);
    const row = await this.db.conductCase.findFirst({
      where: { id, ...this.where(user, access) },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!row)
      throw new NotFoundException(
        "Query not found or not assigned to your management scope",
      );
    return this.project(row, user);
  }
  async createAndIssue(body: any, user: any, header?: string) {
    const access = await this.requireLeader(user, header);
    if (body.employeeId === access.employeeId)
      throw new BadRequestException("You cannot issue a query to yourself");
    const actorId = user.userId || user.sub || user.id;
    const reference =
      "QRY-" +
      createHash("sha256")
        .update([access.businessId, actorId, body.submissionId].join(":"))
        .digest("hex")
        .slice(0, 16)
        .toUpperCase();
    let row: any = await this.db.conductCase.findUnique({
      where: { reference },
    });
    if (!row) {
      if (
        !Number.isFinite(+new Date(body.dueAt)) ||
        +new Date(body.dueAt) <= Date.now()
      )
        throw new BadRequestException("Choose a future response deadline");
      try {
        row = await this.conduct.create(
          {
            kind: "QUERY",
            subject: "EMPLOYEE",
            employeeId: body.employeeId,
            locationId: body.locationId || undefined,
            title: body.title,
            description: body.description,
            category: body.category,
            priority: body.priority,
            dueAt: body.dueAt,
            ownerEmployeeId: access.employeeId,
          },
          this.actor(user, access),
          access.businessId,
          reference,
        );
      } catch (error: any) {
        if (error.code !== "P2002") throw error;
        row = await this.db.conductCase.findUnique({ where: { reference } });
        if (!row) throw error;
      }
    }
    if (
      row.businessId !== access.businessId ||
      row.createdById !== actorId ||
      row.kind !== "QUERY" ||
      row.employeeId !== body.employeeId ||
      row.title !== body.title.trim() ||
      row.description !== body.description.trim() ||
      row.category !== body.category.trim() ||
      +new Date(row.dueAt) !== +new Date(body.dueAt) ||
      (row.locationId || "") !== (body.locationId || "") ||
      row.priority !== (body.priority || "MEDIUM")
    )
      throw new ConflictException(
        "This submission was already saved with different details. Review the saved query before issuing another.",
      );
    return this.issue(row.id, user, header);
  }
  async issue(id: string, user: any, header?: string) {
    const access = await this.requireLeader(user, header);
    const row = await this.detail(id, user, header);
    if (row.status !== "DRAFT") return row;
    await this.conduct.action(
      id,
      { action: "ISSUE", version: row.version },
      this.actor(user, access),
      access.businessId,
    );
    return this.detail(id, user, header);
  }
}
