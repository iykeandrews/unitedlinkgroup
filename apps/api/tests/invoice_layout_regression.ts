import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PDFDocument } from 'pdf-lib';
import { generateInvoicePdf } from '../src/invoices/invoice-pdf';

async function main() {
  const output = mkdtempSync(join(tmpdir(), 'ulg-invoice-layout-'));
  const address = "Example Hospital Parking Garage, 818 Michigan Avenue Northeast, Washington, District of Columbia, 20017, United States of America";
  const base = { invoiceNumber: 'INV-LAYOUT-TEST', issueDate: '2026-10-01', dueDate: '2026-10-15', client: { name: 'Example Property Group', address: '818 Example Avenue', city: 'Washington', state: 'DC', zip: '20017' }, items: [{ description: 'Security services', quantity: 336, rate: 20, amount: 6720 }], subtotal: 6720, total: 6720, taxRate: 0, taxAmount: 0, amountPaid: 0, balanceDue: 6720, status: 'DRAFT' };
  const cases = [
    { name: 'long-address-no-references', location: { name: 'Example Hospital', address } },
    { name: 'unbroken-address-no-references', location: { name: 'Example Hospital', address: 'LongUnbrokenLocationReference'.repeat(15) } },
    { name: 'long-address-with-references', location: { name: 'Example Hospital', address, workOrder: 'WO-'.repeat(40), billingPins: JSON.stringify(['PIN-'.repeat(40), 'SECOND-PIN']) } },
    { name: 'multiple-pages', location: { name: 'Example Hospital', address }, items: Array.from({ length: 90 }, (_, index) => ({ description: `Service coverage line ${index + 1}`, quantity: 1, rate: 20, amount: 20 })) },
  ];
  const paths: string[] = [];
  for (const example of cases) {
    const pdf = await generateInvoicePdf({ business: { name: 'Example Security Agency', currencyCode: 'USD', address: '100 Example Drive', city: 'Bowie', state: 'MD', zip: '20720' }, invoice: { ...base, ...example } });
    const document = await PDFDocument.load(pdf);
    assert(document.getPageCount() >= 1);
    if (example.name === 'multiple-pages') assert(document.getPageCount() > 1);
    const path = join(output, example.name + '.pdf'); writeFileSync(path, pdf); paths.push(path);
  }
  writeFileSync('/private/tmp/ulg-invoice-layout-regression.json', JSON.stringify(paths));
  console.log('Generated four invoice layout regression fixtures for coordinate verification.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
