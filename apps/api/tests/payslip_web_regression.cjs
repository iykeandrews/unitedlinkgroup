const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const calls = [];
const saved = [];
let fail = false;
const api = {
  get: async (url, options) => { calls.push({ url, options }); if (fail) throw Error('Access denied'); return { data: new Blob(['%PDF-1.4 canonical employee statement']) }; },
  post: async (url, body, options) => { calls.push({ url, body, options }); return { data: new Blob(['%PDF-1.4 canonical employee statements']) }; },
};
const modules = {
  '../lib/api': { __esModule: true, default: api },
  jspdf: { default: function () { throw Error('Paid downloads must not recalculate a client PDF'); } },
  'jspdf-autotable': {}, 'date-fns': {}, '../lib/localization': {}, './image-utils': {},
};
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../../web/src/utils/generatePayslip.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports: exportsObject,
  require: name => { assert(name in modules, name); return modules[name]; },
  URL: { createObjectURL: blob => { saved.push(blob); return 'blob:private-payslip'; }, revokeObjectURL: () => {} },
  document: { body: { appendChild: () => {} }, createElement: () => ({ click: () => {}, remove: () => {} }) },
  setTimeout: () => 0,
});
(async () => {
  await exportsObject.generatePayslip({ status: 'PAID', payStubs: [{ id: 'one' }] }, {});
  assert.equal(calls[0].url, '/payroll/paystubs/one/download');
  assert.equal(calls[0].options.responseType, 'blob');
  assert.equal(await saved[0].text(), '%PDF-1.4 canonical employee statement');
  await exportsObject.generatePayslip({ status: 'PAID', payStubs: [{ id: 'one' }, { id: 'two' }] }, {});
  assert.equal(calls[1].url, '/payroll/paystubs/download');
  assert.deepEqual(Array.from(calls[1].body.ids), ['one', 'two']);
  fail = true;
  await assert.rejects(() => exportsObject.generatePayslip({ status: 'PAID', payStubs: [{ id: 'one' }] }, {}), /Access denied/);
  console.log('Paid web downloads use canonical single/batch PDFs and do not fall back to recalculating payroll');
})().catch(error => { console.error(error); process.exitCode = 1; });
