import assert from "node:assert/strict";
import { ConductService } from "../src/conduct/conduct.service";
import { ComplaintPortalService } from "../src/conduct/complaint-portal.service";
import { randomUUID } from "crypto";
import { Module, UnauthorizedException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ConductController } from "../src/conduct/conduct.controller";
import { ComplaintPortalController } from "../src/conduct/complaint-portal.controller";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";
import { RolesGuard } from "../src/auth/roles.guard";
import { readFileSync } from "fs";
import { GUARDS_METADATA } from "@nestjs/common/constants";

async function main() {
  const cases: any[] = [],
    events: any[] = [],
    notifications: any[] = [],
    emails: any[] = [];
  const employees: any[] = [
    {
      id: "e1",
      userId: "worker1",
      businessId: "b1",
      status: "ACTIVE",
      firstName: "ONE",
      lastName: "OFFICER",
    },
    {
      id: "e2",
      userId: "worker2",
      businessId: "b1",
      status: "ACTIVE",
      firstName: "TWO",
      lastName: "OFFICER",
    },
    {
      id: "foreign",
      userId: "foreign-user",
      businessId: "b2",
      status: "ACTIVE",
    },
  ];
  const business: any = {
    id: "b1",
    ownerId: "owner",
    name: "TEST SECURITY",
    status: "ACTIVE",
    complaintPortalKey: "a".repeat(32),
  };
  const matches = (row: any, where: any): boolean =>
    Object.entries(where || {}).every(([key, value]: any) => {
      if (key === "employee")
        return employees.some(
          (e) => e.id === row.employeeId && e.userId === value.userId,
        );
      if (key === "OR") return value.some((w: any) => matches(row, w));
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("not" in value)
          return value.not === null ? row[key] != null : row[key] !== value.not;
        if ("in" in value) return value.in.includes(row[key]);
        if ("notIn" in value) return !value.notIn.includes(row[key]);
        if ("lt" in value) return row[key] && +new Date(row[key]) < +value.lt;
        if ("gte" in value) return +new Date(row[key]) >= +value.gte;
        if ("contains" in value)
          return String(row[key] || "")
            .toLowerCase()
            .includes(value.contains.toLowerCase());
      }
      return row[key] === value;
    });
  const hydrate = (row: any, include: any) =>
    row
      ? {
          ...row,
          employee: employees.find((e) => e.id === row.employeeId),
          ...(include?.business ? { business } : {}),
          events: events.filter(
            (e) =>
              e.caseId === row.id &&
              (!include?.events?.where || matches(e, include.events.where)),
          ),
        }
      : null;
  const db: any = {
    business: {
      findFirst: async ({ where }: any) =>
        matches(business, where) ? business : null,
      findUnique: async ({ where }: any) =>
        matches(business, where) ? business : null,
      updateMany: async ({ data }: any) => {
        Object.assign(business, data);
        return { count: 1 };
      },
    },
    employee: {
      findFirst: async ({ where }: any) =>
        employees.find((e) => matches(e, where)),
      findMany: async ({ where }: any) =>
        employees.filter((e) => matches(e, where)),
      findUnique: async ({ where }: any) =>
        employees.find((e) => e.id === where.id),
    },
    user: {
      findUnique: async () => ({ firstName: "TEST", lastName: "ACTOR" }),
    },
    location: { findFirst: async () => null, findMany: async () => [] },
    conductCase: {
      create: async ({ data, include }: any) => {
        if (
          data.publicSubmissionId &&
          cases.some((c) => c.publicSubmissionId === data.publicSubmissionId)
        )
          throw { code: "P2002" };
        const { events: nested, ...rest } = data;
        const row = {
          id: randomUUID(),
          version: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...rest,
        };
        cases.push(row);
        if (nested?.create)
          events.push({
            id: randomUUID(),
            createdAt: new Date(),
            caseId: row.id,
            ...nested.create,
          });
        return hydrate(row, include);
      },
      findFirst: async ({ where, include }: any) =>
        hydrate(
          cases.find((c) => matches(c, where)),
          include,
        ),
      findUnique: async ({ where, include }: any) =>
        hydrate(
          cases.find((c) => matches(c, where)),
          include,
        ),
      findMany: async ({ where, include, skip = 0, take = 100 }: any) =>
        cases
          .filter((c) => matches(c, where))
          .slice(skip, skip + take)
          .map((c) => hydrate(c, include)),
      count: async ({ where }: any) =>
        cases.filter((c) => matches(c, where)).length,
      groupBy: async ({ where }: any) => {
        const groups: any = {};
        cases
          .filter((c) => matches(c, where))
          .forEach((c) => (groups[c.status] = (groups[c.status] || 0) + 1));
        return Object.entries(groups).map(([status, count]) => ({
          status,
          _count: { _all: count },
        }));
      },
      updateMany: async ({ where, data }: any) => {
        const row = cases.find((c) => matches(c, where));
        if (!row) return { count: 0 };
        const { version, ...rest } = data;
        Object.assign(row, rest);
        row.version += version?.increment || 0;
        return { count: 1 };
      },
    },
    conductCaseEvent: {
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), createdAt: new Date(), ...data };
        events.push(row);
        return row;
      },
      findFirst: async ({ where }: any) =>
        [...events].reverse().find((e) => matches(e, where)),
    },
    $transaction: async (fn: any) => fn(db),
  };
  const service = new ConductService(
    db,
    {
      createNotification: async (...args: any[]) => notifications.push(args),
      sendPush: async () => {},
    } as any,
    { send: async () => {} } as any,
  );
  const admin = { role: "BUSINESS_ADMIN", userId: "owner" },
    worker = { role: "EMPLOYEE", userId: "worker1" },
    other = { role: "EMPLOYEE", userId: "worker2" };
  const payload = {
    kind: "QUERY",
    subject: "EMPLOYEE",
    title: "Attendance concern",
    description:
      "Please provide your account of the reported attendance issue.",
    category: "Attendance",
    employeeId: "e1",
    ownerEmployeeId: "e2",
    dueAt: new Date(Date.now() + 86400000).toISOString(),
  };
  let query: any = await service.create(payload, admin, "b1");
  await assert.rejects(
    () => service.detail(query.id, worker, "b1"),
    /not found/,
    "draft must remain private",
  );
  await assert.rejects(
    () => service.create({ ...payload, employeeId: "foreign" }, admin, "b1"),
    /this business/,
  );
  await assert.rejects(
    () => service.create(payload, worker, "b1"),
    /Administrator/,
  );
  query = await service.action(
    query.id,
    { version: query.version, action: "ISSUE" },
    admin,
    "b1",
  );
  assert.equal(query.status, "AWAITING_RESPONSE");
  assert.equal(notifications.length, 1);
  query = await service.action(
    query.id,
    {
      version: query.version,
      action: "ASSIGN",
      priority: "URGENT",
      category: "Attendance review",
    },
    admin,
    "b1",
  );
  assert.equal(query.priority, "URGENT");
  assert.equal(
    query.ownerEmployeeId,
    "e2",
    "triage changes must preserve an existing owner",
  );
  query = await service.action(
    query.id,
    {
      version: query.version,
      action: "NOTE",
      message: "PRIVATE INVESTIGATION MATERIAL",
    },
    admin,
    "b1",
  );
  const employeeView: any = await service.detail(query.id, worker, "b1");
  assert(!JSON.stringify(employeeView).includes("PRIVATE INVESTIGATION"));
  assert(!("createdById" in employeeView));
  await assert.rejects(
    () => service.detail(query.id, other, "b1"),
    /not found/,
  );
  await assert.rejects(() => service.scope(admin, "b2"), /Access denied/);
  await assert.rejects(
    () =>
      service.action(
        query.id,
        { version: 0, action: "NOTE", message: "Old update" },
        admin,
        "b1",
      ),
    /changed/,
  );
  const response: any = await service.action(
    query.id,
    {
      version: query.version,
      action: "RESPOND",
      message: "My account of the events is recorded here.",
    },
    worker,
    "b1",
  );
  assert.equal(response.status, "UNDER_REVIEW");
  assert(response.events.some((e: any) => e.type === "RESPOND"));
  await assert.rejects(
    () =>
      service.action(
        query.id,
        {
          version: response.version,
          action: "RESOLVE",
          message: "I clear myself",
        },
        worker,
        "b1",
      ),
    /Administrator/,
  );
  query = await service.action(
    query.id,
    {
      version: response.version,
      action: "RESOLVE",
      message: "Decision shared with officer",
      outcome: "NO_MISCONDUCT",
      resolution: "The allegation was not substantiated.",
      rootCause: "PRIVATE ROOT CAUSE",
      correctiveAction: "No action required.",
    },
    admin,
    "b1",
  );
  const decision: any = await service.detail(query.id, worker, "b1");
  assert.equal(decision.resolution, "The allegation was not substantiated.");
  assert(!JSON.stringify(decision).includes("PRIVATE ROOT CAUSE"));
  const ack: any = await service.action(
    query.id,
    { version: query.version, action: "ACKNOWLEDGE" },
    worker,
    "b1",
  );
  assert(ack.events.some((e: any) => e.type === "DECISION_ACKNOWLEDGED"));
  const complaint: any = await service.create(
    {
      ...payload,
      kind: "COMPLAINT",
      subject: "OPERATIONS",
      employeeId: undefined,
      customerName: "PRIVATE CUSTOMER",
      customerContact: "private@example.com",
    },
    admin,
    "b1",
  );
  await assert.rejects(
    () => service.detail(complaint.id, worker, "b1"),
    /not found/,
  );
  assert.equal((await service.list(worker, "b1", { kind: "QUERY" })).total, 1);
  await assert.rejects(
    () => service.list(worker, "b1", { kind: "COMPLAINT" }),
    /confidential/,
  );

  const old = { ...process.env },
    fetchBefore = global.fetch;
  let verifyResult: any = {
      success: true,
      action: "complaint",
      hostname: "www.unitedlinkgroup.com",
    },
    verifyCalls = 0;
  try {
    process.env.JWT_SECRET = "UNIT_TEST_SECRET_ONLY";
    process.env.FRONTEND_URL =
      "https://unitedlinkgroup.com,https://www.unitedlinkgroup.com,https://unitedlinkgroup-1.onrender.com";
    delete process.env.PUBLIC_WEB_URL;
    delete process.env.TURNSTILE_ALLOWED_HOSTNAMES;
    process.env.TURNSTILE_SITE_KEY = "unit-test-site";
    process.env.TURNSTILE_SECRET_KEY = "unit-test-secret";
    global.fetch = (async (url: string, options: any) => {
      assert.equal(
        url,
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      );
      const request = JSON.parse(options.body);
      assert.equal(request.secret, "unit-test-secret");
      verifyCalls++;
      return { ok: true, json: async () => verifyResult };
    }) as any;
    const portal = new ComplaintPortalService(db, service, {
      send: async (value: any) => {
        emails.push(value);
      },
    } as any);
    const info = await portal.info(business.complaintPortalKey);
    assert.equal(info.available, true);
    assert(!JSON.stringify(info).includes("unit-test-secret"));
    const publicData = {
      submissionId: randomUUID(),
      name: "CUSTOMER",
      email: "Customer@example.com",
      title: "Service concern",
      subject: "OPERATIONS",
      description: "A detailed customer account of the service issue.",
      verificationToken: "human-token",
    };
    verifyResult = { success: false };
    const count = cases.length;
    await assert.rejects(
      () => portal.submit(business.complaintPortalKey, publicData),
      /verification failed/,
    );
    assert.equal(cases.length, count);
    assert.equal(emails.length, 0);
    verifyResult = {
      success: true,
      action: "wrong",
      hostname: "www.unitedlinkgroup.com",
    };
    await assert.rejects(
      () => portal.submit(business.complaintPortalKey, publicData),
      /verification failed/,
    );
    verifyResult = {
      success: true,
      action: "complaint",
      hostname: "attacker.example",
    };
    await assert.rejects(
      () => portal.submit(business.complaintPortalKey, publicData),
      /verification failed/,
    );
    verifyResult = {
      success: true,
      action: "complaint",
      hostname: "www.unitedlinkgroup.com",
    };
    const ticket = await portal.submit(business.complaintPortalKey, publicData);
    assert(ticket.ticketNumber.startsWith("CMP-"));
    assert.equal(ticket.receipt, "SENT");
    assert.equal(emails.length, 1);
    assert(emails[0].text.includes(ticket.ticketNumber));
    assert(
      ticket.trackingUrl.startsWith(
        "https://www.unitedlinkgroup.com/complaints/track/",
      ),
    );
    assert(!ticket.trackingUrl.includes(","));
    const repeat = await portal.submit(business.complaintPortalKey, publicData);
    assert.equal(repeat.ticketNumber, ticket.ticketNumber);
    assert.equal(
      emails.length,
      1,
      "retry must not send duplicate confirmation",
    );
    const publicCase = cases.find((c) => c.reference === ticket.ticketNumber);
    let internal: any = await service.action(
      publicCase.id,
      {
        version: 0,
        action: "NOTE",
        message: "DO NOT DISCLOSE THIS STAFF NOTE",
      },
      admin,
      "b1",
    );
    internal = await service.action(
      publicCase.id,
      {
        version: internal.version,
        action: "CUSTOMER_UPDATE",
        message: "We are reviewing your concern.",
      },
      admin,
      "b1",
    );
    internal = await service.action(
      publicCase.id,
      {
        version: internal.version,
        action: "RESOLVE",
        message: "Internal approval detail",
        resolution: "Service has been corrected.",
        outcome: "RESOLVED_BY_SERVICE_RECOVERY",
        rootCause: "PRIVATE CAUSE",
        correctiveAction: "PRIVATE PERSONNEL ACTION",
      },
      admin,
      "b1",
    );
    const token = new URL(ticket.trackingUrl).pathname.split("/").pop()!;
    const track = await portal.track(token);
    const json = JSON.stringify(track);
    assert(json.includes("Service has been corrected."));
    assert(json.includes("We are reviewing your concern."));
    assert(!json.includes("DO NOT DISCLOSE"));
    assert(!json.includes("PRIVATE PERSONNEL"));
    assert(!json.includes("customerEmail"));
    await assert.rejects(() => portal.track(ticket.ticketNumber), /not found/);
    await assert.rejects(
      () =>
        portal.submit(business.complaintPortalKey, {
          ...publicData,
          submissionId: randomUUID(),
          website: "spam",
        }),
      /verified/,
    );
    delete process.env.TURNSTILE_SECRET_KEY;
    await assert.rejects(
      () =>
        portal.submit(business.complaintPortalKey, {
          ...publicData,
          submissionId: randomUUID(),
        }),
      /not configured/,
    );
    assert.equal(
      cases.length,
      count + 1,
      "blocked robots and retries must not create extra cases",
    );
    assert(verifyCalls >= 5);
  } finally {
    process.env = old;
    global.fetch = fetchBefore;
  }
  const portal = new ComplaintPortalService(db, service, {
    send: async () => {
      throw Error("Real mail must not be used in tests");
    },
  } as any);
  const guards = Reflect.getMetadata(GUARDS_METADATA, ConductController);
  assert(guards.includes(JwtAuthGuard));
  class TestAuthenticationGuard {
    canActivate(context: any) {
      const req = context.switchToHttp().getRequest();
      if (!req.headers["x-test-user"]) throw new UnauthorizedException();
      req.user = req.headers["x-test-user"] === "admin" ? admin : worker;
      return true;
    }
  }
  Reflect.defineMetadata(
    GUARDS_METADATA,
    [TestAuthenticationGuard, RolesGuard],
    ConductController,
  );
  @Module({
    imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
    controllers: [ConductController, ComplaintPortalController],
    providers: [
      { provide: ConductService, useValue: service },
      { provide: ComplaintPortalService, useValue: portal },
      {
        provide: JwtAuthGuard,
        useValue: {
          canActivate: (context: any) => {
            const req = context.switchToHttp().getRequest();
            if (!req.headers["x-test-user"]) throw new UnauthorizedException();
            req.user = req.headers["x-test-user"] === "admin" ? admin : worker;
            return true;
          },
        },
      },
      RolesGuard,
      { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
  })
  class TestModule {}
  const app = await NestFactory.create(TestModule, { logger: ["error"] });
  await app.listen(0, "127.0.0.1");
  try {
    const base = await app.getUrl();
    assert.equal((await fetch(base + "/conduct")).status, 401);
    assert.equal(
      (
        await fetch(base + "/conduct?kind=QUERY", {
          headers: { "x-test-user": "worker", "x-business-id": "b1" },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + "/conduct?kind=COMPLAINT", {
          headers: { "x-test-user": "worker", "x-business-id": "b1" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/conduct?search[a]=bad", {
          headers: { "x-test-user": "admin", "x-business-id": "b1" },
        })
      ).status,
      400,
    );
    const before = cases.length;
    const robot = {
      submissionId: randomUUID(),
      name: "BOT",
      email: "bot@example.com",
      title: "Robot request",
      subject: "OPERATIONS",
      description: "This request must never create a ticket.",
      verificationToken: "fabricated",
    };
    for (let n = 0; n < 5; n++) {
      const response = await fetch(
        base + "/public/complaints/" + business.complaintPortalKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(robot),
        },
      );
      assert([400, 503].includes(response.status));
    }
    assert.equal(
      (
        await fetch(
          base + "/public/complaints/" + business.complaintPortalKey,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(robot),
          },
        )
      ).status,
      429,
    );
    assert.equal(
      cases.length,
      before,
      "HTTP bot requests cannot create tickets",
    );
  } finally {
    await app.close();
    Reflect.defineMetadata(GUARDS_METADATA, guards, ConductController);
  }
  const sql = readFileSync(
    "apps/api/tests/conduct-schema-additions.sql",
    "utf8",
  );
  assert(!/\bDROP\s+(TABLE|COLUMN)|\bTRUNCATE\b|\bDELETE\s+FROM/i.test(sql));
  assert.equal((sql.match(/CREATE TABLE/g) || []).length, 2);
  console.log(
    "Conduct checks passed: tenant isolation, private drafts, officer responses/decisions, audit versions, customer privacy, ticket receipts, CAPTCHA failures and duplicate prevention.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
