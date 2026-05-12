import { NextResponse } from "next/server";
import {
  API_QUERY_YEAR_MAX,
  API_QUERY_YEAR_MIN,
  resolveMunicipalityIdFromParam,
} from "@/lib/scripts/api-municipality-query";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearRaw = searchParams.get("year");
    const municipalityRaw = searchParams.get("municipality");
    const hasYear = yearRaw !== null && yearRaw.trim() !== "";
    const hasMunicipality =
      municipalityRaw !== null && municipalityRaw.trim() !== "";

    if (!hasYear && !hasMunicipality) {
      return NextResponse.json(
        {
          error:
            "Oppgi minst én av query-parameterne `year` og/eller `municipality` (kommunenummer eller kommunens id).",
        },
        { status: 400 },
      );
    }

    let year: number | undefined;
    if (hasYear && yearRaw !== null) {
      const y = Number.parseInt(yearRaw, 10);
      if (
        !Number.isFinite(y) ||
        y < API_QUERY_YEAR_MIN ||
        y > API_QUERY_YEAR_MAX
      ) {
        return NextResponse.json(
          {
            error: `Ugyldig år. Forventet heltall mellom ${API_QUERY_YEAR_MIN} og ${API_QUERY_YEAR_MAX}.`,
          },
          { status: 400 },
        );
      }
      year = y;
    }

    const prisma = getPrisma();

    let municipalityId: string | undefined;
    if (hasMunicipality && municipalityRaw !== null) {
      const m = await resolveMunicipalityIdFromParam(prisma, municipalityRaw);
      if (!m) {
        return NextResponse.json(
          {
            error:
              "Fant ikke kommune for oppgitt `municipality` (id eller kommunenummer).",
          },
          { status: 404 },
        );
      }
      municipalityId = m.id;
    }

    const rows = await prisma.municipalityLeisureCenterStat.findMany({
      where: {
        ...(year !== undefined ? { year } : {}),
        ...(municipalityId !== undefined ? { municipalityId } : {}),
      },
      include: {
        municipality: {
          select: {
            id: true,
            code: true,
            name: true,
            county: true,
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { municipalityId: "asc" },
        { contentsCode: "asc" },
      ],
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[api/fritidssentere]", error);
    return NextResponse.json(
      { error: "Kunne ikke hente fritids-/SSB 12063-data fra databasen." },
      { status: 500 },
    );
  }
}
