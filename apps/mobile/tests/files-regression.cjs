const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript");
const calls = [];
let status = 200,
  contents = "%PDF-1.4\nA complete PDF document with binary content\n%%EOF",
  refreshed = false,
  shared = 0,
  stalled = false,
  cancelled = false,
  shareError = false;
const modules = {
  "react-native": { Platform: { OS: "ios" } },
  "expo-file-system/legacy": {
    cacheDirectory: "cache/",
    EncodingType: { UTF8: "utf8", Base64: "base64" },
    createDownloadResumable: (url, path, options) => ({
      cancelAsync: async () => {
        cancelled = true;
      },
      downloadAsync: async () => {
        if (stalled) return new Promise(() => {});
        calls.push({ url, headers: { ...options.headers } });
        const code = status;
        if (code === 401) {
          status = 200;
        }
        return { uri: path, status: code };
      },
    }),
    readAsStringAsync: async (_uri, options) => {
      // Match Expo: UTF8 ignores position/length; only Base64 supports a partial read.
      if (options.encoding === "base64")
        return Buffer.from(contents)
          .subarray(options.position, options.position + options.length)
          .toString("base64");
      return contents;
    },
    deleteAsync: async () => {},
  },
  "expo-sharing": {
    isAvailableAsync: async () => true,
    shareAsync: async () => {
      if (shareError) throw Error("Sharing failed");
      shared++;
    },
  },
  "./api": {
    __esModule: true,
    default: { defaults: { baseURL: "https://example.com/api" } },
    refreshSession: async () => {
      refreshed = true;
      return "renewed";
    },
  },
  "./sessionStore": { getAccessToken: async () => "private-token" },
};
const exportsObject = {};
const source = fs.readFileSync(
  require("node:path").join(__dirname, "../src/services/mobileFiles.ts"),
  "utf8",
);
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  {
    exports: exportsObject,
    require: (name) => {
      assert.ok(modules[name], name);
      return modules[name];
    },
    URL,
    setTimeout: (callback, delay) =>
      setTimeout(callback, stalled && delay === 60000 ? 0 : delay),
    clearTimeout,
  },
);
(async () => {
  await exportsObject.shareMobileFile(
    "/payroll/paystubs/1/download",
    "pay.pdf",
    true,
  );
  assert.equal(shared, 1);
  modules["react-native"].Platform.OS = "android";
  await exportsObject.shareMobileFile(
    "/payroll/paystubs/1/download",
    "android-pay.pdf",
    true,
  );
  assert.equal(shared, 2);
  assert.equal(
    calls[0].url,
    "https://example.com/api/payroll/paystubs/1/download",
  );
  assert.equal(calls[0].headers.Authorization, "Bearer private-token");
  await exportsObject.shareMobileFile("/uploads/sop.pdf", "sop.pdf", true);
  assert.equal(calls[2].url, "https://example.com/uploads/sop.pdf");
  await exportsObject.shareMobileFile(
    "https://other.example/sop.pdf",
    "sop.pdf",
    true,
  );
  assert.equal(calls[3].headers.Authorization, undefined);
  status = 401;
  await exportsObject.shareMobileFile(
    "/payroll/paystubs/1/download",
    "pay.pdf",
    true,
  );
  assert.ok(refreshed);
  assert.equal(calls.at(-1).headers.Authorization, "Bearer renewed");
  contents = "error: not a PDF";
  await assert.rejects(
    () =>
      exportsObject.shareMobileFile(
        "/payroll/paystubs/1/download",
        "pay.pdf",
        true,
      ),
    /valid PDF/,
  );
  assert.equal(shared, 5);
  contents = "%PDF-1.4\nTest\n%%EOF";
  stalled = true;
  await assert.rejects(
    () =>
      exportsObject.shareMobileFile(
        "/payroll/paystubs/1/download",
        "retry.pdf",
        true,
      ),
    /timed out/,
  );
  assert.equal(cancelled, true, "timed-out native transfers must be cancelled");
  stalled = false;
  shareError = true;
  await assert.rejects(
    () =>
      exportsObject.shareMobileFile(
        "/payroll/paystubs/1/download",
        "retry.pdf",
        true,
      ),
    /Sharing failed/,
  );
  shareError = false;
  let unlocked = false;
  await exportsObject.shareMobileFile(
    "/payroll/paystubs/1/download",
    "retry.pdf",
    true,
    () => { unlocked = true; },
  );
  assert(unlocked, 'download UI must unlock before waiting on a native share extension');
  assert.equal(shared, 6, "sharing must remain retryable after a failure");
  const screen = fs.readFileSync(
    require("node:path").join(__dirname, "../src/screens/PayslipScreen.tsx"),
    "utf8",
  );
  assert(
    !/<Modal[\s>]/.test(screen),
    "native share sheet must not compete with a native details modal",
  );
  assert(
    screen.includes("downloadInProgress.current"),
    "double taps must be guarded immediately",
  );
  console.log(
    "Mobile file checks passed: PDF validation, native sharing, token renewal, upload paths, no credentials sent to external hosts.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
