import assert from 'node:assert/strict';
import { invoiceRecipients } from '../src/invoices/invoice-billing';
import { clientRecipients } from '../../web/src/components/billing/BillingReferences';
import { SmtpMailerService } from '../src/common/email/smtp-mailer.service';
async function main() {
  const client = { email: 'CONTACT@example.test', billingContactEmail: 'accounts@example.test', billingContactEmail2: 'two@example.test', billingContactEmail3: 'three@example.test', ccEmails: JSON.stringify(['copy@example.test', 'COPY@example.test', 'accounts@example.test', 'invoice@unitedlinksecurity.com']) };
  const expected = { to: 'accounts@example.test', cc: ['contact@example.test', 'two@example.test', 'three@example.test', 'copy@example.test', 'invoice@unitedlinksecurity.com'] };
  assert.deepEqual(invoiceRecipients(client), expected);
  assert.deepEqual(clientRecipients(client), expected);
  assert.deepEqual(invoiceRecipients({ email: 'only@example.test' }), { to: 'only@example.test', cc: ['invoice@unitedlinksecurity.com'] });
  const mailer: any = new SmtpMailerService();
  const oldFrom = process.env.INVOICE_FROM; process.env.INVOICE_FROM = 'test-sender@example.test';
  mailer.verified = true;
  let delivered: any;
  mailer.transporter = { sendMail: async (data: any) => { delivered = data; return { accepted: [data.to, ...data.cc], rejected: [] }; } };
  const payload = { ...expected, subject: 'Synthetic test', html: '<p>Test</p>', text: 'Test' };
  await mailer.send(payload);
  assert.deepEqual(delivered.cc, expected.cc);
  mailer.transporter.sendMail = async () => ({ accepted: [expected.to], rejected: ['copy@example.test'] });
  await assert.rejects(() => mailer.send(payload), /rejected one or more invoice recipients/);
  if (oldFrom === undefined) delete process.env.INVOICE_FROM; else process.env.INVOICE_FROM = oldFrom;
  console.log('Invoice recipient and partial-delivery checks passed (mock SMTP; no email sent).');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
