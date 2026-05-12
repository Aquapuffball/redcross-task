import { readFile } from "node:fs/promises";
import path from "node:path";
import { createScriptPrisma } from "./create-script-prisma";
import { type Prisma } from "../app/generated/prisma/client";

type RawPayload = {
  data?: {
    branches?: RawBranch[];
  };
};

type RawBranch = {
  branchId: string;
  branchNumber?: string;
  organizationNumber?: string;
  branchType: string;
  branchName: string;
  branchStatus?: {
    isActive?: boolean;
    creationDate?: string;
    isTerminated?: boolean;
    terminationDate?: string;
  };
  branchParent?: {
    branchId?: string;
    branchNumber?: string;
    branchName?: string;
    branchType?: string;
  };
  branchDetails?: {
    description?: string;
    organizationLevel?: string;
  };
  branchLocation?: {
    municipality?: string;
    county?: string;
    region?: string;
    postalAddress?: {
      addressLine1?: string;
      postalCode?: string;
      postOffice?: string;
    };
    streetAddress?: {
      addressLine1?: string;
      postalCode?: string;
      postOffice?: string;
    };
  };
  communicationChannels?: {
    phone?: string;
    email?: string;
    web?: string;
  };
  branchContacts?: Array<{
    role?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    isVolunteer?: boolean;
    isMember?: boolean;
    memberNumber?: string;
  }>;
  branchActivities?: Array<{
    globalActivityName?: string;
    localActivityName?: string;
  }>;
};

