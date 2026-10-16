import assert from "node:assert/strict";
import { PrismaClient } from "@unitedlinkgroup/database";
import { LocationsService } from "../src/locations/locations.service";
import { ShiftConfigurationService } from "../src/locations/shift-configuration.service";
import {
  OFFICER_CATEGORIES,
  resolveClientPin,
} from "../src/locations/shift-pin.policy";
const url = process.env.SHIFT_PIN_TEST_DATABASE_URL;
if (
  !url ||
  !/^shift_pin_verification_\d+$/.test(
    new URL(url).searchParams.get("schema") || "",
  )
)
  throw Error("Dedicated PIN test schema required");
const db: any = new PrismaClient({ datasources: { db: { url } } });
async function main() {
  try {
    const owner = await db.user.create({
      data: {
        email: "pin-admin@example.test",
        password: "synthetic-only",
        role: "BUSINESS_ADMIN",
      },
    });
    const user = { userId: owner.id, role: "BUSINESS_ADMIN" };
    const business = await db.business.create({
      data: { ownerId: owner.id, name: "Synthetic PIN verification" },
    });
    const location = await db.location.create({
      data: {
        businessId: business.id,
        name: "Test location",
        address: "Synthetic",
        billingPins: '["0388","3118"]',
      },
    });
    const other = await db.user.create({
      data: { email: "outsider@example.test", password: "synthetic-only" },
    });
    const service = new ShiftConfigurationService(db);
    await assert.rejects(
      () =>
        service.list(location.id, { userId: other.id, role: "BUSINESS_ADMIN" }),
      /outside your business/,
    );
    await assert.rejects(
      () =>
        service.savePin(
          location.id,
          { ...user, role: "MANAGER" },
          {},
          business.id,
        ),
      /Only administrators/,
    );
    await assert.rejects(
      () =>
        service.savePin(
          location.id,
          user,
          {
            label: "not existing",
            billingPin: "9999",
            isActive: true,
            allowCrossCategory: false,
          },
          business.id,
        ),
      /existing billing PIN/,
    );
    const pin = await service.savePin(
      location.id,
      user,
      {
        label: "Shared client PIN",
        billingPin: "0388",
        isActive: true,
        allowCrossCategory: false,
      },
      business.id,
    );
    const morning = {
      name: "Morning SO",
      officerCategory: "SO",
      classification: "MORNING",
      startTime: "07:00",
      endTime: "15:00",
      requiredOfficers: 2,
      isActive: true,
      pinId: pin.id,
    };
    const c1 = await service.saveConfiguration(
      location.id,
      user,
      morning,
      business.id,
    );
    const c2 = await service.saveConfiguration(
      location.id,
      user,
      {
        ...morning,
        name: "Afternoon SO",
        classification: "AFTERNOON",
        startTime: "15:00",
        endTime: "23:00",
      },
      business.id,
    );
    await assert.rejects(
      () =>
        service.saveConfiguration(
          location.id,
          user,
          { ...morning, name: "duplicate" },
          business.id,
        ),
      /already covers/,
    );
    await assert.rejects(
      () =>
        service.saveConfiguration(
          location.id,
          user,
          { ...morning, officerCategory: "ARMED_SPO" },
          business.id,
        ),
      /does not permit sharing/,
    );
    await service.savePin(
      location.id,
      user,
      { ...pin, allowCrossCategory: true },
      business.id,
    );
    for (const category of Object.keys(OFFICER_CATEGORIES).filter(
      (c) => c !== "SO",
    ))
      await service.saveConfiguration(
        location.id,
        user,
        { ...morning, officerCategory: category, name: `Morning ${category}` },
        business.id,
      );
    const account = await db.user.create({
      data: {
        email: "officer@example.test",
        password: "synthetic-only",
        role: "EMPLOYEE",
      },
    });
    const employee = await db.employee.create({
      data: {
        userId: account.id,
        businessId: business.id,
        firstName: "Synthetic",
        lastName: "Officer",
        email: account.email,
        type: "FULL_TIME",
        payType: "HOURLY",
        status: "ACTIVE",
        officerCategory: "SO",
      },
    });
    const today = new Date();
    const start = new Date(+today + 86400000);
    const day = start.toISOString().slice(0, 10);
    const shift = await db.shift.create({
      data: {
        businessId: business.id,
        locationId: location.id,
        employeeId: employee.id,
        timeZone: "America/New_York",
        startTime: new Date(day + "T11:00:00Z"),
        endTime: new Date(day + "T19:00:00Z"),
        status: "PUBLISHED",
      },
    });
    let result = await service.decorate([{ ...shift, employee }]);
    assert.equal(result[0].clientPinAssignment.pin, "0388");
    let mine = await service.myPins(
      { userId: account.id, role: "EMPLOYEE" },
      business.id,
    );
    assert.equal(mine.length, 1);
    assert.equal(mine[0].clientPinAssignment.pin, "0388");
    result = await service.decorate([
      {
        ...shift,
        employee,
        startTime: new Date(day + "T19:00:00Z"),
        endTime: new Date(Date.parse(day + "T00:00Z") + 27 * 3600000),
      },
    ]);
    assert.equal(result[0].clientPinAssignment.pin, "0388");
    await service.saveConfiguration(
      location.id,
      user,
      { ...c2, pinId: "" },
      business.id,
    );
    result = await service.decorate([{ ...shift, employee }]);
    assert.equal(result[0].clientPinAssignment.pin, "0388");
    await service.savePin(
      location.id,
      user,
      { ...pin, allowCrossCategory: true, isActive: false },
      business.id,
    );
    result = await service.decorate([{ ...shift, employee }]);
    assert.equal(result[0].clientPinAssignment.pin, null);
    await service.savePin(
      location.id,
      user,
      { ...pin, allowCrossCategory: true, isActive: true },
      business.id,
    );
    for (const category of Object.keys(OFFICER_CATEGORIES)) {
      result = await service.decorate([
        { ...shift, employee: { ...employee, officerCategory: category } },
      ]);
      assert.equal(result[0].clientPinAssignment.pin, "0388");
    }
    result = await service.decorate([
      { ...shift, employee, startTime: new Date(+shift.startTime + 3600000) },
    ]);
    assert.equal(result[0].clientPinAssignment.pin, null);
    await new LocationsService(db, {} as any).update(
      user,
      location.id,
      { billingPins: ["3118"] },
      business.id,
    );
    assert.equal(
      (await db.locationShiftPin.findUnique({ where: { id: pin.id } }))
        .isActive,
      false,
    );
    result = await service.decorate([{ ...shift, employee }]);
    assert.equal(result[0].clientPinAssignment.pin, null);
    const overnight = {
      ...c1,
      classification: "OVERNIGHT",
      startTime: "23:00",
      endTime: "07:00",
    };
    const policyLocation = { ...location, billingPins: '["0388"]' };
    const policyPin = { ...pin, configurations: [overnight] };
    const night = {
      locationId: location.id,
      timeZone: "America/New_York",
      startTime: "2026-10-01T03:00Z",
      endTime: "2026-10-01T11:00Z",
    };
    assert.equal(
      resolveClientPin(
        night,
        policyLocation,
        [{ ...overnight, pin: policyPin }],
        employee,
      ).pin,
      "0388",
    );
    assert.equal(
      resolveClientPin(
        { ...night, endTime: "2026-10-02T11:00Z" },
        policyLocation,
        [{ ...overnight, pin: policyPin }],
        employee,
      ).pin,
      null,
    );
    assert.equal(
      resolveClientPin(
        night,
        policyLocation,
        [{ ...overnight, pin: policyPin }],
        { ...employee, status: "INACTIVE" },
      ).pin,
      null,
    );
    assert(
      (await db.auditLog.count({
        where: {
          businessId: business.id,
          resource: "LocationShiftConfiguration",
        },
      })) >= 12,
    );
    assert.equal(await db.timesheet.count(), 0);
    assert.equal(await db.payStub.count(), 0);
    console.log(
      "Shift PIN integration passed: all six categories, tenant/role isolation, shared shifts, explicit category sharing, unlinking, deactivation, reassignment, removed billing PINs, overnight times, audits, and untouched attendance/payroll.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
