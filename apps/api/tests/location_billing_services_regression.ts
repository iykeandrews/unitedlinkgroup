import "reflect-metadata";
import assert from "node:assert/strict";
import { ValidationPipe } from "@nestjs/common";
import { CreateLocationDto } from "../src/locations/dto/create-location.dto";
import { UpdateLocationDto } from "../src/locations/dto/update-location.dto";
import { LocationsService } from "../src/locations/locations.service";
import {
  normalizeBillingServices,
  billingServiceChanges,
  BILLING_SERVICE_NAMES,
} from "../src/locations/location-billing";

async function main() {
  const rows = Object.keys(BILLING_SERVICE_NAMES).map((type) => ({
    type,
    rate: 35,
  }));
  const services = normalizeBillingServices([
    ...rows,
    { type: "OTHER", description: " Event supervisor ", rate: 45 },
  ]);
  assert.equal(services.length, 7);
  assert.equal(services[6].description, "Event supervisor");
  for (const invalid of [
    null,
    {},
    [{ type: "constructor", rate: 1 }],
    [{ type: "OTHER", description: "", rate: 20 }],
    [{ type: "OTHER", description: "X", rate: -1 }],
    [{ type: "ARMED_SPO", rate: 1.001 }],
    [rows[0], rows[0]],
  ])
    assert.throws(() => normalizeBillingServices(invalid));
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  for (const dto of [CreateLocationDto, UpdateLocationDto]) {
    const body = {
      ...(dto === CreateLocationDto ? { name: "Site", address: "Street" } : {}),
      billingServices: services,
      billingServicesVersion: 0,
      billingServicesNote: "Client requested armed coverage",
    };
    await pipe.transform(body, { type: "body", metatype: dto });
    await assert.rejects(() =>
      pipe.transform(
        { ...body, billingServices: [{ type: "ARMED_SPO", rate: "35" }] },
        { type: "body", metatype: dto },
      ),
    );
  }
  const changes = billingServiceChanges(
    [
      {
        type: "ARMED_SPO",
        description: "Armed special police officer",
        rate: 30,
      },
    ],
    services,
  );
  assert.equal(changes[0].action, "RATE_INCREASED");
  assert.equal(
    billingServiceChanges([services[0]], [{ ...services[0], rate: 25 }])[0]
      .action,
    "RATE_DECREASED",
  );
  assert.equal(billingServiceChanges(services, []).length, 7);

  let location: any = {
    id: "site",
    businessId: "business",
    name: "Existing site",
    address: "Street",
    status: "ACTIVE",
    billingServices: "[]",
    billingServicesVersion: 0,
  };
  let logs: any[] = [];
  let failAudit = false;
  let invoiceWrites = 0;
  const db: any = {
    business: { findUnique: async () => ({ id: "business" }) },
    location: {
      findFirst: async ({ where }: any) =>
        where.id === location.id && where.businessId === location.businessId
          ? { ...location }
          : null,
      create: async ({ data }: any) => (location = { id: "site", ...data }),
      update: async ({ data }: any) => (location = { ...location, ...data }),
    },
    auditLog: {
      create: async ({ data }: any) => {
        if (failAudit) throw new Error("Audit failed");
        logs.push({ ...data, id: String(logs.length), createdAt: new Date() });
      },
      findMany: async ({ where }: any) => {
        assert.equal(where.businessId, "business");
        assert.equal(where.resourceId, "site");
        return logs;
      },
    },
    invoice: {
      update: async () => {
        invoiceWrites++;
      },
    },
    $queryRawUnsafe: async () => [],
  };
  db.$transaction = async (fn: any) => {
    const before = structuredClone(location),
      history = logs.slice();
    try {
      return await fn(db);
    } catch (error) {
      location = before;
      logs = history;
      throw error;
    }
  };
  const service = new LocationsService(db, {
      geocode: async () => null,
    } as any),
    user = { role: "SUPER_ADMIN" };
  await service.update(
    user,
    "site",
    {
      billingServices: services,
      billingServicesVersion: 0,
      billingServicesNote: "Client request",
    },
    "business",
  );
  assert.equal(location.billingServicesVersion, 1);
  assert.equal(logs.length, 1);
  assert.equal(JSON.parse(logs[0].details).changes.length, 7);
  assert.equal(JSON.parse(logs[0].details).note, "Client request");
  await assert.rejects(
    () =>
      service.update(
        user,
        "site",
        { billingServices: services, billingServicesVersion: 0 },
        "business",
      ),
    /Reload/,
  );
  await service.update(
    user,
    "site",
    { billingServices: services, billingServicesVersion: 1 },
    "business",
  );
  assert.equal(logs.length, 1);
  const reduced = services.map((s, i) => (i ? s : { ...s, rate: 25 }));
  await service.update(
    user,
    "site",
    { billingServices: reduced, billingServicesVersion: 1 },
    "business",
  );
  assert.equal(JSON.parse(logs[1].details).changes[0].action, "RATE_DECREASED");
  failAudit = true;
  const stable = structuredClone(location);
  await assert.rejects(
    () =>
      service.update(
        user,
        "site",
        { billingServices: [], billingServicesVersion: 2 },
        "business",
      ),
    /Audit failed/,
  );
  assert.deepEqual(location, stable);
  failAudit = false;
  const details = await service.findOne(user, "site", "business");
  assert.equal(details.billingServicesHistory.length, 2);
  await assert.rejects(
    () => service.findOne(user, "site", "other-business"),
    /not found/,
  );
  const prior = location.billingServices;
  await service.update(user, "site", { name: "Renamed site" }, "business");
  assert.equal(location.billingServices, prior);
  await service.create(
    user,
    {
      name: "New site",
      address: "Street",
      billingServices: services,
      billingServicesNote: "Initial agreement",
    },
    "business",
  );
  assert.equal(location.billingServicesVersion, 1);
  assert.equal(logs.length, 3);
  assert.equal(invoiceWrites, 0);
  console.log(
    "PASS: seven service types, nested validation, rate changes/removals, dated history, stale-write protection, transaction rollback, business scope, legacy edit preservation, and no invoice writes.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
