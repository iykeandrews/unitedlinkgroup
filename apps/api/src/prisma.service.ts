import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@unitedlinkgroup/database";

export function databasePoolUrl(value?: string) {
  if (!value || !/^postgres(?:ql)?:\/\//.test(value)) return value;
  const url = new URL(value);
  if (!url.searchParams.has("connection_limit"))
    url.searchParams.set("connection_limit", "8");
  if (!url.searchParams.has("pool_timeout"))
    url.searchParams.set("pool_timeout", "15");
  return url.toString();
}

export function uppercaseEmployeeNameArgs(action: string, args: any) {
  const normalize = (data: any) => {
    if (!data || typeof data !== "object") return;
    if (Array.isArray(data)) {
      data.forEach(normalize);
      return;
    }
    for (const field of [
      "firstName",
      "middleName",
      "lastName",
      "preferredName",
    ]) {
      if (typeof data[field] === "string")
        data[field] = data[field].trim().toUpperCase();
      else if (data[field] && typeof data[field].set === "string")
        data[field].set = data[field].set.trim().toUpperCase();
    }
  };
  if (action === "upsert") {
    normalize(args?.create);
    normalize(args?.update);
  } else if (
    [
      "create",
      "createMany",
      "createManyAndReturn",
      "update",
      "updateMany",
      "updateManyAndReturn",
    ].includes(action)
  )
    normalize(args?.data);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = databasePoolUrl(process.env.DATABASE_URL);
    super(url ? { datasources: { db: { url } } } : undefined);
    this.$use(async (params, next) => {
      if (params.model === "Employee")
        uppercaseEmployeeNameArgs(params.action, params.args);
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
