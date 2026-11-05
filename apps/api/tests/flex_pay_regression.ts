import assert from "node:assert/strict";
import { TimeTrackingService } from "../src/time-tracking/time-tracking.service";
import { FlexPayService, flexCents } from "../src/flex-pay/flex-pay.service";
import {
  allocateFlexPay,
  flexPayCutoff,
  reconcileFlexPay,
} from "../src/flex-pay/reconciliation";
async function main() {
  const now = Date.now(),
    employee: any = {
      id: "e",
      businessId: "b",
      userId: "officer",
      status: "ACTIVE",
      role: "EMPLOYEE",
      firstName: "TEST",
      lastName: "OFFICER",
      workerType: "W2",
      hourlyRate: 20,
      payType: "HOURLY",
      business: { settings: "{}" },
    };
  const shift: any = {
    id: "shift",
    businessId: "b",
    employeeId: "e",
    locationId: "site",
    status: "COMPLETED",
    startTime: new Date(now - 9 * 3600000),
    endTime: new Date(now - 3600000),
    employee,
    location: { name: "Emergency site", businessId: "b" },
  };
  const sheet: any = {
    id: "sheet",
    employeeId: "e",
    locationId: "site",
    status: "APPROVED",
    paidExternally: false,
    workerType: "W2",
    startTime: shift.startTime,
    endTime: shift.endTime,
    breaks: [],
    employee,
  };
  let row: any = null,
    paidPayroll = false,
    claimed = false,
    audits: string[] = [];
  const enrich = () =>
    row
      ? {
          ...row,
          employee,
          shift,
          timesheet: row.timesheetId ? sheet : null,
          reconciliations: [],
        }
      : null;
  const db: any = {
    user: {
      findUnique: async ({ where }: any) => ({
        id: where.id,
        role: "EMPLOYEE",
      }),
    },
    business: { findUnique: async () => ({ id: "b", ownerId: "owner" }) },
    employee: {
      findFirst: async ({ where }: any) =>
        where.userId === "officer" ? employee : null,
      update: async () => employee,
    },
    shift: {
      findFirst: async ({ where }: any) =>
        where.businessId === "b" && where.id === shift.id ? shift : null,
    },
    timesheet: {
      findFirst: async ({ where }: any) =>
        where.id === sheet.id ? sheet : null,
      findMany: async () => [sheet],
    },
    payStub: { findFirst: async () => (paidPayroll ? { id: "paid" } : null) },
    notification: { upsert: async () => ({}) },
    auditLog: {
      create: async ({ data }: any) => {
        audits.push(data.action);
      },
    },
    flexPayReconciliation: {},
    flexPay: {
      findFirst: async ({ where }: any) => {
        if (where.id?.not) return claimed ? { id: "duplicate" } : null;
        if (where.id)
          return row &&
            where.id === row.id &&
            where.businessId === row.businessId &&
            (!where.employeeId || where.employeeId === row.employeeId)
            ? enrich()
            : null;
        return row && !["DECLINED", "CANCELLED"].includes(row.status)
          ? enrich()
          : null;
      },
      findUnique: async ({ where }: any) =>
        row && (where.id === row.id || where.submissionId === row.submissionId)
          ? enrich()
          : null,
      create: async ({ data }: any) => {
        row = {
          ...data,
          id: "flex",
          status: "OFFERED",
          balanceCents: 0,
          createdAt: new Date(now - 1000),
        };
        return enrich();
      },
      updateMany: async ({ where, data }: any) => {
        if (!row || where.id !== row.id || where.status !== row.status)
          return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    $transaction: async (fn: any, options: any) => {
      assert.equal(options.isolationLevel, "Serializable");
      return fn(db);
    },
  };
  const api = new FlexPayService(db, { send: async () => {} } as any),
    admin = { userId: "owner", businessId: "b" },
    officer = { userId: "officer", businessId: "b" },
    foreign = { userId: "other", businessId: "b" };
  assert.equal(flexCents(12.34), 1234);
  assert.throws(() => flexCents(12.345));
  assert.throws(() => flexCents(-1));
  await assert.rejects(
    () => api.offer(foreign, { amount: 100 }, "b"),
    /Access denied/,
  );
  const body = {
    submissionId: "test-submission-0001",
    shiftId: "shift",
    amount: 100,
    reason: "Emergency coverage required",
  };
  const first = await api.offer(admin, body, "b");
  assert.equal(first.amount, 100);
  await api.offer(admin, body, "b");
  assert.equal(audits.filter((x) => x === "FLEX_PAY_OFFERED").length, 1);
  await assert.rejects(
    () =>
      api.offer(admin, { ...body, submissionId: "test-submission-0002" }, "b"),
    /already has/,
  );
  const payment = {
    timesheetId: "sheet",
    paymentMethod: "BANK_TRANSFER",
    paymentReference: "bank-001",
  };
  await assert.rejects(
    () => api.recordPayment(admin, row.id, payment, "b"),
    /must accept/,
  );
  await assert.rejects(
    () => api.respond(admin, row.id, { decision: "ACCEPT" }, "b"),
    /Only the assigned/,
  );
  await api.respond(officer, row.id, { decision: "ACCEPT" }, "b");
  assert.equal(row.status, "ACCEPTED");
  sheet.status = "PENDING";
  await assert.rejects(
    () => api.recordPayment(admin, row.id, payment, "b"),
    /approved/,
  );
  sheet.status = "APPROVED";
  paidPayroll = true;
  await assert.rejects(
    () => api.recordPayment(admin, row.id, payment, "b"),
    /duplicate pay/,
  );
  paidPayroll = false;
  claimed = true;
  await assert.rejects(
    () => api.recordPayment(admin, row.id, payment, "b"),
    /already belongs/,
  );
  claimed = false;
  const snapshot = shift.employeeId;
  shift.employeeId = "reassigned";
  await assert.rejects(
    () => api.recordPayment(admin, row.id, payment, "b"),
    /assignment changed/,
  );
  shift.employeeId = snapshot;
  const result = await api.recordPayment(admin, row.id, payment, "b");
  assert.equal(result.status, "PAID");
  assert.equal(result.balance, 100);
  assert.equal(row.paymentReference, "BANK-001");
  await api.recordPayment(admin, row.id, payment, "b");
  assert.equal(
    audits.filter((x) => x === "FLEX_PAY_PAYMENT_RECORDED").length,
    1,
  );
  await assert.rejects(
    () =>
      api.recordPayment(
        admin,
        row.id,
        { ...payment, paymentReference: "bank-002" },
        "b",
      ),
    /already recorded/,
  );
  await assert.rejects(
    () => api.cancel(admin, row.id, { reason: "Cancel payment" }, "b"),
    /retained/,
  );
  const flex = [
    { id: "flex", balanceCents: 10000, paymentReference: "BANK-001" },
  ];
  let allocation = allocateFlexPay(flex, 70);
  assert.equal(allocation.totalDeductions, 70);
  assert.equal(allocation.entries[0].amountCents, 7000);
  allocation = allocateFlexPay(flex, 100, new Map([["flex:flex", 70]]));
  assert.equal(allocation.totalDeductions, 30);
  allocation = allocateFlexPay(flex, 0);
  assert.equal(allocation.entries.length, 0);
  assert.equal(
    flexPayCutoff({
      payDate: "2026-11-15T00:00:00Z",
      calendarTimeZone: "America/New_York",
    }).toISOString(),
    "2026-11-16T04:59:59.999Z",
  );
  let balance = 10000,
    settled = 0,
    claims = 0,
    entries: any[] = [];
  const tx: any = {
    flexPay: {
      findMany: async () =>
        balance > 0 ? [{ id: "flex", balanceCents: balance }] : [],
      updateMany: async ({ where, data }: any) => {
        if (data.balanceCents) {
          if (balance < where.balanceCents.gte || balance === 0)
            return { count: 0 };
          balance -= data.balanceCents.decrement;
          claims++;
          return { count: 1 };
        }
        if (balance === 0) {
          settled++;
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
    flexPayReconciliation: {
      upsert: async ({ create }: any) => {
        entries.push(create);
      },
    },
    auditLog: { create: async () => {} },
  };
  const payroll = {
    id: "payroll-one",
    businessId: "b",
    payDate: new Date("2026-11-15T00:00Z"),
  };
  const stub = {
    employeeId: "e",
    grossPay: 80,
    taxes: 10,
    netPay: 0,
    deductions: 70,
    deductionDetails: JSON.stringify({
      flexPay: [{ flexPayId: "flex", amount: 70, amountCents: 7000 }],
    }),
  };
  await reconcileFlexPay(tx, payroll, stub, { userId: "owner" });
  assert.equal(balance, 3000);
  assert.equal(claims, 1);
  assert.equal(entries[0].amountCents, 7000);
  await assert.rejects(
    () => reconcileFlexPay(tx, payroll, stub, { userId: "owner" }),
    /balance changed/,
  );
  assert.equal(balance, 3000);
  const last = {
    ...stub,
    deductionDetails: JSON.stringify({
      flexPay: [{ flexPayId: "flex", amount: 30, amountCents: 3000 }],
    }),
  };
  await reconcileFlexPay(tx, { ...payroll, id: "payroll-two" }, last, {
    userId: "owner",
  });
  assert.equal(balance, 0);
  assert.equal(settled, 1);
  balance = 1000;
  await assert.rejects(
    () =>
      reconcileFlexPay(
        tx,
        payroll,
        { ...stub, netPay: 70, deductionDetails: "{}" },
        { userId: "owner" },
      ),
    /Recalculate payroll/,
  );
  const time: any = new TimeTrackingService({} as any, {} as any, {} as any);
  await assert.rejects(
    () =>
      time.assertNoPaidFlexAttendance(
        { flexPay: { findFirst: async () => ({ id: "flex" }) } },
        "sheet",
      ),
    /read-only/,
  );
  console.log(
    "Flex Pay passed: consent, tenant/worker permissions, duplicate offers/payments, completed approved work, prior payroll protection, source assignment changes, integer-cent offsets, dual-stub reservations and carry-forward",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
