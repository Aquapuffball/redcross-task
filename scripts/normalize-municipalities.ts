import "dotenv/config";
import { Prisma } from "../app/generated/prisma/client";
import { createScriptPrisma } from "./create-script-prisma";
import {
  canonicalKommuneCodeFromStored,
  isCanonicalKommuneCode,
  lacksKommuneNavn,
} from "@/lib/scripts/municipality-code";

type Muni = {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
};

function scoreKeeper(a: Muni, b: Muni): number {
  const aOk = !lacksKommuneNavn(a.name, a.code);
  const bOk = !lacksKommuneNavn(b.name, b.code);
  if (aOk !== bOk) {
    return aOk ? -1 : 1;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

async function mergeMunicipalityInto(
  tx: Prisma.TransactionClient,
  keeperId: string,
  otherId: string,
): Promise<void> {
  const immigrationOther = await tx.municipalityImmigrationStat.findMany({
    where: { municipalityId: otherId },
  });
  for (const row of immigrationOther) {
    const clash = await tx.municipalityImmigrationStat.findFirst({
      where: {
        municipalityId: keeperId,
        year: row.year,
        gender: row.gender,
        immigrationReason: row.immigrationReason,
        unit: row.unit,
      },
    });
    if (clash) {
      await tx.municipalityImmigrationStat.delete({ where: { id: row.id } });
    } else {
      await tx.municipalityImmigrationStat.update({
        where: { id: row.id },
        data: { municipalityId: keeperId },
      });
    }
  }

  const leisureOther = await tx.municipalityLeisureCenterStat.findMany({
    where: { municipalityId: otherId },
  });
  for (const row of leisureOther) {
    const clash = await tx.municipalityLeisureCenterStat.findFirst({
      where: {
        municipalityId: keeperId,
        year: row.year,
        contentsCode: row.contentsCode,
      },
    });
    if (clash) {
      await tx.municipalityLeisureCenterStat.delete({ where: { id: row.id } });
    } else {
      await tx.municipalityLeisureCenterStat.update({
        where: { id: row.id },
        data: { municipalityId: keeperId },
      });
    }
  }

  await tx.organizationBranch.updateMany({
    where: { municipalityId: otherId },
    data: { municipalityId: keeperId },
  });

  await tx.municipality.delete({ where: { id: otherId } });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { prisma, pool } = createScriptPrisma();

  try {
    const all = await prisma.municipality.findMany({
      orderBy: { code: "asc" },
    });

    const invalid: Muni[] = [];
    const byCanonical = new Map<string, Muni[]>();

    for (const m of all) {
      const c = canonicalKommuneCodeFromStored(m.code);
      if (!c) {
        invalid.push(m);
        continue;
      }
      const list = byCanonical.get(c) ?? [];
      list.push(m);
      byCanonical.set(c, list);
    }

    const duplicateGroups = [...byCanonical.entries()].filter(
      ([, rows]) => rows.length > 1,
    );
    const nonCanonicalCode = all.filter((m) => {
      const c = canonicalKommuneCodeFromStored(m.code);
      return c !== null && m.code !== c;
    });
    const wrongFormat = all.filter((m) => !isCanonicalKommuneCode(m.code));
    const missingName = all.filter((m) => lacksKommuneNavn(m.name, m.code));

    console.log("— Kommune / kommunenummer —");
    console.log(`Totalt antall rader: ${all.length}`);
    console.log(
      `Ugyldig kommunenummer (ingen gyldig siffersekvens 1–4): ${invalid.length}`,
    );
    if (invalid.length > 0) {
      console.log(
        "  Eksempler:",
        invalid
          .slice(0, 8)
          .map((m) => ({ id: m.id, code: m.code, name: m.name })),
      );
    }
    console.log(`Unike kanoniske kommunenummer (grupper): ${byCanonical.size}`);
    console.log(
      `Duplikat-grupper (samme kanoniske nummer, flere rader): ${duplicateGroups.length}`,
    );
    for (const [canon, rows] of duplicateGroups.slice(0, 15)) {
      console.log(
        `  ${canon}:`,
        rows.map((r) => ({ id: r.id, code: r.code, name: r.name })),
      );
    }
    if (duplicateGroups.length > 15) {
      console.log(`  … og ${duplicateGroups.length - 15} grupper til`);
    }
    console.log(
      `Rader der \`code\` ikke er kanonisk (f.eks. mangler ledende 0): ${nonCanonicalCode.length}`,
    );
    console.log(
      `Rader der \`code\` ikke er eksakt /^[0-9]{4}$/: ${wrongFormat.length}`,
    );
    console.log(`Rader uten brukbart kommunenavn: ${missingName.length}`);

    if (!apply) {
      console.log(
        "\nKjør med --apply for å slå sammen duplikater og sette \`code\` til kanonisk fire siffer.",
      );
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const [canon, rows] of duplicateGroups) {
        const sorted = [...rows].sort(scoreKeeper);
        const keeper = sorted[0]!;
        const duplicates = sorted.slice(1);
        if (keeper.code !== canon) {
          await tx.municipality.update({
            where: { id: keeper.id },
            data: { code: canon },
          });
        }
        for (const dup of duplicates) {
          await mergeMunicipalityInto(tx, keeper.id, dup.id);
        }
      }

      const afterDedup = await tx.municipality.findMany({
        select: { id: true, code: true },
      });
      for (const m of afterDedup) {
        const canon = canonicalKommuneCodeFromStored(m.code);
        if (!canon || m.code === canon) {
          continue;
        }
        const taken = await tx.municipality.findUnique({
          where: { code: canon },
        });
        if (taken && taken.id !== m.id) {
          console.warn(
            `Hopper over code-oppdatering for ${m.id}: "${m.code}" -> ${canon} (kode er opptatt)`,
          );
          continue;
        }
        await tx.municipality.update({
          where: { id: m.id },
          data: { code: canon },
        });
      }
    });

    const after = await prisma.municipality.findMany({
      orderBy: { code: "asc" },
    });
    const missingAfter = after.filter((m) => lacksKommuneNavn(m.name, m.code));
    console.log("\nEtter --apply:");
    console.log(`  Antall kommuner: ${after.length}`);
    console.log(`  Uten brukbart kommunenavn: ${missingAfter.length}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
