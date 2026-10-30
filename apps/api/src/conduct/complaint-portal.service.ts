import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../prisma.service";
import { SmtpMailerService } from "../common/email/smtp-mailer.service";
import { ConductService } from "./conduct.service";
import { PublicComplaintDto } from "./complaint-portal.dto";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
@Injectable()
export class ComplaintPortalService {
  constructor(
    private db: PrismaService,
    private conduct: ConductService,
    private mail: SmtpMailerService,
  ) {}
  private origin() {
    return new URL(
      process.env.PUBLIC_WEB_URL ||
        process.env.FRONTEND_URL ||
        "https://www.unitedlinkgroup.com",
    ).origin;
  }
  private token(id: string, submissionId: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret)
      throw new ServiceUnavailableException(
        "Customer receipts are not configured. Please contact the company.",
      );
    return createHmac("sha256", secret)
      .update(`complaint-tracking:${id}:${submissionId}`)
      .digest("base64url");
  }
  private ready() {
    if (
      process.env.NODE_ENV === "production" &&
      /^(?:1x|2x|3x)0+/.test(process.env.TURNSTILE_SITE_KEY || "")
    )
      return false;
    return !!(
      process.env.TURNSTILE_SITE_KEY &&
      process.env.TURNSTILE_SECRET_KEY &&
      process.env.JWT_SECRET
    );
  }
  async link(user: any, header?: string) {
    if (!["SUPER_ADMIN", "BUSINESS_ADMIN", "MANAGER"].includes(user.role))
      throw new ForbiddenException("Administrator access required");
    const businessId = await this.conduct.scope(user, header);
    let business = await this.db.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException("Business not found");
    if(business.status!=='ACTIVE')throw new BadRequestException('Activate this business before sharing a complaint portal');
    if (!business.complaintPortalKey) {
      await this.db.business.updateMany({
        where: { id: businessId, complaintPortalKey: null },
        data: { complaintPortalKey: randomBytes(24).toString("base64url") },
      });
      business = await this.db.business.findUnique({
        where: { id: businessId },
      });
    }
    return {
      url: `${this.origin()}/complaints/${business!.complaintPortalKey}`,
      verificationReady: this.ready(),
    };
  }
  private async business(key: string) {
    if (!/^[a-zA-Z0-9_-]{32}$/.test(key))
      throw new NotFoundException("Complaint portal not found");
    const business = await this.db.business.findUnique({
      where: { complaintPortalKey: key },
    });
    if (!business || business.status !== "ACTIVE")
      throw new NotFoundException("Complaint portal not found");
    return business;
  }
  async info(key: string) {
    const business = await this.business(key);
    return {
      name: business.name,
      siteKey: this.ready() ? process.env.TURNSTILE_SITE_KEY : null,
      available: this.ready(),
    };
  }
  async verify(token: string, submissionId: string) {
    if (!this.ready())
      throw new ServiceUnavailableException(
        "Human verification is not configured. Please contact the company.",
      );
    let result: any;
    try {
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: token,
            idempotency_key: submissionId,
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) throw Error("Verification unavailable");
      result = await response.json();
    } catch {
      throw new ServiceUnavailableException(
        "Human verification is temporarily unavailable. Please retry.",
      );
    }
    const hosts = (
      process.env.TURNSTILE_ALLOWED_HOSTNAMES || new URL(this.origin()).hostname
    )
      .split(",")
      .map((host) => host.trim().toLowerCase());
    if (
      result?.success !== true ||
      result.action !== "complaint" ||
      !hosts.includes(String(result.hostname).toLowerCase())
    )
      throw new BadRequestException(
        "Human verification failed or expired. Please complete it again.",
      );
  }
  async submit(key: string, data: PublicComplaintDto) {
    const business = await this.business(key);
    if (
      data.name.trim().length < 2 ||
      data.title.trim().length < 3 ||
      data.description.trim().length < 15
    )
      throw new BadRequestException(
        "Enter your name, a subject and a detailed account of the concern",
      );
    if (data.website?.trim())
      throw new BadRequestException("Submission could not be verified");
    await this.verify(data.verificationToken, data.submissionId);
    const email = data.email.trim().toLowerCase();
    let row = await this.db.conductCase.findUnique({
      where: { publicSubmissionId: data.submissionId },
    });
    if (row && (row.businessId !== business.id || row.customerEmail !== email))
      throw new BadRequestException("Invalid submission reference");
    let created = false;
    if (!row) {
      const recent = await this.db.conductCase.count({
        where: {
          businessId: business.id,
          customerEmail: email,
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      });
      if (recent >= 3)
        throw new BadRequestException(
          "Several tickets have already been submitted. Please use your existing tracking link, or try again later.",
        );
      const id = randomUUID(),
        tracking = this.token(id, data.submissionId);
      try {
        row = await this.db.conductCase.create({
          data: {
            id,
            businessId: business.id,
            reference: `CMP-${new Date().getUTCFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
            kind: "COMPLAINT",
            subject: data.subject,
            title: data.title.trim(),
            category: "Customer concern",
            priority: "MEDIUM",
            status: "OPEN",
            description: [
              data.employeeName
                ? `Employee named by customer: ${data.employeeName.trim()}`
                : "",
              data.description.trim(),
            ]
              .filter(Boolean)
              .join("\n\n"),
            locationName: data.locationName?.trim(),
            customerName: data.name.trim(),
            customerContact: email,
            customerEmail: email,
            publicSubmissionId: data.submissionId,
            publicTrackingHash: hash(tracking),
            createdById: "PUBLIC_CUSTOMER",
            events: {
              create: {
                actorUserId: "PUBLIC_CUSTOMER",
                actorName: "Customer",
                type: "CREATED",
                visibility: "CUSTOMER",
                message:
                  "Complaint received. The company will review the concern and provide updates here.",
              },
            },
          },
        });
        created = true;
      } catch (error: any) {
        if (error?.code !== "P2002") throw error;
        row = await this.db.conductCase.findUnique({
          where: { publicSubmissionId: data.submissionId },
        });
        if (
          !row ||
          row.businessId !== business.id ||
          row.customerEmail !== email
        )
          throw error;
      }
    }
    const trackingUrl = `${this.origin()}/complaints/track/${this.token(row!.id, data.submissionId)}`;
    let receipt = "PENDING";
    if (!created) {
      const event = await this.db.conductCaseEvent.findFirst({
        where: {
          caseId: row!.id,
          type: { in: ["RECEIPT_SENT", "RECEIPT_FAILED"] },
        },
        orderBy: { createdAt: "desc" },
      });
      receipt =
        event?.type === "RECEIPT_SENT"
          ? "SENT"
          : event?.type === "RECEIPT_FAILED"
            ? "FAILED"
            : "PENDING";
    }
    if (created) {
      const text = `Hello ${data.name.trim()},\n\nThank you for contacting ${business.name}. We have received your complaint.\n\nYour ticket number: ${row!.reference}\nSubject: ${row!.title}\n\nFollow your case securely:\n${trackingUrl}\n\nKeep this link private. It provides access to customer-facing updates, not internal staff records. Please quote your ticket number in any correspondence.\n\n${business.name}\nCustomer Care`;
      try {
        await this.mail.send({
          to: email,
          subject: `Complaint received · ${row!.reference} · ${business.name}`,
          text,
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;color:#142d47;line-height:1.7"><h2>Your complaint has been received</h2><p>Ticket <strong>${escape(row!.reference)}</strong></p><p><a href="${escape(trackingUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Track your complaint</a></p><div style="white-space:pre-wrap">${escape(text)}</div></div>`,
        });
        receipt = "SENT";
      } catch {
        receipt = "FAILED";
      }
      await this.db.conductCaseEvent.create({
        data: {
          caseId: row!.id,
          actorUserId: "SYSTEM",
          actorName: "System",
          type: `RECEIPT_${receipt}`,
          visibility: "INTERNAL",
          message:
            receipt === "SENT"
              ? "Ticket confirmation accepted by the mail server."
              : "Ticket saved, but confirmation email delivery failed.",
        },
      });
      await this.conduct.incomingComplaint(
        business.id,
        row!.id,
        row!.reference,
      );
    }
    return { ticketNumber: row!.reference, trackingUrl, receipt };
  }
  async track(token: string) {
    if (!/^[a-zA-Z0-9_-]{43}$/.test(token))
      throw new NotFoundException("Ticket not found");
    const row = await this.db.conductCase.findUnique({
      where: { publicTrackingHash: hash(token) },
      include: {
        business: { select: { name: true } },
        events: {
          where: { visibility: "CUSTOMER" },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!row || row.kind !== "COMPLAINT")
      throw new NotFoundException("Ticket not found");
    return {
      ticketNumber: row.reference,
      businessName: row.business.name,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      resolution: row.resolution,
      events: row.events.map((event) => ({
        id: event.id,
        type: event.type,
        message: event.message,
        createdAt: event.createdAt,
      })),
    };
  }
}
