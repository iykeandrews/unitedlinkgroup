import assert from "node:assert/strict";
import {
  canApproveTimesheet,
  groupTimesheetsByLocation,
} from "../../web/src/lib/time/location-groups";

const base = {
  startTime: "2026-10-27T10:00:00Z",
  endTime: "2026-10-27T18:00:00Z",
  status: "PENDING",
  breaks: [],
};
const records = [
  {
    ...base,
    id: "a",
    location: { id: "one", name: "Safeway" },
    employee: { firstName: "AMY", lastName: "ZIMMERMAN" },
  },
  {
    ...base,
    id: "b",
    location: { id: "one", name: "Safeway" },
    employee: { firstName: "ZOE", lastName: "ADAMS" },
  },
  { ...base, id: "c", location: { id: "two", name: "Giant" } },
  { ...base, id: "d", location: { id: "three", name: "Safeway" } },
  { ...base, id: "e", location: null },
];
const before = JSON.stringify(records);
const groups = groupTimesheetsByLocation(records);
assert.deepEqual(
  groups.map((g) => g.title),
  ["Giant", "Safeway", "Safeway", "Unassigned location"],
);
assert.deepEqual(
  groups.find((g) => g.id === "location:one")!.timesheets.map((t) => t.id),
  ["b", "a"],
);
assert.equal(groups.flatMap((g) => g.timesheets).length, records.length);
assert.equal(JSON.stringify(records), before);
assert(canApproveTimesheet(records[0]));
for (const changes of [
  { status: "APPROVED" },
  { status: "IN_PROGRESS" },
  { status: "DISCARDED" },
  { status: "REJECTED" },
  { endTime: null },
  { endTime: "invalid" },
  { endTime: base.startTime },
  { paidExternally: true },
  { breaks: [{ endTime: null }] },
])
  assert(!canApproveTimesheet({ ...records[0], ...changes }));
const mixed = [
  ...records,
  { ...records[0], id: "paid", paidExternally: true },
  { ...records[0], id: "approved", status: "APPROVED" },
  { ...records[0], id: "active", endTime: null },
];
const locationTargets = groupTimesheetsByLocation(mixed)
  .find((g) => g.id === "location:one")!
  .timesheets.filter(canApproveTimesheet);
assert.deepEqual(
  locationTargets.map((t) => t.id),
  ["b", "a"],
);
assert.deepEqual(groupTimesheetsByLocation([]), []);
console.log(
  "PASS: location grouping preserves filters and records, separates duplicate site names and unassigned work, orders workers by last name, and limits approvals to completed unpaid pending records at that location.",
);
