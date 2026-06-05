const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

function lowerFirst(value) {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function chunkArray(items, chunkSize) {
  const result = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
}

function run(command, args, options) {
  const result = childProcess.spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command failed: ${command} ${args.join(' ')}`);
}

function generateSqliteSchemaFile({ prismaDir, sqliteSchemaPath }) {
  const postgresSchemaPath = path.join(prismaDir, 'schema.prisma');
  const schemaText = fs.readFileSync(postgresSchemaPath, 'utf8');

  const rewritten = schemaText
    .replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"')
    .replace(/url\s*=\s*env\("DATABASE_URL"\)/g, 'url = env("SQLITE_DATABASE_URL")')
    .replace(/output\s*=\s*"\.\/client"/g, 'output = "./client-sqlite"');

  fs.writeFileSync(sqliteSchemaPath, rewritten, 'utf8');
}

function topoSortModels(models) {
  const modelNames = models.map((m) => m.name);
  const modelNameSet = new Set(modelNames);
  const dependenciesByModel = new Map();
  const dependentsByModel = new Map();

  for (const model of models) {
    const deps = new Set();
    for (const field of model.fields) {
      if (!field.relationFromFields || field.relationFromFields.length === 0) continue;
      if (typeof field.type !== 'string') continue;
      if (!modelNameSet.has(field.type)) continue;
      deps.add(field.type);
    }
    dependenciesByModel.set(model.name, deps);
    dependentsByModel.set(model.name, new Set());
  }

  for (const [modelName, deps] of dependenciesByModel) {
    for (const dep of deps) {
      dependentsByModel.get(dep)?.add(modelName);
    }
  }

  const inDegree = new Map();
  for (const [modelName, deps] of dependenciesByModel) {
    inDegree.set(modelName, deps.size);
  }

  const queue = [];
  for (const [modelName, degree] of inDegree) {
    if (degree === 0) queue.push(modelName);
  }

  const ordered = [];
  while (queue.length > 0) {
    const current = queue.shift();
    ordered.push(current);
    const dependents = dependentsByModel.get(current);
    if (!dependents) continue;
    for (const dependent of dependents) {
      const nextDegree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, nextDegree);
      if (nextDegree === 0) queue.push(dependent);
    }
  }

  if (ordered.length !== modelNames.length) {
    const remaining = modelNames.filter((name) => !ordered.includes(name));
    return ordered.concat(remaining);
  }

  return ordered;
}

async function main() {
  const sqliteUrl = process.env.SQLITE_DATABASE_URL;
  const postgresUrl = process.env.DATABASE_URL;

  if (!sqliteUrl || !sqliteUrl.startsWith('file:')) {
    throw new Error('SQLITE_DATABASE_URL must be set and must start with file:');
  }
  if (!postgresUrl || !/^(postgresql|postgres):\/\//.test(postgresUrl)) {
    throw new Error('DATABASE_URL must be set and must start with postgresql:// or postgres://');
  }

  const prismaDir = __dirname;
  const packageDir = path.resolve(prismaDir, '..');
  const sqliteSchemaPath = path.join(prismaDir, '.schema.sqlite.prisma');
  const sqliteClientDir = path.join(prismaDir, 'client-sqlite');

  if (!fs.existsSync(sqliteClientDir)) {
    generateSqliteSchemaFile({ prismaDir, sqliteSchemaPath });
    run(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['prisma', 'generate', '--schema', path.join('prisma', '.schema.sqlite.prisma')],
      {
        cwd: packageDir,
        env: { ...process.env, SQLITE_DATABASE_URL: sqliteUrl },
      }
    );
  }

  run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'db', 'push', '--skip-generate', '--schema', path.join('prisma', 'schema.prisma')],
    {
      cwd: packageDir,
      env: { ...process.env, DATABASE_URL: postgresUrl },
    }
  );

  const postgresClientModule = require(path.join(prismaDir, 'client'));
  const sqliteClientModule = require(path.join(prismaDir, 'client-sqlite'));

  const pg = new postgresClientModule.PrismaClient({
    datasources: { db: { url: postgresUrl } },
  });
  const sqlite = new sqliteClientModule.PrismaClient({
    datasources: { db: { url: sqliteUrl } },
  });

  try {
    await sqlite.$connect();
    await pg.$connect();

    const models = sqliteClientModule.Prisma.dmmf.datamodel.models;
    const orderedModelNames = topoSortModels(models);
    const modelByName = new Map(models.map((m) => [m.name, m]));

    for (const modelName of orderedModelNames) {
      const delegateKey = lowerFirst(modelName);
      const sqliteDelegate = sqlite[delegateKey];
      const pgDelegate = pg[delegateKey];

      if (!sqliteDelegate || !pgDelegate) continue;

      const rows = await sqliteDelegate.findMany();
      if (!rows || rows.length === 0) continue;

      const chunks = chunkArray(rows, 200);
      for (const chunk of chunks) {
        await pgDelegate.createMany({ data: chunk, skipDuplicates: true });
      }

      const model = modelByName.get(modelName);
      process.stdout.write(`Migrated ${model?.name || modelName}: ${rows.length}\n`);
    }
  } finally {
    await sqlite.$disconnect().catch(() => undefined);
    await pg.$disconnect().catch(() => undefined);
  }
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});
