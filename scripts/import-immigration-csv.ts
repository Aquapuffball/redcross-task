import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Gender,
  ImmigrationReason,
  Prisma,
  ValueUnit,
} from "../app/generated/prisma/client";
import { normalizeKommuneCode } from "../lib/municipality-code";
import { createScriptPrisma } from "./create-script-prisma";

const FILE_DEFAULT = "befolkning_innvandringsgrunn_kommuner.csv";

const GENDER_MAP: Record<string, Gender> = {
  Alle: Gender.ALL,
  Kvinner: Gender.WOMEN,
  Menn: Gender.MEN,
};

const REASON_MAP: Record<string, ImmigrationReason> = {
  Alle: ImmigrationReason.ALL,
  Arbeidsinnvandrere: ImmigrationReason.LABOR,
  Familieinnvandrede: ImmigrationReason.FAMILY,
  "Flyktninger og deres familieinnvandrede": ImmigrationReason.REFUGEES_AND_FAMILY,
  Uoppgitt: ImmigrationReason.UNDISCLOSED,
  "Utdanning (inkl. au pair) eller andre grunner":
    ImmigrationReason.EDUCATION_OR_OTHER,
};

const UNIT_MAP: Record<string, ValueUnit> = {
  Personer: ValueUnit.PERSONS,
  Prosent: ValueUnit.PERCENT,
};

type ParsedRow = {
  codeRaw: string;
  name: string;
  gender: string;
  year: number;
  reasonRaw: string;
  unitRaw: string;
  amount: string;
};

function parseCsv(content: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = content.split(/\r?\n/).filter(Boolean);
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < 7) continue;
    const year = Number.parseInt(cols[3].trim(), 10);
    if (Number.isNaN(year)) continue;
    rows.push({
      codeRaw: cols[0].trim(),
      name: cols[1].trim(),
      gender: cols[2].trim(),
      reasonRaw: cols[4].trim(),
      unitRaw: cols[5].trim(),
      year,
      amount: cols[6].trim(),
    });
  }
  return rows;
}

async function resolveMunicipalityIdByCodeMap(
  tx: Prisma.TransactionClient,
  codes: Iterable<string>,
): Promise<Map<string, string>> {
  const list = Array.from(new Set(codes)).map(normalizeKommuneCode);
  const found = await tx.municipality.findMany({
    where: { code: { in: list } },
    select: { id: true, code: true },
  });
  const map = new Map<string, string>();
  for (const m of found) map.set(m.code, m.id);
  return map;
}

async function run() {
  const csvPathArg = process.argv[2];
  const csvPath = csvPathArg
    ? path.resolve(process.cwd(), csvPathArg)
    : path.resolve(process.cwd(), FILE_DEFAULT);

  const { prisma, pool } = createScriptPrisma();

  try {
    const buf = await readFile(csvPath);
    const latin1Content = buf.toString("latin1");
    const parsed = parseCsv(latin1Content);

    const uniqueKommuner = new Map<string, string>();
    const years = new Set<number>();
    const codesInRows = new Set<string>();

    for (const row of parsed) {
      let code: string;
      try {
        code = normalizeKommuneCode(row.codeRaw);
      } catch {
        continue;
      }
      codesInRows.add(code);
      if (!uniqueKommuner.has(code)) uniqueKommuner.set(code, row.name);
      years.add(row.year);
    }

    console.log(`Parsed ${parsed.length} rows, ${years.size} years, kommuner=${uniqueKommuner.size}`);

    await prisma.$transaction(async (tx) => {
      for (const [code, name] of uniqueKommuner) {
        const existing = await tx.municipality.findUnique({
          where: { code },
        });
        if (!existing) {
          await tx.municipality.create({
            data: {
              code,
              name,
            },
          });
        }
      }

      await tx.municipalityImmigrationStat.deleteMany({
        where: { year: { in: [...years] } },
      });

      const idByCode = await resolveMunicipalityIdByCodeMap(tx, codesInRows);

      const prismaRows: Prisma.MunicipalityImmigrationStatCreateManyInput[] = [];
      let skipped = 0;

      for (const row of parsed) {
        let code: string;
        try {
          code = normalizeKommuneCode(row.codeRaw);
        } catch {
          skipped += 1;
          continue;
        }

        const gender = GENDER_MAP[row.gender];
        const reason = REASON_MAP[row.reasonRaw];
        const unit = UNIT_MAP[row.unitRaw];
        const municipalityId = idByCode.get(code);

        if (!gender || !reason || !unit || !municipalityId) {
          skipped += 1;
          continue;
        }

        const valueNum = Number.parseFloat(row.amount.replace(",", "."));
        if (Number.isNaN(valueNum)) {
          skipped += 1;
          continue;
        }

        prismaRows.push({
          municipalityId,
          gender,
          year: row.year,
          immigrationReason: reason,
          unit,
          value: new Prisma.Decimal(String(valueNum)),
        });
      }

      const chunk = 2500;
      for (let i = 0; i < prismaRows.length; i += chunk) {
        await tx.municipalityImmigrationStat.createMany({
          data: prismaRows.slice(i, i + chunk),
        });
      }

      console.log(`Inserted immigration stats=${prismaRows.length}, skipped=${skipped}`);
    }, { timeout: 600_000 });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Immigration import failed:", error);
  process.exit(1);
});
