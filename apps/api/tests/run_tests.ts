import 'dotenv/config';

async function run(name: string, fn: () => Promise<void>) {
  process.stdout.write(`Running ${name}...\n`);
  try {
    await fn();
    process.stdout.write(`✓ ${name} passed\n`);
  } catch (e) {
    process.stderr.write(`✗ ${name} failed: ${String(e)}\n`);
    throw e;
  }
}

async function main() {
  const tests: Array<[string, () => Promise<void>]> = [
    ['DTO: CreateInvoiceDto validation', async () => (await import('./test_invoice_dto')).run()],
    ['Util: resolveTaxContext', async () => (await import('./test_tax_util')).run()],
  ];
  let ok = true;
  for (const [name, fn] of tests) {
    try {
      await run(name, fn);
    } catch {
      ok = false;
    }
  }
  if (!ok) {
    process.exitCode = 1;
  } else {
    process.stdout.write('All tests passed\n');
  }
}

main();

