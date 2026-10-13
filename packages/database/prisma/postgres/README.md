# PostgreSQL migrations

The canonical model is `../schema.prisma`. `../prepare-postgres.js` synchronizes this directory's schema before migration commands. Do not edit the generated copy directly.

The original `../migrations` directory is legacy SQLite history; it is preserved for recovery and must not be deployed to PostgreSQL. This PostgreSQL baseline includes the current model and the payroll tax/profile columns.

Use `npm --workspace @unitedlinkgroup/database run migrate:deploy` for this PostgreSQL track. Use `migrate:dev -- --name descriptive_name` when adding future migrations, and commit both the canonical model and migration SQL. Existing remote PostgreSQL databases need a schema comparison and a reviewed baseline registration before using this track; never apply this initial baseline over populated tables.

SQLite data import is separate: configure `DATABASE_URL` for the destination and `SQLITE_SOURCE_PATH` for the source, then run `migrate:copy-sqlite`. The copier refuses a populated destination, preserves the source, checks integrity and every stored column, restores optional relationships and original timestamps, and commits all records in one transaction. It never skips duplicates or overwrites existing records. Keep both systems offline to writes during a real cutover.

Local recovery backups are kept outside Git under `packages/database/backups/`. They contain private data and must be secured. The Docker volume contains the active PostgreSQL data; do not remove that volume.
