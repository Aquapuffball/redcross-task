import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isValidNorwegianPostnummer(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const postnummer = id.trim();

    if (!isValidNorwegianPostnummer(postnummer)) {
      return NextResponse.json(
        {
          error:
            "Postnummer er påkrevd i URL-en og må være nøyaktig 4 siffer (f.eks. /api/tjenester/0186).",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const branches = await prisma.organizationBranch.findMany({
      where: {
        OR: [{ postalCode: postnummer }, { streetPostalCode: postnummer }],
      },
      include: {
        municipality: true,
        contacts: true,
        activities: true,
        parent: {
          select: {
            branchId: true,
            branchNumber: true,
            branchName: true,
            branchType: true,
            isActive: true,
            postalCode: true,
            streetPostalCode: true,
            postOffice: true,
            streetPostOffice: true,
          },
        },
      },
      orderBy: [{ branchName: "asc" }, { branchId: "asc" }],
    });

    return NextResponse.json(branches);
  } catch (error) {
    console.error("[api/tjenester/[id]]", error);
    return NextResponse.json(
      { error: "Kunne ikke hente tjenester/avdelinger fra databasen." },
      { status: 500 },
    );
  }
}
