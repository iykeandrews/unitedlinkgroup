import assert from "node:assert/strict";
import { PassThrough, Readable } from "node:stream";
import { EmployeesService } from "../src/employees/employees.service";
import { UploadsController } from "../src/uploads/uploads.controller";
import { qualificationFields } from "../src/employees/qualification-fields";
async function main() {
  let saved: any;
  const employee = { id: "own", businessId: "b", userId: "u" };
  const db: any = {
    business: { findFirst: async () => null },
    employee: { findFirst: async () => employee },
    department: {
      findMany: async (q: any) => {
        assert.deepEqual(q.where, { businessId: "b", status: "ACTIVE" });
        assert.deepEqual(q.select, { id: true, name: true });
        return [{ id: "d", name: "Security Officer" }];
      },
    },
    qualification: {
      findFirst: async (q: any) => {
        assert.equal(q.where.employeeId, "own");
        return q.where.id === "foreign"
          ? null
          : {
              id: "q",
              employeeId: "own",
              status: "EXPIRED",
              issueDate: new Date("2020-01-01"),
            };
      },
      create: async ({ data }: any) => (saved = data),
      update: async ({ data }: any) => (saved = data),
    },
  };
  const service = new EmployeesService(db, {} as any, {} as any, {} as any);
  const user = { userId: "u", role: "MANAGER" };
  const options = await service.qualificationOptions(user);
  assert.equal(options.departments[0].name, "Security Officer");
  assert.deepEqual(options.issuingOrganizations, [
    "DLCP",
    "Maryland State Police Licensing Division",
  ]);
  await assert.rejects(
    () => service.qualificationOptions(user, "other-business"),
    /Access denied/,
  );
  await assert.rejects(
    () => service.updateMyQualification(user, "foreign", { name: "New" }),
    /not found/,
  );
  await service.updateMyQualification(user, "q", {
    name: "Updated",
    employeeId: "foreign",
    expiryDate: "2099-12-31T00:00:00Z",
    fileUrl: null,
  });
  assert.equal(saved.employeeId, undefined);
  assert.equal(saved.status, "ACTIVE");
  assert.equal(saved.fileUrl, null);
  await service.addMyQualification(user, {
    name: "Security Officer",
    type: "LICENSE",
    employeeId: "foreign",
  });
  assert.equal(saved.employeeId, "own");
  assert.throws(
    () =>
      qualificationFields({
        issueDate: "2026-02-01",
        expiryDate: "2026-01-01",
      }),
    /before/,
  );
  assert.throws(() => qualificationFields({ expiryDate: "invalid" }), /valid/);
  assert.equal(qualificationFields({ expiryDate: "" }).expiryDate, null);
  assert.throws(() => qualificationFields({expiryDate:"2026-02-30"}), /valid/);
  const headers: any = {};
  let redirected = "";
  const controller = new UploadsController({
    isS3Enabled: () => true,
    getStoredFileStream: async (key: string) => {
      assert.equal(key, "license.png");
      return {
        body: Readable.from([Buffer.from("image-bytes")]),
        contentType: "image/png",
      };
    },
    getSignedDownloadUrl: async () => "https://storage.example/signed",
  } as any);
  const response: any = new PassThrough();
  response.setHeader = (key: string, value: string) => (headers[key] = value);
  response.redirect = (url: string) => {
    redirected = url;
  };
  const chunks: Buffer[] = [];
  response.on("data", (chunk: Buffer) => chunks.push(chunk));
  await controller.serveFile("license.png", response, "1");
  assert.equal(Buffer.concat(chunks).toString(), "image-bytes");
  assert.equal(headers["Content-Type"], "image/png");
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.equal(redirected, "");
  await controller.serveFile("license.png", {
    redirect: (url: string) => {
      redirected = url;
    },
  } as any);
  assert.equal(redirected, "https://storage.example/signed");
  console.log(
    "Credential checks passed: scoped department options, own-record edits, renewal status, attachment clearing, date order and authenticated storage streaming.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
