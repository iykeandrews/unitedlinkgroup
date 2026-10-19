import assert from "node:assert/strict";
import {
  MobileOperationsService,
  isFieldLeader,
  onSiteDate,
} from "../src/time-tracking/mobile-operations.service";
import { TimeTrackingService } from "../src/time-tracking/time-tracking.service";
async function main() {
  const actor = { userId: "leader", businessId: "b", role: "EMPLOYEE" };
  let role = "EMPLOYEE",
    title = "Lieutenant",
    own = true,
    queried: any;
  const rosterShift: any = {
    id: "s",
    employeeId: "officer",
    locationId: "a",
    businessId: "b",
    startTime: new Date("2026-10-19T10:00Z"),
    endTime: new Date("2026-10-19T18:00Z"),
    status: "PUBLISHED",
    timeZone: "America/New_York",
    location: { id: "a", name: "Site A" },
    employee: { id: "officer", firstName: "Test", lastName: "Officer" },
  };
  const db: any = {
    user: { findUnique: async () => ({ role }) },
    business: { findUnique: async () => ({ id: "b", ownerId: "owner" }) },
    employee: {
      findFirst: async ({ where }: any) =>
        where.id
          ? null
          : { id: "lead", role: "EMPLOYEE", customRole: { name: title } },
      findMany: async () => [],
    },
    shift: {
      findMany: async (q: any) => {
        if (q.where.employeeId === "lead")
          return own ? [{ ...rosterShift, employeeId: "lead" }] : [];
        queried = q;
        return [rosterShift];
      },
    },
    timesheet: {
      findMany: async (q: any) => {
        assert.equal(q.where.employee.businessId, "b");
        return [];
      },
      findFirst: async () => null,
    },
  };
  const service = new MobileOperationsService(db, {} as any, {} as any);
  assert.equal(isFieldLeader({ customRole: { name: "Leutenant" } }), true);
  assert.equal(
    isFieldLeader({ department: { name: "Armed Special Police Officer" } }),
    false,
  );
  const result = await service.roster(actor, "2026-10-19");
  assert.equal(result.canManage, false);
  assert.equal(result.shifts.length, 1);
  assert.deepEqual(queried.where.locationId, { in: ["a"] });
  assert.equal(queried.where.status.in.includes("DRAFT"), false);
  await assert.rejects(
    () => service.requireAdmin(actor),
    /Only administrators/,
  );
  own = false;
  assert.equal((await service.roster(actor, "2026-10-19")).shifts.length, 0);
  own = true;
  title = "Security Officer";
  await assert.rejects(
    () => service.roster({ ...actor, role: "SUPER_ADMIN" }, "2026-10-19"),
    /requires an administrator/,
  );
  role = "BUSINESS_ADMIN";
  const access = await service.access(actor);
  assert.equal(access.canManage, true);
  await assert.rejects(
    () => service.requireAdmin(actor, "foreign-officer"),
    /not active in this business/,
  );
  await assert.rejects(
    () => service.requireAttendanceAdmin(actor, "foreign-sheet"),
    /outside/,
  );
  await assert.rejects(() => service.roster(actor, "2026-02-30"), /valid date/);
  assert.equal(
    onSiteDate(
      {
        ...rosterShift,
        startTime: new Date("2026-10-20T03:00Z"),
        endTime: new Date("2026-10-20T11:00Z"),
      },
      "2026-10-19",
    ),
    true,
  );
  assert.equal(
    onSiteDate(
      {
        ...rosterShift,
        startTime: new Date("2026-10-20T03:00Z"),
        endTime: new Date("2026-10-20T11:00Z"),
      },
      "2026-10-20",
    ),
    true,
  );
  assert.equal(
    onSiteDate(
      {
        ...rosterShift,
        startTime: new Date("2026-10-20T03:00Z"),
        endTime: new Date("2026-10-20T04:00Z"),
      },
      "2026-10-20",
    ),
    false,
  );
  // Native + inbox alerts reach only administrators; repeated late checks cannot spam recipients.
  const delivered: string[] = [],
    persisted = new Set<string>();
  const notifications: any = {
    createNotification: async (id: string) => delivered.push(id),
    sendPush: async () => {},
  };
  const alertDb: any = {
    location: { findUnique: async () => ({ name: "Site A" }) },
    employee: {
      findUnique: async () => ({
        id: "officer",
        firstName: "Test",
        lastName: "Officer",
        businessId: "b",
        business: { ownerId: "owner" },
      }),
      findMany: async (q: any) => {
        assert.equal(q.where.businessId, "b");
        assert.equal(q.where.OR[0].role, "BUSINESS_ADMIN");
        return [{ userId: "admin" }, { userId: "owner" }];
      },
    },
    user: {
      findMany: async (q: any) => {
        assert.equal(q.where.role, "SUPER_ADMIN");
        return [{ id: "super" }];
      },
    },
    notification: {
      create: async ({ data }: any) => {
        if (persisted.has(data.id)) throw { code: "P2002" };
        persisted.add(data.id);
        delivered.push(data.userId);
      },
    },
  };
  const alertService = new MobileOperationsService(alertDb, notifications, {
    send: async () => {},
  } as any);
  await alertService.notify("officer", "clocked in", {
    id: "t",
    locationId: "a",
  });
  assert.deepEqual(new Set(delivered), new Set(["admin", "owner", "super"]));
  delivered.length = 0;
  await alertService.notify(
    "officer",
    "is running late",
    rosterShift,
    "late:s",
  );
  await alertService.notify(
    "officer",
    "is running late",
    rosterShift,
    "late:s",
  );
  assert.equal(delivered.length, 3);
  // Administrator clock-out closes a running break and attendance, never the planned shift.
  let closed = false,
    breakClosed = false;
  const events: string[] = [],
    audits: string[] = [];
  const timeDb: any = {
    employee: { findUnique: async () => ({ id: "officer", businessId: "b" }) },
    timesheet: {
      findFirst: async () => ({ id: "t", employeeId: "officer" }),
      update: async ({ data }: any) => {
        closed = true;
        return { id: "t", employeeId: "officer", ...data };
      },
    },
    break: {
      findFirst: async () => (breakClosed ? null : { id: "br" }),
      update: async () => {
        breakClosed = true;
        return { id: "br" };
      },
    },
  };
  const ops: any = {
    requireAdmin: async () => {},
    notify: async (_: any, event: string) => events.push(event),
    audit: async (_: any, __: any, event: string) => audits.push(event),
  };
  const timeService = new TimeTrackingService(
    timeDb,
    {} as any,
    {} as any,
    ops,
  );
  await timeService.adminClockOut("officer", {
    role: "SUPER_ADMIN",
    businessId: "b",
    userId: "super",
  });
  assert.ok(closed && breakClosed);
  assert.deepEqual(events, ["clocked out"]);
  assert.deepEqual(audits, ["ADMIN_CLOCK_OUT"]);
  await assert.rejects(
    () => timeService.adminClockOut("officer", { role: "EMPLOYEE" }),
    /Only administrators/,
  );
  // Payroll that has been paid is immutable from mobile attendance edits.
  const paidDb: any = {
    timesheet: {
      findUnique: async () => ({
        id: "t",
        employeeId: "officer",
        startTime: new Date("2026-10-01T10:00Z"),
        endTime: new Date("2026-10-01T18:00Z"),
        employee: { businessId: "b" },
      }),
    },
    payStub: { findFirst: async () => ({ id: "paid" }) },
  };
  await assert.rejects(
    () =>
      new TimeTrackingService(paidDb, {} as any, {} as any).updateTimesheet(
        "t",
        { startTime: "2026-10-01T09:00Z" },
        { role: "SUPER_ADMIN" },
      ),
    /paid payroll/,
  );
  // Time corrections preserve approval consistency, reject overlaps, and record before/after data.
  let overlap = false,
    updated: any;
  const record: any = {
    id: "t",
    employeeId: "officer",
    startTime: new Date("2026-01-01T10:00Z"),
    endTime: null,
    status: "IN_PROGRESS",
    employee: { businessId: "b" },
  };
  const editDb: any = {
    payStub: { findFirst: async () => null },
    break: { findMany: async () => [] },
    timesheet: {
      findUnique: async () => record,
      findFirst: async () => (overlap ? { id: "other" } : null),
      update: async ({ data }: any) => {
        updated = data;
        return { ...record, ...data };
      },
    },
    $queryRawUnsafe: async () => {},
    $transaction: async (fn: any) => fn(editDb),
  };
  const editService = new TimeTrackingService(
    editDb,
    {} as any,
    {} as any,
    ops,
  );
  await editService.updateTimesheet(
    "t",
    { endTime: "2026-01-01T18:00Z", reason: "Correct missing clock-out" },
    { role: "SUPER_ADMIN" },
  );
  assert.equal(updated.status, "PENDING");
  assert.equal(audits[audits.length - 1], "ADMIN_TIME_ADJUSTMENT");
  overlap = true;
  await assert.rejects(
    () =>
      editService.updateTimesheet(
        "t",
        { endTime: "2026-01-01T18:00Z" },
        { role: "SUPER_ADMIN" },
      ),
    /overlaps/,
  );
  await assert.rejects(
    () =>
      editService.updateTimesheet(
        "t",
        { breaks: [{ startTime: "2026-01-01T12:00Z", type: "INVALID" }] },
        { role: "SUPER_ADMIN" },
      ),
    /Break type/,
  );
  // Only missing clock-ins generate the scheduled late event.
  let late = 0;
  const lateService = new MobileOperationsService(
    {
      shift: {
        findMany: async () => [
          { ...rosterShift, id: "missing" },
          { ...rosterShift, id: "present", employeeId: "present" },
        ],
      },
      timesheet: {
        findFirst: async ({ where }: any) =>
          where.employeeId === "present" ? { id: "t" } : null,
      },
    } as any,
    {} as any,
    {} as any,
  );
  lateService.notify = async () => {
    late++;
  };
  await lateService.lateAlerts();
  assert.equal(late, 1);
  console.log(
    "Mobile operations passed: database-backed roles, business isolation, scheduled-location scope, overnight dates, admin-only writes, notification recipients and deduplication, schedule-preserving clock-out and paid payroll protection.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
