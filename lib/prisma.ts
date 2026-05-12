import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { normalizeDatabaseUrlForPg } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is missing.");
  }
  return normalizeDatabaseUrlForPg(url);
}

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  const pool =
    globalForPrisma.pgPool ??
    new Pool({ connectionString: getDatabaseUrl() });
  globalForPrisma.pgPool = pool;
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });
  globalForPrisma.prisma = prisma;
  return prisma;
}
