import assert from "node:assert/strict";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";
import { createHash } from "crypto";
import { PayrollService } from "../src/payroll/payroll.service";
import { brandIssuedPayslip } from "../src/payroll/payslip-branding";

async function main() {
  const original = await PDFDocument.create();
  original
    .addPage([612, 792])
    .drawText("TEST WORKER - Gross $100.00; Taxes $10.00; Net $90.00");
  const bytes = Buffer.from(await original.save());
  const logoUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=";
  const branded = await brandIssuedPayslip(bytes, { logoUrl });
  const parsed = await PDFDocument.load(branded);
  assert.equal(parsed.getPageCount(), 1);
  assert.equal(
    parsed.getPage(0).getHeight(),
    856,
    "header adds space rather than covering the issued statement",
  );
  assert.equal(parsed.getPage(0).getWidth(), 612);
  assert.equal(
    parsed
      .getPage(0)
      .node.Resources()
      ?.lookup(PDFName.of("XObject"), PDFDict)
      .keys().length,
    1,
    "company logo is embedded",
  );
  assert.deepEqual(await brandIssuedPayslip(bytes, {}), bytes);
  const stub: any = {
    id: "one",
    employee: { userId: "worker" },
    payroll: { status: "PAID", businessId: "business", business: { logoUrl } },
  };
  const db: any = {
    payStub: { findUnique: async () => stub },
    payStubDocument: {
      findUnique: async () => ({
        content: bytes,
        fileName: "issued.pdf",
        sha256: createHash("sha256").update(bytes).digest("hex"),
      }),
    },
    business: {
      findFirst: async ({ where }: any) =>
        where.ownerId === "admin" ? { id: "business" } : null,
    },
    employee: { findFirst: async () => null },
  };
  const service = new PayrollService(db, {} as any);
  const mobile = await service.downloadPayStubPdf("one", {
    role: "EMPLOYEE",
    userId: "worker",
  });
  const web = await service.downloadPayStubPdf("one", {
    role: "BUSINESS_ADMIN",
    userId: "admin",
  });
  assert.deepEqual(
    web.data,
    mobile.data,
    "employee and administrator receive the same branded statement",
  );
  const batch = await service.downloadPayslipBatch(["one", "two", "one"], {
    role: "BUSINESS_ADMIN",
    userId: "admin",
  });
  assert.equal(
    (await PDFDocument.load(batch)).getPageCount(),
    2,
    "batch combines canonical statements and removes repeated IDs",
  );
  await assert.rejects(
    () =>
      service.downloadPayslipBatch(["one"], {
        role: "BUSINESS_ADMIN",
        userId: "foreign",
      }),
    /Access denied/,
  );
  await assert.rejects(
    () =>
      service.downloadPayslipBatch([], {
        role: "BUSINESS_ADMIN",
        userId: "admin",
      }),
    /Select between/,
  );
  console.log(
    "Payslip branding, matching web/mobile downloads, batch deduplication and access checks passed",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
