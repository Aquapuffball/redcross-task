import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  SSB_TABLE_ID_12063,
  fetchSsb12063Dataset,
} from "../lib/ssb-table-12063";

const DEFAULT_YEAR = "2025";

async function run() {
  const year = process.argv[2] ?? DEFAULT_YEAR;
  const outputArg = process.argv[3];
  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg)
    : path.resolve(process.cwd(), `data/ssb/${SSB_TABLE_ID_12063}-${year}.json`);

  console.log(`Fetching SSB table ${SSB_TABLE_ID_12063} for year ${year}...`);

  const json = await fetchSsb12063Dataset(year);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(json, null, 2), "utf-8");

  console.log(`Saved response to ${outputPath}`);
}

run().catch((error) => {
  console.error("Failed to fetch SSB data:", error);
  process.exit(1);
});
