import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import { SmtpMailerService } from '../src/common/email/smtp-mailer.service';
import { reportEmailHtml } from '../src/incident-reports/report-email';

async function main() {
  const transports: any[] = [], messages: any[] = [];
  const original = nodemailer.createTransport;
  const saved = {...process.env};
  try {
    nodemailer.createTransport = ((config: any) => {
      transports.push(config);
      return {verify: async () => true, sendMail: async (message: any) => {messages.push(message); return {rejected: []};}};
    }) as any;
    for (const profile of ['INVOICE','REPORT']) {
      process.env[`${profile}_SMTP_HOST`] = `${profile.toLowerCase()}.example.com`;
      process.env[`${profile}_SMTP_USER`] = `${profile.toLowerCase()}@example.com`;
      process.env[`${profile}_SMTP_PASS`] = 'mock-password';
      delete process.env[`${profile}_FROM`];
    }
    const mailer = new SmtpMailerService();
    const args = {to:'client@example.com',subject:'Test',text:'Test',html:'<p>Test</p>'};
    await mailer.send(args);
    await mailer.send({...args,smtpProfile:'REPORT'});
    await mailer.send(args);
    assert.deepEqual(transports.map(t=>t.host),['invoice.example.com','report.example.com']);
    assert.equal(transports[1].port,465);
    assert.equal(transports[1].secure,true);
    assert.deepEqual(messages.map(m=>m.from),['invoice@example.com','report@example.com','invoice@example.com']);
    const html=reportEmailHtml({title:'<script>test</script>',description:'<img src=x>',type:'INCIDENT',date:'2026-11-03',location:{name:'Site & Co'}},{name:'Company'});
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('Site &amp; Co'));
    assert.ok(!html.includes('<img src=x>'));
    console.log('Report mailbox isolation, secure SMTP defaults and HTML escaping passed; no emails sent.');
  } finally {
    nodemailer.createTransport = original;
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env,saved);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
