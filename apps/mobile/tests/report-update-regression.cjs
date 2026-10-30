const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
function load(name) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(__dirname, "../src/services", name + ".ts"),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      },
    ).outputText,
    { exports, URL },
  );
  return exports;
}
const { reportForms, reportDescription } = load("reportForms");
assert.equal(Object.keys(reportForms).length, 5);
for (const category of Object.keys(reportForms)) {
  const fields = Object.fromEntries(
    reportForms[category].fields.map((label) => [
      label,
      "Recorded information",
    ]),
  );
  const text = reportDescription(
    category,
    fields,
    "All checks completed and recorded.",
  );
  assert(text.startsWith(reportForms[category].label));
  assert(text.includes("All checks completed"));
  assert.throws(
    () => reportDescription(category, {}, "Detailed report narrative"),
    /Please enter/,
  );
  assert.throws(
    () => reportDescription(category, fields, "Short"),
    /10 characters/,
  );
}
const { isNewerVersion } = load("appVersion");
assert(isNewerVersion("1.0.10", "1.0.2"));
assert(isNewerVersion("2.0.0", "1.99.99"));
assert(!isNewerVersion("1.0.2", "1.0.2"));
assert(!isNewerVersion("1.0.1", "1.0.2"));
assert(!isNewerVersion("unpublished", "1.0.2"));
const { reportAssetUrl } = load("reportAssetUrl");
assert.equal(
  new URL(
    reportAssetUrl(
      "https://example.com/api",
      "/incident-reports/1/evidence/2",
      "private",
    ),
  ).searchParams.get("token"),
  "private",
);
assert(
  !reportAssetUrl(
    "https://example.com/api",
    "https://storage.example/image?signature=ok",
    "private",
  ).includes("private"),
);
assert.equal(
  reportAssetUrl(
    "https://example.com/api",
    "javascript:alert(1)",
    "private",
  ).includes("javascript:"),
  false,
);
assert.equal(reportAssetUrl("bad-base", "/report", "private"), "");
console.log(
  "Five report forms, required fields, version comparisons and external attachment credential checks passed",
);
