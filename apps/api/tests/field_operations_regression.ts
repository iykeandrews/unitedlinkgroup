import assert from "node:assert/strict";
import {
  OfficerAssessmentsService,
  assessmentCriteria,
  assessmentChecks,
} from "../src/time-tracking/officer-assessments.service";
import { TimeTrackingService } from "../src/time-tracking/time-tracking.service";

async function main() {
  const actor = { userId: "leader", businessId: "b" };
  let access: any = {
      businessId: "b",
      employeeId: "lead",
      canView: true,
      canFieldClock: true,
    },
    created: any,
    where: any,
    alerts = 0;
  const db: any = {
    officerAssessment: {
      findUnique: async () => null,
      create: async ({ data }: any) => {
        created = data;
        return { ...data, id: "assessment" };
      },
      findMany: async (q: any) => {
        where = q.where;
        return [];
      },
      count: async (q: any) => {
        assert.equal(q.where.businessId, "b");
        return q.where.followUpAt ? 2 : 4;
      },
      aggregate: async (q: any) => {
        assert.deepEqual(q.where, { businessId: "b", employeeId: "officer" });
        return {
          _avg: { score: 87.125 },
          _max: { observedAt: new Date("2026-11-04T12:00Z") },
        };
      },
    },
    employee: {
      findFirst: async ({ where }: any) =>
        where.businessId === "b" && where.id === "officer"
          ? { id: "officer", userId: "worker" }
          : null,
    },
    location: {
      findFirst: async ({ where }: any) =>
        where.businessId === "b" && where.id === "site" ? { id: "site" } : null,
    },
  };
  const ops: any = { access: async () => access };
  const notifications: any = {
    createNotification: async () => {
      alerts++;
    },
    sendPush: async () => {},
  };
  const service = new OfficerAssessmentsService(db, ops, notifications, {
    send: async () => {},
  } as any);
  const body: any = {
    submissionId: "assessment-submission-1234",
    employeeId: "officer",
    locationId: "site",
    observedAt: new Date(Date.now() - 60000).toISOString(),
    ratings: Object.fromEntries(
      assessmentCriteria.map((c, i) => [c, i === 0 ? 0 : 4]),
    ),
    checklist: Object.fromEntries(assessmentChecks.map((c) => [c, "MET"])),
    notes:
      "Officer was alert and demonstrated understanding of the post orders.",
    action: "No action required",
  };
  const result = await service.create(actor, body);
  assert.equal(result.score, 80);
  assert.equal(created.businessId, "b");
  assert.equal(alerts, 1);
  await assert.rejects(
    () => service.create(actor, { ...body, employeeId: "foreign" }),
    /active officer/,
  );
  await assert.rejects(
    () => service.create(actor, { ...body, locationId: "foreign" }),
    /active officer/,
  );
  await assert.rejects(
    () =>
      service.create(actor, {
        ...body,
        ratings: { ...body.ratings, [assessmentCriteria[1]]: 6 },
      }),
    /Rate every/,
  );
  await assert.rejects(
    () =>
      service.create(actor, {
        ...body,
        ratings: Object.fromEntries(assessmentCriteria.map((c) => [c, 0])),
      }),
    /At least one/,
  );
  await assert.rejects(
    () => service.create(actor, { ...body, checklist: {} }),
    /Complete each/,
  );
  await assert.rejects(
    () =>
      service.create(actor, { ...body, action: "Management review required" }),
    /follow-up date/,
  );
  await assert.rejects(
    () => service.create(actor, { ...body, observedAt: "2099-01-01" }),
    /future/,
  );
  access = {
    ...access,
    canView: false,
    canFieldClock: false,
    employeeId: "officer",
  };
  const listing = await service.list(actor);
  assert.equal(listing.summary.averageScore, 87.1);
  assert.equal(listing.summary.followUps, 2);
  assert.equal(listing.total, 4);
  assert.deepEqual(where, { businessId: "b", employeeId: "officer" });
  await assert.rejects(() => service.create(actor, body), /Only managers/);
  const fieldDb: any = {
    location: {
      findMany: async (q: any) => {
        assert.equal(q.where.businessId, "b");
        return [
          {
            id: "site",
            geoLat: 38,
            geoLng: -77,
            timeZone: "America/New_York",
            radius: 100,
          },
        ];
      },
    },
  };
  const time = new TimeTrackingService(fieldDb, {} as any, {} as any, ops);
  await assert.rejects(
    () => time.fieldClockIn(actor, { lat: 38, lng: -77 }),
    /active manager/,
  );
  access = { ...access, canView: true, canFieldClock: true };
  let captured: any;
  time.clockIn = async (...args: any[]) => {
    captured = args;
    return { id: "t" } as any;
  };
  await assert.rejects(
    () => time.fieldClockIn(actor, { lat: NaN, lng: -77 }),
    /Enable GPS/,
  );
  await assert.rejects(
    () => time.fieldClockIn(actor, { lat: 39, lng: -77 }),
    /No registered site/,
  );
  await time.fieldClockIn(actor, { lat: 38, lng: -77 });
  assert.equal(captured[1], "site");
  assert.deepEqual(captured[5].fieldSchedule, {
    businessId: "b",
    userId: "leader",
  });
  fieldDb.location.findMany = async () => [
    { id: "site", geoLat: 38, geoLng: -77 },
    { id: "other", geoLat: 38, geoLng: -77 },
  ];
  const choice: any = await time.fieldClockIn(actor, { lat: 38, lng: -77 });
  assert.equal(choice.requiresLocationSelection, true);
  assert.equal(choice.locations.length, 2);
  // Real clock-in transaction creates attendance and its calendar entry together; existing plans are reused.
  let planned: any = null,
    shift: any,
    transaction = false;
  const clockDb: any = {
    employee: {
      findUnique: async ({ select }: any) =>
        select.workerType ? { workerType: "W2" } : { businessId: "b" },
    },
    location: {
      findUnique: async ({ select }: any) =>
        select.timeZone
          ? { timeZone: "America/New_York" }
          : {
              id: "site",
              businessId: "b",
              geoLat: 38,
              geoLng: -77,
              radius: 100,
            },
    },
    timesheet: {
      findFirst: async () => null,
      create: async ({ data }: any) => {
        assert.ok(transaction);
        return { ...data, id: "sheet" };
      },
    },
    shift: {
      findFirst: async () => planned,
      create: async ({ data }: any) => {
        assert.ok(transaction);
        shift = data;
      },
    },
    auditLog: { create: async () => {} },
    $queryRawUnsafe: async () => {},
  };
  clockDb.$transaction = async (fn: any) => {
    transaction = true;
    try {
      return await fn(clockDb);
    } finally {
      transaction = false;
    }
  };
  const clock = new TimeTrackingService(
    clockDb,
    {} as any,
    {} as any,
    { notify: async () => {} } as any,
  );
  await clock.clockIn("officer", "site", 38, -77, "ip", {
    fieldSchedule: { businessId: "b", userId: "leader" },
  });
  assert.equal(shift.groupId, "FIELD_CLOCK:sheet");
  assert.equal(shift.status, "PUBLISHED");
  assert.equal(shift.autoClockout1hDone, true);
  planned = { id: "existing" };
  shift = null;
  await clock.clockIn("officer", "site", 38, -77, "ip", {
    fieldSchedule: { businessId: "b", userId: "leader" },
  });
  assert.equal(shift, null);
  let finalized: any;
  clockDb.timesheet.findFirst = async () => ({
    id: "sheet",
    employeeId: "officer",
    locationId: "site",
  });
  clockDb.timesheet.update = async ({ data }: any) => ({
    id: "sheet",
    employeeId: "officer",
    locationId: "site",
    ...data,
  });
  clockDb.break = { findFirst: async () => null };
  clockDb.shift.updateMany = async (q: any) => {
    finalized = q;
  };
  (clock as any).applyShortShiftBreakRule = async () => {};
  await clock.clockOut("officer");
  assert.equal(finalized.where.groupId, "FIELD_CLOCK:sheet");
  assert.equal(finalized.data.status, "COMPLETED");
  assert.ok(finalized.data.endTime instanceof Date);
  console.log(
    "Field operations passed: assessment validation, employee privacy, tenant checks, score calculation, GPS detection, ambiguous sites, atomic calendar creation, planned-shift reuse and clock-out completion.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
