import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "../app/generated/prisma/client";
import { createScriptPrisma } from "./create-script-prisma";

const TABLE_ID = "12063";

type JsonStat2Dataset = {
  updated?: string;
  id: string[];
  size: number[];
  dimension: Record<
    string,
    {
      category: {
        index: Record<string, number>;
        label: Record<string, string>;
      };
    }
  >;
  value: Array<number | null>;
  status?: Record<string, string>;
};

async function fetchFylkeNames(): Promise<Map<string, string>> {
  const res = await fetch(
    "https://data.ssb.no/api/klass/v1/classifications/104/codes.json?from=2025-01-01",
  );
  if (!res.ok) {
    throw new Error(`Klass 104 request failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as {
    codes: Array<{ code: string; name: string }>;
  };
  const map = new Map<string, string>();
  for (const row of data.codes) {
    map.set(row.code, row.name);
  }
  return map;
}

function datasetDims(dataset: JsonStat2Dataset) {
  const geoKey =
    dataset.id.find((k) => k.includes("Kommuneregion")) ?? dataset.id[0]!;
  const timeKey =
    dataset.id.find((k) => k === "Tid") ?? dataset.id[1]!;
  const contentsKey =
    dataset.id.find((k) => k === "ContentsCode") ??
    dataset.id[dataset.id.length - 1]!;

  const geoCat = dataset.dimension[geoKey].category;
  const codesOrdered = Object.keys(geoCat.index).sort(
    (a, b) => geoCat.index[a]! - geoCat.index[b]!,
  );
  const contCat = dataset.dimension[contentsKey].category;
  const contentCodesOrdered = Object.keys(contCat.index).sort(
    (a, b) => contCat.index[a]! - contCat.index[b]!,
  );

  const timeCat = dataset.dimension[timeKey].category;
  const timelineCodesSorted = Object.keys(timeCat.index).sort(
    (a, b) => timeCat.index[a]! - timeCat.index[b]!,
  );
  if (timelineCodesSorted.length === 0) throw new Error("No Tid dimension value");
  const timelineCode = timelineCodesSorted[0];
  if (timelineCodesSorted.length !== 1) {
    console.warn(
      `Expected one Tid slice; dataset has ${timelineCodesSorted.join(", ")} — using "${timelineCode}"`,
    );
  }
  if (!timelineCode) throw new Error("Missing Tid slice");
  const yearNumeric = Number(timelineCode);
  if (Number.isNaN(yearNumeric)) {
    throw new Error(`Cannot parse Tid as integer year: "${timelineCode}"`);
  }
  const tPos = timeCat.index[timelineCode];
  if (tPos === undefined) throw new Error(`Missing index for Tid ${timelineCode}`);

  return {
    geoKey,
    timeKey,
    contentsKey,
    codesOrdered,
    labelsByCode: geoCat.label,
    contentCodesOrdered,
    contentLabelsByCode: contCat.label,
    yearNumeric,
    tPos,
  };
}

function isKommuneCode(code: string): boolean {
  return /^[0-9]{4}$/.test(code);
}

function countyForKommune(
  kommuneCode: string,
  fylkeNames: Map<string, string>,
): string | null {
  return fylkeNames.get(kommuneCode.slice(0, 2)) ?? null;
}

/** Last dimension varies fastest — matches JSON-stat / PxWeb flattened `value`. */
function flatMultiIndex(positions: number[], sizes: number[]): number {
  let idx = 0;
  for (let dim = 0; dim < sizes.length; dim++) {
    let factor = 1;
    for (let j = dim + 1; j < sizes.length; j++) factor *= sizes[j]!;
    idx += positions[dim]! * factor;
  }
  return idx;
}

async function run() {
  const yearArg = Number(process.argv[2] ?? "2025");
  const jsonPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : path.resolve(process.cwd(), `data/ssb/${TABLE_ID}-${yearArg}.json`);

  const { prisma, pool } = createScriptPrisma();

  try {
    const raw = await readFile(jsonPath, "utf-8");
    const dataset = JSON.parse(raw) as JsonStat2Dataset;

    const dims = datasetDims(dataset);
    if (yearArg !== dims.yearNumeric) {
      console.warn(
        `CLI argv year (${yearArg}) differs from Tid in dataset (${dims.yearNumeric}); using dataset year for rows.`,
      );
    }

    const fylkeNames = await fetchFylkeNames();
    const sourceUpdatedAt = dataset.updated
      ? new Date(dataset.updated)
      : null;
    const status = dataset.status ?? {};

    const leisureRows: Prisma.MunicipalityLeisureCenterStatCreateManyInput[] = [];

    const {
      geoKey,
      contentsKey,
      codesOrdered,
      labelsByCode,
      contentCodesOrdered,
      contentLabelsByCode,
      yearNumeric,
      tPos,
    } = dims;

    const contDimension = dataset.dimension[contentsKey].category.index;

    for (const kommuneCode of codesOrdered) {
      if (!isKommuneCode(kommuneCode)) continue;

      const gPos = dataset.dimension[geoKey].category.index[kommuneCode];
      if (gPos === undefined) continue;

      const kommuneLabel = labelsByCode[kommuneCode];
      if (!kommuneLabel) continue;

      const county = countyForKommune(kommuneCode, fylkeNames);

      const muni = await prisma.municipality.upsert({
        where: { code: kommuneCode },
        create: {
          code: kommuneCode,
          name: kommuneLabel,
          county,
          region: null,
        },
        update: {
          name: kommuneLabel,
          county,
        },
      });

      for (const contentsCode of contentCodesOrdered) {
        const cPos = contDimension[contentsCode];
        if (cPos === undefined) continue;

        const valueIdx = flatMultiIndex([gPos, tPos, cPos], dataset.size);
        const rawValue = dataset.value[valueIdx];
        const cellStatus = status[String(valueIdx)];

        const value =
          rawValue === null || rawValue === undefined
            ? null
            : new Prisma.Decimal(String(rawValue));

        leisureRows.push({
          municipalityId: muni.id,
          tableId: TABLE_ID,
          year: yearNumeric,
          contentsCode,
          contentsLabel: contentLabelsByCode[contentsCode] ?? null,
          value,
          status: cellStatus ?? null,
          sourceUpdatedAt,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.municipalityLeisureCenterStat.deleteMany({
        where: { tableId: TABLE_ID, year: yearNumeric },
      });
      const chunkSize = 2000;
      for (let i = 0; i < leisureRows.length; i += chunkSize) {
        await tx.municipalityLeisureCenterStat.createMany({
          data: leisureRows.slice(i, i + chunkSize),
        });
      }
    });

    const nContents = Math.max(contentCodesOrdered.length, 1);
    const kommunerImported = leisureRows.length / nContents;

    console.log(
      `SSB leisure import OK year=${yearNumeric}, kommuner≈${Math.round(kommunerImported)}, leisure cells=${leisureRows.length}`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("SSB leisure import failed:", error);
  process.exit(1);
});
