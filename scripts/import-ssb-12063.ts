import { readFile } from "node:fs/promises";
import path from "node:path";
import { createScriptPrisma } from "./create-script-prisma";
import {
  SSB_TABLE_ID_12063,
  importLeisureFromDataset,
  type JsonStat2Dataset,
} from "@/lib/scripts/ssb-table-12063";

async function run() {
  const yearArg = Number(process.argv[2] ?? "2025");
  const jsonPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : path.resolve(
        process.cwd(),
        `data/ssb/${SSB_TABLE_ID_12063}-${yearArg}.json`,
      );

  const { prisma, pool } = createScriptPrisma();

  try {
    const raw = await readFile(jsonPath, "utf-8");
    const dataset = JSON.parse(raw) as JsonStat2Dataset;

    const { yearNumeric, leisureCells, kommunerApprox } =
      await importLeisureFromDataset(prisma, dataset, yearArg);

    console.log(
      `SSB leisure import OK year=${yearNumeric}, kommuner≈${kommunerApprox}, leisure cells=${leisureCells}`,
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
