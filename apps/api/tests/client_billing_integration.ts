import assert from "node:assert/strict";
import * as bcrypt from "bcrypt";
import { PrismaClient } from "@unitedlinkgroup/database";
import { ClientsService } from "../src/clients/clients.service";
import { LocationsService } from "../src/locations/locations.service";
import { InvoicesService } from "../src/invoices/invoices.service";
import {
  billingAddress,
  invoiceRecipients,
  billingList,
} from "../src/invoices/invoice-billing";
import { generateInvoicePdf } from "../src/invoices/invoice-pdf";
import { writeFileSync } from "node:fs";
const url = process.env.BILLING_TEST_DATABASE_URL;
if (
  !url ||
  !/^billing_verification_20261014(?:_run\d+)?$/.test(
    new URL(url).searchParams.get("schema") || "",
  )
)
  throw Error("Dedicated billing verification schema required");
const db: any = new PrismaClient({ datasources: { db: { url } } });
let checks = 0;
const equal = (a: any, b: any) => {
  assert.deepEqual(a, b);
  checks++;
};
const rejects = async (fn: () => Promise<any>, pattern: RegExp) => {
  await assert.rejects(fn, pattern);
  checks++;
};
async function main() {
  if (await db.user.count()) throw Error("Verification schema must be empty");
  const owner = await db.user.create({
    data: {
      email: "billing-preview@example.test",
      password: await bcrypt.hash("BillingPreview!23", 10),
      role: "BUSINESS_ADMIN",
      firstName: "Billing",
      lastName: "Preview",
    },
  });
  const business = await db.business.create({
    data: {
      ownerId: owner.id,
      name: "Client billing verification",
      country: "US",
      currencyCode: "USD",
    },
  });
  const other = await db.business.create({
    data: { ownerId: owner.id, name: "Second owned business" },
  });
  const outsider = await db.user.create({
    data: {
      email: "outsider@example.test",
      password: "synthetic-only",
      role: "BUSINESS_ADMIN",
    },
  });
  const foreign = await db.business.create({
    data: { ownerId: outsider.id, name: "Foreign business" },
  });
  const user = { userId: owner.id, role: "BUSINESS_ADMIN" };
  const clients = new ClientsService(db);
  const locations = new LocationsService(db, {
    geocode: async () => null,
  } as any);
  const client = await clients.create(
    user,
    {
      name: " Capitol Services ",
      street: "200 Example Avenue",
      city: "Washington",
      state: "DC",
      zip: "20001",
      country: "USA",
      email: "contact@example.test",
      billingContactEmail: "accounts@example.test",
      billingContactEmail2: "legacy@example.test",
      ccEmails: [
        " Finance@Example.test ",
        "supervisor@example.test",
        "finance@example.test",
        "accounts@example.test",
      ],
    },
    business.id,
  );
  equal(client.name, "Capitol Services");
  equal(
    billingAddress(client),
    "200 Example Avenue\nWashington, DC, 20001\nUSA",
  );
  equal(invoiceRecipients(client), {
    to: "accounts@example.test",
    cc: [
      "contact@example.test",
      "legacy@example.test",
      "finance@example.test",
      "supervisor@example.test",
      "invoice@unitedlinksecurity.com",
    ],
  });
  await rejects(
    () =>
      clients.create(user, { name: "Bad CC", ccEmails: ["bad"] }, business.id),
    /valid CC/,
  );
  await rejects(
    () =>
      clients.create(
        user,
        { name: "Blank pin", ccEmails: Array(51).fill("a@example.test") },
        business.id,
      ),
    /maximum 50/,
  );
  await rejects(
    () => clients.create(user, { name: "Foreign" }, foreign.id),
    /Access denied/,
  );
  equal(
    (await clients.create(user, { name: "Second business client" }, other.id))
      .businessId,
    other.id,
  );
  const site = await locations.create(
    user,
    {
      name: "Capitol site",
      address: "300 Example Street",
      clientId: client.id,
      status: "ACTIVE",
      workOrder: " WO-1042 ",
      billingPins: ["PIN-100", "PIN-200", "PIN-100"],
    },
    business.id,
  );
  equal(site.status, "ACTIVE");
  equal(site.workOrder, "WO-1042");
  equal(billingList(site.billingPins), ["PIN-100", "PIN-200"]);
  equal(await db.servicePin.count({ where: { locationId: site.id } }), 0);
  const noPins = await locations.create(
    user,
    {
      name: "No pins needed",
      address: "400 Example Street",
      clientId: client.id,
      status: "ACTIVE",
    },
    business.id,
  );
  equal(billingList(noPins.billingPins), []);
  equal(noPins.status, "ACTIVE");
  await rejects(
    () => locations.update(user, site.id, { billingPins: [" "] }, business.id),
    /non-empty/,
  );
  await rejects(
    () =>
      locations.update(
        user,
        site.id,
        { billingPins: Array(51).fill("x") },
        business.id,
      ),
    /up to 50/,
  );
  const otherClient = await clients.create(
    user,
    { name: "Foreign reference" },
    other.id,
  );
  await rejects(
    () =>
      locations.update(
        user,
        site.id,
        { clientId: otherClient.id },
        business.id,
      ),
    /belong/,
  );
  let sent: any;
  const invoices = new InvoicesService(db, {
    send: async (message: any) => {
      sent = message;
    },
  } as any);
  const invoice = await invoices.createInvoice(
    {
      clientId: client.id,
      locationId: site.id,
      issueDate: "2026-10-01",
      dueDate: "2026-10-31",
      items: [{ description: "Security coverage", quantity: 40, rate: 25 }],
      status: "DRAFT",
    },
    user,
    business.id,
  );
  equal(invoice.location.workOrder, "WO-1042");
  equal(billingList(invoice.location.billingPins), ["PIN-100", "PIN-200"]);
  process.env.INVOICE_CC = "not-on-client@example.test";
  await invoices.sendInvoice(invoice.id, user, business.id);
  equal(sent.to, "accounts@example.test");
  equal(sent.cc, [
    "contact@example.test",
    "legacy@example.test",
    "finance@example.test",
    "supervisor@example.test",
    "invoice@unitedlinksecurity.com",
  ]);
  equal(sent.attachments[0].contentType, "application/pdf");
  equal(
    (await invoices.findOneInvoice(invoice.id, user, business.id))
      .documentStatus,
    "SENT",
  );
  const updated = await clients.update(
    client.id,
    {
      billingContactEmail: "new-accounts@example.test",
      billingContactEmail2: null,
      ccEmails: ["new-copy@example.test"],
      billingAddressSameAsOffice: false,
      billingAddress: "500 Billing Lane\nNew York, NY 10001",
    },
    user,
  );
  equal(billingAddress(updated), "500 Billing Lane\nNew York, NY 10001");
  await invoices.sendInvoice(invoice.id, user, business.id);
  equal(sent.to, "new-accounts@example.test");
  equal(sent.cc, ["contact@example.test", "new-copy@example.test", "invoice@unitedlinksecurity.com"]);
  await clients.update(
    client.id,
    { billingContactEmail: null, ccEmails: [] },
    user,
  );
  await invoices.sendInvoice(invoice.id, user, business.id);
  equal(sent.to, "contact@example.test");
  equal(sent.cc, ["invoice@unitedlinksecurity.com"]);
  const restored = await clients.update(
    client.id,
    {
      billingContactEmail: "accounts@example.test",
      ccEmails: ["finance@example.test", "supervisor@example.test"],
      billingAddressSameAsOffice: true,
    },
    user,
  );
  equal(invoiceRecipients(restored).cc.length, 4);
  const cleared = await locations.update(
    user,
    noPins.id,
    { billingPins: [], workOrder: "" },
    business.id,
  );
  equal(cleared.workOrder, null);
  equal(billingList(cleared.billingPins), []);
  const current = await invoices.findOneInvoice(invoice.id, user, business.id);
  const pdf = await generateInvoicePdf({ invoice: current, business });
  equal(pdf.subarray(0, 4).toString(), "%PDF");
  writeFileSync(
    "/Users/it/Documents/Codex/2026-10-13/ac/outputs/client-billing-sample.pdf",
    pdf,
  );
  console.log(
    `Passed ${checks} isolated client, billing-pin and invoice delivery checks (mock email only)`,
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
