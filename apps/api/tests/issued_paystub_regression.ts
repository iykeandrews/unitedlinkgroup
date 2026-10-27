import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PayrollService } from "../src/payroll/payroll.service";

async function main() {
  const content = Buffer.from("%PDF-1.4\nOriginal employee statement\n%%EOF");
  const stub: any = {
    id: "stub",
    employee: { id: "worker", userId: "owner" },
    payroll: { status: "PAID", businessId: "A" },
  };
  let reads = 0;
  let hash = createHash("sha256").update(content).digest("hex");
  const db: any = {
    payStub: { findUnique: async () => stub },
    payStubDocument: {
      findUnique: async (q: any) => {
        reads++;
        assert.equal(q.where.payStubId, "stub");
        return { content, sha256: hash, fileName: "original.pdf" };
      },
    },
    business: { findFirst: async () => null },
    employee: { findFirst: async () => null },
  };
  const service = new PayrollService(db, {} as any);
  const file = await service.downloadPayStubPdf("stub", {
    role: "EMPLOYEE",
    userId: "owner",
  });
  assert.deepEqual(file.data, content);
  assert.equal(file.filename, "original.pdf");
  reads = 0;
  await assert.rejects(
    () =>
      service.downloadPayStubPdf("stub", { role: "EMPLOYEE", userId: "other" }),
    /Access denied/,
  );
  assert.equal(reads, 0);
  await assert.rejects(
    () =>
      service.downloadPayStubPdf("stub", {
        role: "BUSINESS_ADMIN",
        userId: "foreign",
      }),
    /Access denied/,
  );
  assert.equal(reads, 0);
  stub.payroll.status = "DRAFT";
  await assert.rejects(
    () =>
      service.downloadPayStubPdf("stub", { role: "EMPLOYEE", userId: "owner" }),
    /not available/,
  );
  assert.equal(reads, 0);
  stub.payroll.status = "PAID";
  hash = "tampered";
  await assert.rejects(
    () =>
      service.downloadPayStubPdf("stub", { role: "EMPLOYEE", userId: "owner" }),
    /verification failed/,
  );
  console.log(
    "PASS: original paystub bytes preserved; employee ownership, business access, paid-status restriction and document-integrity verification enforced before download.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
