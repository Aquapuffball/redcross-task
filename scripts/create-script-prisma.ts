import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { normalizeDatabaseUrlForPg } from "../lib/database-url";

export function createScriptPrisma(): {
  prisma: PrismaClient;
  pool: Pool;
} {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "DATABASE_URL is missing. Set it in .env or your shell environment.",
    );
  }
  const url = normalizeDatabaseUrlForPg(raw);
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}
