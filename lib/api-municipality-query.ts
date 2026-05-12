import type { PrismaClient } from "@/app/generated/prisma/client";
import { normalizeKommuneCode } from "@/lib/municipality-code";

export const API_QUERY_YEAR_MIN = 1990;
export const API_QUERY_YEAR_MAX = 2100;

export async function resolveMunicipalityIdFromParam(
  prisma: PrismaClient,
  raw: string,
): Promise<{ id: string } | null> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const byId = await prisma.municipality.findUnique({
    where: { id: trimmed },
    select: { id: true },
  });
  if (byId) {
    return byId;
  }

  if (/^\d+$/.test(trimmed)) {
    try {
      const code = normalizeKommuneCode(trimmed);
      return prisma.municipality.findUnique({
        where: { code },
        select: { id: true },
      });
    } catch {
      return null;
    }
  }

  return null;
}
