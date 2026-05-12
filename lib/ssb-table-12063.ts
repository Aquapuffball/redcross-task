import type { PrismaClient } from "@/app/generated/prisma/client";
import { Prisma } from "@/app/generated/prisma/client";

export const SSB_TABLE_ID_12063 = "12063";

export const CONTENT_CODES_12063 = [
  "KOSfritidkomm0000",
  "KOSfritidtimeruk0000",
  "KOStestfritidtim0000",
  "KOSfritiddaguke0000",
  "KOSfritidukeaar0000",
  "KOSfritidtimer100000",
  "KOSfritidbesok100000",
  "KOSfritidantaars0000",
  "KOSfritidprivtil0000",
  "KOSfritidmtilsku0000",
  "KOStilskuddbarn0000",
  "KOStilskuddlag0000",
  "KOSfritidredleie0000",
] as const;

type SsbQuery = {
  selection: Array<{
    variableCode: string;
    valueCodes: string[];
    codelist?: string;
  }>;
  placement: {
    heading: string[];
    stub: string[];
  };
};

export function buildSsb12063Query(year: string): SsbQuery {
  return {
    selection: [
      { variableCode: "Tid", valueCodes: [year] },
      {
        variableCode: "KOKkommuneregion0000",
        valueCodes: ["*"],
        codelist: "agg_KOGkommuneregion000005402",
      },
      {
        variableCode: "ContentsCode",
        valueCodes: [...CONTENT_CODES_12063],
      },
    ],
    placement: {
      heading: ["Tid", "ContentsCode"],
      stub: ["KOKkommuneregion0000"],
    },
  };
}

export type JsonStat2Dataset = {
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

export async function fetchSsb12063Dataset(year: string): Promise<JsonStat2Dataset> {
  const url = `https://data.ssb.no/api/pxwebapi/v2/tables/${SSB_TABLE_ID_12063}/data?lang=no&outputFormat=json-stat2`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSsb12063Query(year)),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SSB request failed (${response.status}): ${errorText}`);
  }
  return (await response.json()) as JsonStat2Dataset;
}

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
  const timeKey = dataset.id.find((k) => k === "Tid") ?? dataset.id[1]!;
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

function flatMultiIndex(positions: number[], sizes: number[]): number {
  let idx = 0;
  for (let dim = 0; dim < sizes.length; dim++) {
    let factor = 1;
    for (let j = dim + 1; j < sizes.length; j++) factor *= sizes[j]!;
    idx += positions[dim]! * factor;
  }
  return idx;
}

export async function importLeisureFromDataset(
  prisma: PrismaClient,
  dataset: JsonStat2Dataset,
  cliYearHint?: number,
): Promise<{ yearNumeric: number; leisureCells: number; kommunerApprox: number }> {
  const dims = datasetDims(dataset);
  if (cliYearHint !== undefined && cliYearHint !== dims.yearNumeric) {
    console.warn(
      `CLI argv year (${cliYearHint}) differs from Tid in dataset (${dims.yearNumeric}); using dataset year for rows.`,
    );
  }

  const fylkeNames = await fetchFylkeNames();
  const sourceUpdatedAt = dataset.updated ? new Date(dataset.updated) : null;
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
        tableId: SSB_TABLE_ID_12063,
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
      where: { tableId: SSB_TABLE_ID_12063, year: yearNumeric },
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

  return {
    yearNumeric,
    leisureCells: leisureRows.length,
    kommunerApprox: Math.round(kommunerImported),
  };
}

const DEFAULT_CACHE_HOURS = 6;

function cacheHoursFromEnv(): number {
  const raw = process.env.SSB_12063_CACHE_HOURS?.trim();
  if (!raw) return DEFAULT_CACHE_HOURS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_CACHE_HOURS;
  return n;
}

export async function ensureSsb12063Imported(
  prisma: PrismaClient,
  year: number,
): Promise<{
  source: "api" | "database";
  yearUsed: number;
  lastDbUpdate: Date | null;
}> {
  const aggregate = await prisma.municipalityLeisureCenterStat.aggregate({
    where: { tableId: SSB_TABLE_ID_12063, year },
    _max: { updatedAt: true },
  });
  const lastDbUpdate = aggregate._max.updatedAt;
  const maxAgeMs = cacheHoursFromEnv() * 60 * 60 * 1000;
  const freshEnough =
    lastDbUpdate !== null && Date.now() - lastDbUpdate.getTime() <= maxAgeMs;

  if (freshEnough) {
    return { source: "database", yearUsed: year, lastDbUpdate };
  }

  const dataset = await fetchSsb12063Dataset(String(year));
  const { yearNumeric } = await importLeisureFromDataset(prisma, dataset, year);
  const after = await prisma.municipalityLeisureCenterStat.aggregate({
    where: { tableId: SSB_TABLE_ID_12063, year: yearNumeric },
    _max: { updatedAt: true },
  });

  return {
    source: "api",
    yearUsed: yearNumeric,
    lastDbUpdate: after._max.updatedAt,
  };
}
