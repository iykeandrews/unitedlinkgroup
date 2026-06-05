import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function guessContentType(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.csv') return 'text/csv';
  if (ext === '.txt') return 'text/plain';
  if (ext === '.json') return 'application/json';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  return 'application/octet-stream';
}

function resolveUploadsDir() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'uploads'),
    path.join(cwd, 'apps/api/uploads'),
    path.join(cwd, '..', 'uploads'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
  }
  throw new Error(`Uploads directory not found. Checked: ${candidates.join(', ')}`);
}

function parseArgs(argv: string[]) {
  const set = new Set(argv);
  const dryRun = set.has('--dry-run');
  const deleteLocal = set.has('--delete-local');
  const concurrencyArg = argv.find((a) => a.startsWith('--concurrency='));
  const concurrency = concurrencyArg ? Math.max(1, Math.min(10, parseInt(concurrencyArg.split('=')[1] || '1', 10) || 1)) : 1;
  return { dryRun, deleteLocal, concurrency };
}

async function headObject(s3: S3Client, bucket: string, key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e: any) {
    const code = e?.$metadata?.httpStatusCode;
    if (code === 404) return false;
    if (e?.name === 'NotFound') return false;
    throw e;
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env'));
  loadEnvFile(path.join(process.cwd(), 'apps/api/.env'));

  const bucket = process.env.AWS_S3_BUCKET || '';
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || '';
  if (!bucket) throw new Error('AWS_S3_BUCKET is required');
  if (!region) throw new Error('AWS_REGION is required');

  const { dryRun, deleteLocal, concurrency } = parseArgs(process.argv.slice(2));

  const uploadsDir = resolveUploadsDir();
  const entries = fs.readdirSync(uploadsDir);
  const files = entries
    .filter((f) => f && !f.startsWith('.'))
    .map((f) => ({ name: f, fullPath: path.join(uploadsDir, f) }))
    .filter((x) => fs.statSync(x.fullPath).isFile());

  const s3 = new S3Client({ region });

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  const queue = [...files];
  const workers = Array.from({ length: concurrency }).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      const key = item.name;
      try {
        const exists = await headObject(s3, bucket, key);
        if (exists) {
          skipped += 1;
          continue;
        }

        if (dryRun) {
          uploaded += 1;
          continue;
        }

        const body = fs.createReadStream(item.fullPath);
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: guessContentType(key),
          })
        );
        uploaded += 1;

        if (deleteLocal) {
          fs.unlinkSync(item.fullPath);
        }
      } catch (e) {
        failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        process.stderr.write(`Failed: ${key} (${msg})\n`);
      }
    }
  });

  const startedAt = Date.now();
  await Promise.all(workers);
  const elapsedMs = Date.now() - startedAt;

  process.stdout.write(
    JSON.stringify(
      {
        uploadsDir,
        bucket,
        region,
        dryRun,
        deleteLocal,
        concurrency,
        total: files.length,
        uploaded,
        skipped,
        failed,
        elapsedMs,
      },
      null,
      2
    ) + '\n'
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(msg + '\n');
  process.exitCode = 1;
});

