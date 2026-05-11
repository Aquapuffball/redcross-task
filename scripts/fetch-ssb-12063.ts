import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_YEAR = "2025";
const TABLE_ID = "12063";

const CONTENT_CODES = [
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
];

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

function buildQuery(year: string): SsbQuery {
  return {
    selection: [
      {
        variableCode: "Tid",
        valueCodes: [year],
      },
      {
        variableCode: "KOKkommuneregion0000",
        valueCodes: ["*"],
        codelist: "agg_KOGkommuneregion000005402",
      },
      {
        variableCode: "ContentsCode",
        valueCodes: CONTENT_CODES,
      },
    ],
    placement: {
      heading: ["Tid", "ContentsCode"],
      stub: ["KOKkommuneregion0000"],
    },
  };
}

async function run() {
  const year = process.argv[2] ?? DEFAULT_YEAR;
  const outputArg = process.argv[3];
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.resolve(process.cwd(), `data/ssb/${TABLE_ID}-${year}.json`);

  const url = `https://data.ssb.no/api/pxwebapi/v2/tables/${TABLE_ID}/data?lang=no&outputFormat=json-stat2`;
  const body = buildQuery(year);

  console.log(`Fetching SSB table ${TABLE_ID} for year ${year}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as unknown;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(json, null, 2), "utf-8");

  console.log(`Saved response to ${outputPath}`);
}

run().catch((error) => {
  console.error("Failed to fetch SSB data:", error);
  process.exit(1);
});
