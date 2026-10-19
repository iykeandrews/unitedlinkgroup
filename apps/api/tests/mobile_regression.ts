import assert from "node:assert/strict";
import { createHash } from "crypto";
import { AuthService } from "../src/auth/auth.service";
import { TimeTrackingService } from "../src/time-tracking/time-tracking.service";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
async function main() {
  const user = { id: "u", password: "hashed-password", role: "EMPLOYEE" };
  let record: any = null,
    active = true;
  const prisma: any = {
    user: { findUnique: async () => user },
    employee: {
      findFirst: async () => ({
        id: "e",
        status: active ? "ACTIVE" : "INACTIVE",
        role: "EMPLOYEE",
      }),
    },
    mobileSession: {
      create: async ({ data }: any) => {
        record = { ...data, id: "s", user, revokedAt: null };
      },
      findUnique: async ({ where }: any) =>
        record?.tokenHash === where.tokenHash ? { ...record } : null,
      updateMany: async ({ where, data }: any) => {
        if (
          record?.tokenHash !== where.tokenHash ||
          (where.revokedAt === null && record.revokedAt)
        )
          return { count: 0 };
        Object.assign(record, data);
        return { count: 1 };
      },
    },
  };
  const auth: any = new AuthService({} as any, {} as any, prisma);
  auth.validateUser = async () => user;
  auth.login = async () => ({ access_token: "jwt", businessId: "b" });
  const first = await auth.mobileLogin("official@example.com", "password");
  assert.notEqual(record.tokenHash, first.refresh_token);
  assert.equal(record.tokenHash, hash(first.refresh_token));
  const second = await auth.refreshMobileSession(first.refresh_token);
  assert.notEqual(second.refresh_token, first.refresh_token);
  await assert.rejects(() => auth.refreshMobileSession(first.refresh_token));
  active = false;
  await assert.rejects(() => auth.refreshMobileSession(second.refresh_token));
  active = true;
  user.password = "changed";
  await assert.rejects(() => auth.refreshMobileSession(second.refresh_token));
  user.password = "hashed-password";
  record.expiresAt = new Date(0);
  await assert.rejects(() => auth.refreshMobileSession(second.refresh_token));
  record.expiresAt = new Date(Date.now() + 100000);
  await auth.revokeMobileSession(second.refresh_token);
  await assert.rejects(() => auth.refreshMobileSession(second.refresh_token));
  const sheets = Array.from({ length: 6 }, (_, i) => ({
    id: String(i),
    workerType: "W2",
    status: i === 5 ? "PENDING" : "APPROVED",
    startTime: new Date(`2026-10-${18 + i}T06:00:00Z`),
    endTime: new Date(`2026-10-${18 + i}T15:00:00Z`),
    breaks: [
      {
        type: "UNPAID",
        startTime: new Date(`2026-10-${18 + i}T10:00:00Z`),
        endTime: new Date(`2026-10-${18 + i}T10:30:00Z`),
      },
    ],
    paidExternally: true,
    timeZone: "America/New_York",
    location: { id: "l", name: "Site" },
  }));
  const db: any = {
    employee: {
      findFirst: async () => ({
        id: "e",
        businessId: "b",
        workerType: "W2",
        w2Profile: { payType: "HOURLY", rate: 25, overtimeEligible: true },
        business: { settings: "{}" },
      }),
    },
    timesheet: {
      findMany: async ({ where }: any) => {
        assert.equal(where.employeeId, "e");
        return sheets;
      },
    },
    auditLog: {
      findMany: async () => [
        {
          createdAt: new Date("2026-11-01"),
          details: JSON.stringify({
            changes: [
              {
                classification: "W2",
                previousRate: 20,
                previousPayType: "HOURLY",
              },
            ],
          }),
        },
      ],
    },
  };
  const history = await new TimeTrackingService(
    db,
    {} as any,
    {} as any,
  ).myHistory({ userId: "u", businessId: "b" }, "2026");
  assert.equal(history[0].estimatedGross, null);
  assert.equal(history[0].approvedHours, null);
  assert.equal(history[1].approvedHours, 8.5);
  assert.equal(history[1].overtimeHours, 2.5);
  assert.equal(history[1].estimatedGross, 195);
  assert.equal(history[1].rate, 20);
  assert.equal(history[5].estimatedGross, 170);
  await assert.rejects(() =>
    new TimeTrackingService(db, {} as any, {} as any).myHistory(
      { userId: "u" },
      "invalid",
    ),
  );
  console.log(
    "Mobile regression passed: session rotation/replay, revocation, expiry, inactive and changed-password rejection; approved/pending history, unpaid breaks, weekly overtime and historical rates.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
