import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@unitedlinkgroup/database';
import fs from 'node:fs';
import path from 'node:path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const renderEnv =
      process.env.RENDER === 'true' ||
      Boolean(process.env.RENDER_SERVICE_ID) ||
      Boolean(process.env.RENDER_EXTERNAL_HOSTNAME);

    const databaseUrlFromEnv = process.env.DATABASE_URL;
    const finalDatabaseUrl = renderEnv
      ? PrismaService.getRenderSafeDatabaseUrl(databaseUrlFromEnv)
      : databaseUrlFromEnv;

    super(finalDatabaseUrl ? { datasources: { db: { url: finalDatabaseUrl } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private static getRenderSafeDatabaseUrl(databaseUrlFromEnv: string | undefined): string {
    const tmpSqlitePath = process.env.SQLITE_DB_PATH || '/tmp/unitedlinkgroup.db';

    if (!databaseUrlFromEnv) return `file:${tmpSqlitePath}`;

    if (!databaseUrlFromEnv.startsWith('file:')) return databaseUrlFromEnv;

    const rawPath = databaseUrlFromEnv.slice('file:'.length);
    const sourceDbPath = PrismaService.findExistingSqlitePath(rawPath);
    const targetDbPath = tmpSqlitePath;

    if (sourceDbPath && !fs.existsSync(targetDbPath)) {
      try {
        fs.copyFileSync(sourceDbPath, targetDbPath);
      } catch {
      }
    }

    return `file:${targetDbPath}`;
  }

  private static findExistingSqlitePath(rawPath: string): string | null {
    if (!rawPath) return null;

    const candidates: string[] = [];
    if (path.isAbsolute(rawPath)) {
      candidates.push(rawPath);
    } else {
      candidates.push(path.resolve(process.cwd(), rawPath));
      candidates.push(path.resolve(process.cwd(), '../../packages/database/prisma', rawPath));
    }

    for (const candidate of candidates) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.isFile()) return candidate;
      } catch {
      }
    }

    return null;
  }
}
