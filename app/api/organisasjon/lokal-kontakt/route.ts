import { NextResponse } from "next/server";
import { resolveMunicipalityIdFromParam } from "@/lib/scripts/api-municipality-query";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type BranchContactRow = {
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

function contactSortKey(role: string | null): number {
  const n = role?.trim().toLowerCase() ?? "";
  if (n === "leder") return 0;
  if (n === "nestleder") return 1;
  return 2;
}

function contactHasDisplayData(c: BranchContactRow): boolean {
  return Boolean(
    c.email?.trim() ||
    c.firstName?.trim() ||
    c.lastName?.trim() ||
    c.role?.trim(),
  );
}

/** «Leder» først, deretter «Nestleder», deretter øvrige (med navn/e-post før tomme felt). */
function sortContactsForDisplay(
  contacts: BranchContactRow[],
): BranchContactRow[] {
  if (contacts.length === 0) {
    return [];
  }
  return [...contacts].sort((a, b) => {
    const rk = contactSortKey(a.role) - contactSortKey(b.role);
    if (rk !== 0) return rk;
    const aHas =
      Boolean(a.email?.trim()) ||
      Boolean(a.firstName?.trim()) ||
      Boolean(a.lastName?.trim());
    const bHas =
      Boolean(b.email?.trim()) ||
      Boolean(b.firstName?.trim()) ||
      Boolean(b.lastName?.trim());
    if (aHas !== bHas) return aHas ? -1 : 1;
    return 0;
  });
}

function hasAnyContactRow(contacts: BranchContactRow[]): boolean {
  return contacts.some(contactHasDisplayData);
}

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
        branchName: true,
        branchType: true,
        isActive: true,
        municipalityId: true,
        phone: true,
        email: true,
        web: true,
        contacts: {
          select: {
            role: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (branches.length === 0) {
      return NextResponse.json({
        branch: null,
        contacts: [],
      });
    }

    const sorted = [...branches].sort((a, b) => {
      const aLinked = a.municipalityId === muni.id ? 0 : 1;
      const bLinked = b.municipalityId === muni.id ? 0 : 1;
      if (aLinked !== bLinked) return aLinked - bLinked;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.branchName.localeCompare(b.branchName, "nb");
    });

    const primary =
      sorted.find((b) => hasAnyContactRow(b.contacts)) ??
      sorted.find(
        (b) =>
          Boolean(b.email?.trim()) ||
          Boolean(b.phone?.trim()) ||
          b.contacts.length > 0,
      ) ??
      sorted[0];

    const contactsPayload = sortContactsForDisplay(
      primary.contacts.filter(contactHasDisplayData),
    ).map((c) => ({
      role: c.role,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
    }));

    return NextResponse.json({
      branch: {
        branchName: primary.branchName,
        branchType: primary.branchType,
        phone: primary.phone,
        email: primary.email,
        web: primary.web,
      },
      contacts: contactsPayload,
    });
  } catch (error) {
    console.error("[api/organisasjon/lokal-kontakt]", error);
    return NextResponse.json(
      { error: "Kunne ikke hente lokal kontaktinformasjon." },
      { status: 500 },
    );
  }
}
