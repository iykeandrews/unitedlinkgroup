import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { MobileOperationsService } from "./mobile-operations.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PushService } from "../push/push.service";

export const assessmentCriteria = [
  "Appearance & uniform",
  "Professional conduct & work ethic",
  "Post order knowledge",
  "Post order compliance",
  "Alertness & situational awareness",
  "Communication & customer service",
  "Safety & equipment readiness",
] as const;
export const assessmentChecks = [
  "Uniform clean and complete",
  "Identification / license available",
  "Required equipment present",
  "Post orders reviewed",
  "Assigned post covered",
  "Safety procedures followed",
] as const;
export const assessmentActions = [
  "No action required",
  "Coaching completed",
  "Refresher training required",
  "Management review required",
] as const;
const person = { id: true, firstName: true, lastName: true };
@Injectable()
export class OfficerAssessmentsService {
  constructor(
    private prisma: PrismaService,
    private operations: MobileOperationsService,
    private notifications: NotificationsService,
    private push: PushService,
  ) {}
  async options(user: any) {
    const access = await this.operations.access(user);
    return {
      canAssess: access.canView,
      criteria: assessmentCriteria,
      checklist: assessmentChecks,
      actions: assessmentActions,
      employees: access.canView
        ? await this.prisma.employee.findMany({
            where: { businessId: access.businessId, status: "ACTIVE" },
            select: person,
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          })
        : [],
      locations: access.canView
        ? await this.prisma.location.findMany({
            where: { businessId: access.businessId, status: "ACTIVE" },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : [],
    };
  }
  async list(user: any, pageText?: string) {
    const access = await this.operations.access(user);
    if (!access.canView && !access.employeeId)
      throw new ForbiddenException("Employee profile required");
    const page = Math.max(1, Math.min(10000, Number(pageText) || 1));
    if (!Number.isInteger(page)) throw new BadRequestException("Invalid page");
    const where = {
      businessId: access.businessId,
      ...(!access.canView ? { employeeId: access.employeeId! } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.officerAssessment.findMany({
        where,
        include: {
          employee: { select: person },
          location: { select: { id: true, name: true } },
          evaluator: { select: person },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 30,
        skip: (page - 1) * 30,
      }),
      this.prisma.officerAssessment.count({ where }),
    ]);
    return {
      page,
      total,
      rows: rows.map((r) => ({
        ...r,
        ratings: JSON.parse(r.ratings),
        checklist: JSON.parse(r.checklist),
      })),
    };
  }
  async create(user: any, body: any) {
    const access = await this.operations.access(user);
    if (!access.canView)
      throw new ForbiddenException(
        "Only managers, supervisors and administrators may assess officers",
      );
    const actor = user.userId || user.sub || user.id;
    if (!body || !/^[-a-zA-Z0-9]{16,80}$/.test(body.submissionId || ""))
      throw new BadRequestException("A submission reference is required");
    const existing = await this.prisma.officerAssessment.findUnique({
      where: { submissionId: body.submissionId },
    });
    if (existing) {
      if (
        existing.businessId !== access.businessId ||
        existing.evaluatorUserId !== actor
      )
        throw new ForbiddenException("Invalid submission reference");
      return { id: existing.id };
    }
    if (
      typeof body.employeeId !== "string" ||
      typeof body.locationId !== "string"
    )
      throw new BadRequestException("Choose an active officer and site");
    const [employee, location] = await Promise.all([
      this.prisma.employee.findFirst({
        where: {
          id: body.employeeId,
          businessId: access.businessId,
          status: "ACTIVE",
        },
        select: { ...person, userId: true },
      }),
      this.prisma.location.findFirst({
        where: {
          id: body.locationId,
          businessId: access.businessId,
          status: "ACTIVE",
        },
        select: { id: true },
      }),
    ]);
    if (!employee || !location)
      throw new BadRequestException(
        "Choose an active officer and site in this business",
      );
    if (employee.userId === actor)
      throw new BadRequestException("You cannot assess yourself");
    const ratings = body.ratings,
      checklist = body.checklist;
    if (
      !ratings ||
      Array.isArray(ratings) ||
      Object.keys(ratings).length !== assessmentCriteria.length ||
      assessmentCriteria.some(
        (k) =>
          !Number.isInteger(ratings[k]) || ratings[k] < 0 || ratings[k] > 5,
      )
    )
      throw new BadRequestException(
        "Rate every criterion from 1 to 5, or select not observed",
      );
    const scored = assessmentCriteria
      .map((k) => ratings[k])
      .filter((n) => n > 0);
    if (!scored.length)
      throw new BadRequestException("At least one criterion must be observed");
    if (
      !checklist ||
      Array.isArray(checklist) ||
      Object.keys(checklist).length !== assessmentChecks.length ||
      assessmentChecks.some(
        (k) => !["MET", "NOT_MET", "NOT_OBSERVED"].includes(checklist[k]),
      )
    )
      throw new BadRequestException("Complete each inspection check");
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (notes.length < 10 || notes.length > 6000)
      throw new BadRequestException(
        "Provide an objective assessment narrative of 10–6,000 characters",
      );
    if (!assessmentActions.includes(body.action))
      throw new BadRequestException("Choose a follow-up action");
    const observedAt = new Date(body.observedAt),
      followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
    if (!Number.isFinite(+observedAt) || +observedAt > Date.now() + 60000)
      throw new BadRequestException(
        "Observation time must not be in the future",
      );
    if (
      followUpAt &&
      (!Number.isFinite(+followUpAt) || +followUpAt < +observedAt)
    )
      throw new BadRequestException(
        "Follow-up date must be after the observation",
      );
    if (
      ["Refresher training required", "Management review required"].includes(
        body.action,
      ) &&
      !followUpAt
    )
      throw new BadRequestException(
        "Choose a follow-up date for the required action",
      );
    const score =
      Math.round(
        (scored.reduce((a, b) => a + b, 0) / scored.length / 5) * 1000,
      ) / 10;
    let record;
    try {
      record = await this.prisma.officerAssessment.create({
        data: {
          businessId: access.businessId,
          employeeId: employee.id,
          locationId: location.id,
          evaluatorUserId: actor,
          submissionId: body.submissionId,
          observedAt,
          ratings: JSON.stringify(ratings),
          checklist: JSON.stringify(checklist),
          score,
          notes,
          action: body.action,
          followUpAt,
        },
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        const duplicate = await this.prisma.officerAssessment.findUnique({
          where: { submissionId: body.submissionId },
        });
        if (
          duplicate &&
          duplicate.businessId === access.businessId &&
          duplicate.evaluatorUserId === actor
        )
          return { id: duplicate.id };
      }
      throw error;
    }
    if (employee.userId) {
      const payload = {
        type: "OFFICER_ASSESSMENT",
        title: "New site assessment",
        message: `Your site assessment is available. Overall score: ${score}%.`,
        metadata: {
          kind: "OFFICER_ASSESSMENT",
          assessmentId: record.id,
          businessId: access.businessId,
        },
        actionUrl: "/mobile/assessments",
      };
      await Promise.allSettled([
        this.notifications.createNotification(
          employee.userId,
          payload.type,
          payload.title,
          payload.message,
          payload.metadata,
        ),
        this.notifications.sendPush(employee.userId, payload),
        this.push.send(employee.userId, payload),
      ]);
    }
    return { id: record.id, score };
  }
}
