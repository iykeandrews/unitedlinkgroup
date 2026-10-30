import assert from "node:assert/strict";
import { IncidentReportsService } from "../src/incident-reports/incident-reports.service";
import { mobileRelease } from "../src/mobile-release";

async function main() {
  const events: any[] = [],
    mail: any[] = [];
  let report: any = null,
    records = 0,
    observedWhere: any;
  const db: any = {
    business: {
      findFirst: async () => ({ id: "business" }),
      findUnique: async () => ({ name: "TEST COMPANY" }),
    },
    employee: { findFirst: async () => null },
    location: {
      findUnique: async () => ({ id: "site", businessId: "business" }),
    },
    incidentReport: {
      findFirst: async () => null,
      findUnique: async () => report,
      create: async ({ data }: any) => {
        records++;
        report = {
          ...data,
          id: data.id || "report",
          location: {
            name: "TEST SITE",
            incidentReportEmails: '["client@example.com"]',
          },
          evidence: [],
          reportingOfficer: { userId: "worker" },
        };
        return report;
      },
      count: async () => 0,
      findMany: async ({ where }: any) => {
        observedWhere = where;
        return [];
      },
    },
    incidentTimelineEvent: {
      create: async ({ data }: any) => {
        if (data.id && events.some((event) => event.id === data.id))
          throw { code: "P2002" };
        events.push(data);
        return data;
      },
      findFirst: async () =>
        [...events]
          .reverse()
          .find((event) =>
            ["EMAIL_SENT", "EMAIL_FAILED"].includes(event.eventType),
          ),
    },
    $transaction: async (operation: any) =>
      typeof operation === "function" ? operation(db) : Promise.all(operation),
  };
  const service = new IncidentReportsService(
    db,
    {} as any,
    {
      send: async (value: any) => {
        mail.push(value);
      },
    } as any,
  );
  const admin = { role: "SUPER_ADMIN", userId: "admin" };
  for (const type of [
    "GENERAL",
    "PATROL",
    "CAR_INVENTORY",
    "SHIFT_REPORT",
    "VISITOR_LOG",
  ]) {
    report = null;
    events.length = 0;
    mail.length = 0;
    const submissionId = `mobile-report-${type}-12345`;
    const payload = {
      title: "TEST REPORT",
      description: "All required information is recorded.",
      type,
      locationId: "site",
      deferEmail: true,
      submissionId,
    };
    const created = await service.create(payload, admin, "business");
    assert.equal(created.type, type);
    assert.equal(created.clientDelivery.status, "PENDING");
    assert.equal(mail.length, 0, "email must wait for evidence uploads");
    const before = records;
    await service.create(payload, admin, "business");
    assert.equal(
      records,
      before,
      "retrying a request must reuse the saved report",
    );
    report.evidence = [{ originalName: "uploaded-before-email.jpg" }];
    assert.equal(
      (await service.completeSubmission(created.id, admin)).status,
      "SENT",
    );
    assert.equal(mail.length, 1);
    assert.equal(mail[0].to, "client@example.com");
    assert(
      mail[0].attachments[0].content
        .subarray(0, 5)
        .equals(Buffer.from("%PDF-")),
    );
    assert.equal(
      (await service.completeSubmission(created.id, admin)).status,
      "SENT",
    );
    assert.equal(
      mail.length,
      1,
      "completion retries must not duplicate client email",
    );
  }
  db.employee.findFirst = async () => ({ businessId: "business" });
  await assert.rejects(
    () =>
      service.findOne(report.id, {
        role: "EMPLOYEE",
        userId: "another-worker",
      }),
    /own reports/,
  );
  await assert.rejects(
    () =>
      service.addEvidence(
        report.id,
        { role: "EMPLOYEE", userId: "another-worker" },
        { url: "file", filename: "file", originalName: "file" },
      ),
    /own reports/,
  );
  await service.findAll({ role: "EMPLOYEE", userId: "worker" }, "business");
  assert(
    observedWhere.AND[0].OR.some(
      (item: any) => item.submittedById === "worker",
    ),
  );
  report.location.incidentReportEmails = "[]";
  assert.equal(
    (await service.completeSubmission(report.id, admin)).status,
    "NOT_CONFIGURED",
  );
  const saved = { ...process.env };
  const originalFetch = global.fetch;
  try {
    process.env.MOBILE_ANDROID_LATEST_VERSION = "1.0.3";
    process.env.MOBILE_ANDROID_UPDATE_URL =
      "https://play.google.com/store/apps/details?id=com.unitedlinkgroup.mobile";
    assert.equal((await mobileRelease("android"))?.version, "1.0.3");
    process.env.MOBILE_ANDROID_UPDATE_URL = "javascript:bad";
    assert.equal(await mobileRelease("android"), null);
    assert.equal(await mobileRelease("unknown"), null);
    delete process.env.MOBILE_IOS_LATEST_VERSION;
    delete process.env.MOBILE_IOS_UPDATE_URL;
    global.fetch = (async () => ({
      ok: true,
      json: async () => ({
        results: [{ bundleId: "com.unitedlinkgroup.mobile", version: "1.0.1" }],
      }),
    })) as any;
    assert.equal((await mobileRelease("ios"))?.version, "1.0.1");
  } finally {
    process.env = saved;
    global.fetch = originalFetch;
  }
  console.log(
    "Five database/email categories, deferred delivery, duplicate prevention, employee privacy and released-version metadata checks passed",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