function toDateOrNull(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function municipalityLookupNames(
  raw: string | null | undefined,
): string[] {
  const trimmed = raw?.trim();
  if (!trimmed) return [];
  const strippedParens = trimmed
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [...new Set([trimmed, strippedParens])].filter(Boolean);
}

async function resolveMunicipalityId(
  tx: Prisma.TransactionClient,
  locationName: string | null | undefined,
): Promise<string | null> {
  for (const candidate of municipalityLookupNames(locationName)) {
    const hit = await tx.municipality.findFirst({
      where: {
        OR: [
          { name: { equals: candidate, mode: "insensitive" } },
          { name: { startsWith: `${candidate} `, mode: "insensitive" } },
          { name: { startsWith: `${candidate}(`, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (hit) return hit.id;
  }
  return null;
}

async function run() {
  const { prisma, pool } = createScriptPrisma();
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(process.cwd(), "api-getOrganizations-output-21apr26.json");

  try {
    const fileContent = await readFile(inputPath, "utf-8");
    const payload = JSON.parse(fileContent) as RawPayload;
    const branches = payload.data?.branches ?? [];

    if (branches.length === 0) {
      throw new Error("No branches found in payload.");
    }

    let importedBranches = 0;
    let importedContacts = 0;
    let importedActivities = 0;

    for (const branch of branches) {
      if (!branch.branchId) continue;

      const creationDate = toDateOrNull(branch.branchStatus?.creationDate);
      if (!creationDate) {
        // Required in schema, skip malformed rows to keep import stable.
        continue;
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const municipalityId = await resolveMunicipalityId(
          tx,
          branch.branchLocation?.municipality,
        );

        const linkedMuni =
          municipalityId === null
            ? null
            : await tx.municipality.findUnique({
                where: { id: municipalityId },
                select: { county: true, region: true },
              });

        const county =
          branch.branchLocation?.county ?? linkedMuni?.county ?? null;
        const region =
          branch.branchLocation?.region ?? linkedMuni?.region ?? null;

        await tx.organizationBranch.upsert({
          where: { branchId: branch.branchId },
          create: {
            branchId: branch.branchId,
            branchNumber: branch.branchNumber ?? null,
            organizationNumber: branch.organizationNumber ?? null,
            branchType: branch.branchType,
            branchName: branch.branchName,
            isActive: branch.branchStatus?.isActive ?? false,
            creationDate,
            isTerminated: branch.branchStatus?.isTerminated ?? false,
            terminationDate: toDateOrNull(branch.branchStatus?.terminationDate),
            parentBranchId: null,
            parentBranchNumber: branch.branchParent?.branchNumber ?? null,
            parentBranchName: branch.branchParent?.branchName ?? null,
            parentBranchType: branch.branchParent?.branchType ?? null,
            description: branch.branchDetails?.description ?? null,
            organizationLevel: branch.branchDetails?.organizationLevel ?? null,
            locationMunicipality: branch.branchLocation?.municipality ?? null,
            municipalityId,
            county,
            region,
            postalAddressLine1:
              branch.branchLocation?.postalAddress?.addressLine1 ?? null,
            postalCode: branch.branchLocation?.postalAddress?.postalCode ?? null,
            postOffice: branch.branchLocation?.postalAddress?.postOffice ?? null,
            streetAddressLine1:
              branch.branchLocation?.streetAddress?.addressLine1 ?? null,
            streetPostalCode:
              branch.branchLocation?.streetAddress?.postalCode ?? null,
            streetPostOffice:
              branch.branchLocation?.streetAddress?.postOffice ?? null,
            phone: branch.communicationChannels?.phone ?? null,
            email: branch.communicationChannels?.email ?? null,
            web: branch.communicationChannels?.web ?? null,
          },
          update: {
            branchNumber: branch.branchNumber ?? null,
            organizationNumber: branch.organizationNumber ?? null,
            branchType: branch.branchType,
            branchName: branch.branchName,
            isActive: branch.branchStatus?.isActive ?? false,
            creationDate,
            isTerminated: branch.branchStatus?.isTerminated ?? false,
            terminationDate: toDateOrNull(branch.branchStatus?.terminationDate),
            parentBranchId: null,
            parentBranchNumber: branch.branchParent?.branchNumber ?? null,
            parentBranchName: branch.branchParent?.branchName ?? null,
            parentBranchType: branch.branchParent?.branchType ?? null,
            description: branch.branchDetails?.description ?? null,
            organizationLevel: branch.branchDetails?.organizationLevel ?? null,
            locationMunicipality: branch.branchLocation?.municipality ?? null,
            municipalityId,
            county,
            region,
            postalAddressLine1:
              branch.branchLocation?.postalAddress?.addressLine1 ?? null,
            postalCode: branch.branchLocation?.postalAddress?.postalCode ?? null,
            postOffice: branch.branchLocation?.postalAddress?.postOffice ?? null,
            streetAddressLine1:
              branch.branchLocation?.streetAddress?.addressLine1 ?? null,
            streetPostalCode:
              branch.branchLocation?.streetAddress?.postalCode ?? null,
            streetPostOffice:
              branch.branchLocation?.streetAddress?.postOffice ?? null,
            phone: branch.communicationChannels?.phone ?? null,
            email: branch.communicationChannels?.email ?? null,
            web: branch.communicationChannels?.web ?? null,
          },
        });

        await tx.branchContact.deleteMany({
          where: { branchId: branch.branchId },
        });
        await tx.branchActivity.deleteMany({
          where: { branchId: branch.branchId },
        });

        const contacts = (branch.branchContacts ?? []).map((contact) => ({
          branchId: branch.branchId,
          role: contact.role ?? null,
          firstName: contact.firstName ?? null,
          lastName: contact.lastName ?? null,
          email: contact.email ?? null,
          isVolunteer: contact.isVolunteer ?? null,
          isMember: contact.isMember ?? null,
          memberNumber: contact.memberNumber ?? null,
        }));

        const activities = (branch.branchActivities ?? []).map((activity) => ({
          branchId: branch.branchId,
          globalActivityName: activity.globalActivityName ?? null,
          localActivityName: activity.localActivityName ?? null,
        }));

        if (contacts.length > 0) {
          await tx.branchContact.createMany({ data: contacts });
        }
        if (activities.length > 0) {
          await tx.branchActivity.createMany({ data: activities });
        }

        importedBranches += 1;
        importedContacts += contacts.length;
        importedActivities += activities.length;
      });
    }

    // `parentBranchId` → `branchId` FK: children may appear before parents in JSON.
    for (const branch of branches) {
      if (!branch.branchId) continue;
      const parentId = branch.branchParent?.branchId;
      if (!parentId) continue;

      const parent = await prisma.organizationBranch.findUnique({
        where: { branchId: parentId },
        select: { branchId: true },
      });
      if (!parent) continue;

      await prisma.organizationBranch.update({
        where: { branchId: branch.branchId },
        data: { parentBranchId: parentId },
      });
    }

    console.log("Import complete.");
    console.log(`Branches: ${importedBranches}`);
    console.log(`Contacts: ${importedContacts}`);
    console.log(`Activities: ${importedActivities}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
