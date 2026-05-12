import { NextResponse } from "next/server";
import { resolveMunicipalityIdFromParam } from "@/lib/scripts/api-municipality-query";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Avdelinger knyttet til kommunen via `municipalityId`, eller der postnummer
 * (postal / gatepost) samsvarer med kommunenummeret (som brukt i import).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const municipalityRaw = searchParams.get("municipality")?.trim() ?? "";

    if (!municipalityRaw) {
      return NextResponse.json(
        {
          error:
            "Query-parameteren `municipality` (kommunens id eller kommunenummer) er påkrevd.",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const resolved = await resolveMunicipalityIdFromParam(
      prisma,
      municipalityRaw,
    );
    if (!resolved) {
      return NextResponse.json(
        { error: "Fant ikke kommune." },
        { status: 404 },
      );
    }

    const muni = await prisma.municipality.findUnique({
      where: { id: resolved.id },
      select: { id: true, code: true },
    });
    if (!muni) {
      return NextResponse.json(
        { error: "Fant ikke kommune." },
        { status: 404 },
      );
    }

    const branches = await prisma.organizationBranch.findMany({
      where: {
        OR: [
          { municipalityId: muni.id },
          { postalCode: muni.code },
          { streetPostalCode: muni.code },
        ],
      },
      select: {
        activities: {
          select: {
            globalActivityName: true,
            localActivityName: true,
          },
        },
      },
    });

    const labels = new Set<string>();
    for (const branch of branches) {
      for (const act of branch.activities) {
        const local = act.localActivityName?.trim();
        const global = act.globalActivityName?.trim();
        const label = local || global;
        if (label) {
          labels.add(label);
        }
      }
    }

    return NextResponse.json({
      activities: [...labels].sort((a, b) => a.localeCompare(b, "nb")),
    });
  } catch (error) {
    console.error("[api/organisasjon/aktiviteter]", error);
    return NextResponse.json(
      { error: "Kunne ikke hente organisasjonsaktiviteter." },
      { status: 500 },
    );
  }
}
