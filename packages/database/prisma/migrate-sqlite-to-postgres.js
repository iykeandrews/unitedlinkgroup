// Compatibility entry point. Schema deployment must precede the verified copy.
const { fileURLToPath } = require('node:url');
const path = require('node:path');
if (!process.env.SQLITE_SOURCE_PATH) {
  const url = process.env.SQLITE_DATABASE_URL;
  if (!url || !url.startsWith('file:/')) {
    console.error('Set SQLITE_SOURCE_PATH to an absolute SQLite file path. The destination must already be migrated and empty.');
    process.exit(1);
  }
  process.env.SQLITE_SOURCE_PATH = url.startsWith('file://') ? fileURLToPath(url) : path.resolve(url.slice(5));
}
require('./copy-sqlite-to-postgres');
