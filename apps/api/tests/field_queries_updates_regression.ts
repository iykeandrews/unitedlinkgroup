import assert from "node:assert/strict";
import { FieldQueriesService } from "../src/conduct/field-queries.service";
import { AppUpdateNotificationsService } from "../src/app-update-notifications.service";
async function main() {
  let leader = true,
    admin = false,
    created = 0,
    issued = 0,
    rows: any[] = [];
  const actor = { userId: "supervisor", role: "EMPLOYEE", businessId: "b" };
  const matches = (row: any, where: any) =>
    Object.entries(where).every(([key, value]) => row[key] === value);
  const db: any = {
    conductCase: {
      findUnique: async ({ where }: any) =>
        rows.find((r) => r.reference === where.reference),
      findFirst: async ({ where }: any) => rows.find((r) => matches(r, where)),
      findMany: async ({ where }: any) => rows.filter((r) => matches(r, where)),
      count: async ({ where }: any) =>
        rows.filter((r) => matches(r, where)).length,
      groupBy: async () => [],
    },
  };
  const conduct: any = {
    scope: async (_: any, header?: string) => {
      if (header && header !== "b") throw Error("wrong business");
      return "b";
    },
    options: async () => ({
      employees: [{ id: "lead" }, { id: "officer" }],
      locations: [],
    }),
    create: async (
      body: any,
      user: any,
      businessId: string,
      reference: string,
    ) => {
      assert.equal(body.kind, "QUERY");
      assert.equal(body.subject, "EMPLOYEE");
      assert.equal(user.role, "MANAGER");
      assert.equal(businessId, "b");
      created++;
      const row = {
        ...body,
        id: "query-" + created,
        reference,
        businessId,
        createdById: "supervisor",
        status: "DRAFT",
        version: 0,
        customerContact: "private@example.com",
        rootCause: "Private",
        events: [
          {
            id: "internal",
            visibility: "INTERNAL",
            actorUserId: "other",
            message: "Private note",
          },
          { id: "shared", visibility: "EMPLOYEE", message: "Shared note" },
        ],
      };
      rows.push(row);
      return row;
    },
    action: async (id: string, body: any) => {
      assert.equal(body.action, "ISSUE");
      const row = rows.find((r) => r.id === id);
      row.status = "AWAITING_RESPONSE";
      row.version++;
      issued++;
    },
  };
  const operations: any = {
    access: async () => ({
      businessId: "b",
      employeeId: "lead",
      canView: leader,
      canManage: admin,
    }),
  };
  const service = new FieldQueriesService(db, conduct, operations);
  const body = {
    submissionId: "submission-1234567890",
    employeeId: "officer",
    locationId: "",
    title: "Post order explanation",
    description: "Please explain the observed event.",
    category: "Post orders",
    priority: "MEDIUM",
    dueAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const options = await service.options(actor);
  assert.equal(options.canIssue, true);
  assert.deepEqual(
    options.employees.map((e) => e.id),
    ["officer"],
  );
  const result = await service.createAndIssue(body, actor);
  assert.equal(result.status, "AWAITING_RESPONSE");
  assert.equal((result as any).customerContact, undefined);
  assert.equal((result as any).rootCause, undefined);
  assert.deepEqual(
    result.events.map((e: any) => e.id),
    ["shared"],
  );
  await service.createAndIssue(body, actor);
  assert.equal(created, 1);
  assert.equal(issued, 1);
  await assert.rejects(
    () => service.createAndIssue({ ...body, title: "Changed title" }, actor),
    /different details/,
  );
  await assert.rejects(
    () => service.createAndIssue({ ...body, employeeId: "lead" }, actor),
    /yourself/,
  );
  await assert.rejects(
    () =>
      service.createAndIssue(
        { ...body, submissionId: "another-reference", dueAt: "2020-01-01" },
        actor,
      ),
    /future/,
  );
  rows.push({
    ...rows[0],
    id: "other-manager",
    reference: "other",
    createdById: "other",
  });
  rows.push({
    ...rows[0],
    id: "complaint",
    reference: "complaint",
    kind: "COMPLAINT",
  });
  rows.push({
    ...rows[0],
    id: "foreign",
    reference: "foreign",
    businessId: "foreign",
  });
  assert.equal((await service.list(actor)).total, 1);
  await assert.rejects(
    () => service.detail("other-manager", actor),
    /not found/,
  );
  await assert.rejects(() => service.detail("complaint", actor), /not found/);
  await assert.rejects(() => service.detail("foreign", actor), /not found/);
  await assert.rejects(() => service.list(actor, undefined, Infinity), /page/);
  leader = false;
  assert.equal((await service.options(actor)).canIssue, false);
  await assert.rejects(
    () => service.createAndIssue(body, actor),
    /Only managers/,
  );
  leader = true;
  admin = true;
  assert.equal((await service.list(actor)).total, 2);
  // No real notifications are sent: all delivery services below are mocks.
  const env = { ...process.env };
  let pushes: any[] = [];
  const notices = new Set<string>();
  try {
    process.env.MOBILE_IOS_LATEST_VERSION = "1.0.4";
    process.env.MOBILE_IOS_UPDATE_URL =
      "https://apps.apple.com/app/id6811577530";
    process.env.MOBILE_ANDROID_LATEST_VERSION = "1.0.4";
    process.env.MOBILE_ANDROID_UPDATE_URL =
      "https://play.google.com/store/apps/details?id=com.unitedlinkgroup.mobile";
    const notificationDb: any = {
      expoPushToken: {
        findMany: async ({ where }: any) => {
          assert.equal(where.user.employeeProfiles.some.status.in[0], "ACTIVE");
          return where.platform === "ios"
            ? [
                { userId: "old", token: "old-device", appVersion: "1.0.3" },
                {
                  userId: "current",
                  token: "current-device",
                  appVersion: "1.0.4",
                },
                {
                  userId: "unknown",
                  token: "unknown-device",
                  appVersion: null,
                },
              ]
            : [];
        },
      },
      notification: {
        create: async ({ data }: any) => {
          if (notices.has(data.id))
            throw Object.assign(Error("duplicate"), { code: "P2002" });
          notices.add(data.id);
          assert.equal(data.type, "APP_UPDATE");
        },
      },
    };
    const jobs = new AppUpdateNotificationsService(
      notificationDb,
      { sendExpoUpdate: async (tokens: any[]) => pushes.push(tokens) } as any,
      { sendPush: async () => {} } as any,
    );
    await jobs.notifyReleasedUpdates();
    await jobs.notifyReleasedUpdates();
    assert.equal(notices.size, 1);
    assert.equal(pushes.length, 1);
    assert.equal(pushes[0][0].token, "old-device");
  } finally {
    process.env = env;
  }
  console.log(
    "Field query and release checks passed: supervisor permissions, tenant/creator scope, complaint privacy, idempotent issue, deadlines and targeted deduplicated update notices.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
