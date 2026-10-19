const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript");
const exportsObject = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      require("node:path").join(__dirname, "../src/services/operationsTime.ts"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  { exports: exportsObject, Intl, Date, Error },
);
const { wallParts, wallToIso } = exportsObject;
assert.equal(
  wallParts("2026-10-19T10:00:31Z", "America/New_York").time,
  "06:00",
);
assert.equal(
  wallToIso("2026-10-19", "06:00", "America/New_York", "2026-10-19T10:00:31Z"),
  "2026-10-19T10:00:31Z",
);
assert.equal(
  wallToIso("2026-10-19", "07:00", "America/New_York"),
  "2026-10-19T11:00:00.000Z",
);
assert.equal(
  wallToIso("2026-10-19", "07:00", "America/Los_Angeles"),
  "2026-10-19T14:00:00.000Z",
);
assert.equal(
  wallToIso("2026-10-20", "01:30", "America/New_York"),
  "2026-10-20T05:30:00.000Z",
);
assert.throws(
  () => wallToIso("2026-03-08", "02:30", "America/New_York"),
  /does not exist/,
);
assert.equal(
  wallToIso("2026-11-01", "01:30", "America/New_York", "2026-11-01T06:30:12Z"),
  "2026-11-01T06:30:12Z",
);
console.log(
  "Mobile operations time checks passed: site time independent of phone zone, overnight times, retained seconds, DST gap rejection and preserved repeated-hour timestamps.",
);
