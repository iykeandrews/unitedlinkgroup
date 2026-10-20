import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@unitedlinkgroup/database';

export function databasePoolUrl(value?: string) {
  if (!value || !/^postgres(?:ql)?:\/\//.test(value)) return value;
  const url = new URL(value);
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '8');
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '15');
  return url.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = databasePoolUrl(process.env.DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
