import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prisma = getPrisma();
    const kommuner = await prisma.municipality.findMany({
      orderBy: [{ name: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        county: true,
      },
      where: {
        AND: [
          { name: { not: "" } },
          {
            name: {
              not: {
                contains: "t.o.m",
              },
            },
          },
          { code: { not: "" } },
        ],
      },
    });
    return NextResponse.json(kommuner);
  } catch (error) {
    console.error("[api/kommuner]", error);
    return NextResponse.json(
      { error: "Kunne ikke hente kommuner fra databasen." },
      { status: 500 },
    );
  }
}
