import {
  Gender,
  ImmigrationReason,
  ValueUnit,
} from "@/app/generated/prisma/enums";
import type { ImmigrationApiRow, LeisureApiRow } from "./comparison-types";

/** SSB 12063 innholdskode: antall fritidssentre i kommunen. */
export const FRITIDSSENTERE_CONTENT_CODE = "KOSfritidkomm0000";

export function immigrationPersonsAlle(
  rows: ImmigrationApiRow[],
  reason: ImmigrationReason,
): string | null {
  const hit = rows.find(
    (r) =>
      r.immigrationReason === reason &&
      r.gender === Gender.ALL &&
      r.unit === ValueUnit.PERSONS,
  );
  return hit?.value ?? null;
}

export function parseImmigrationCount(raw: string | null): number | null {
  if (raw == null) {
    return null;
  }
  const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function formatPercentNb(value: number): string {
  return new Intl.NumberFormat("nb-NO", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

export function immigrationInnvandrereYoyClause(
  currentRows: ImmigrationApiRow[],
  previousRows: ImmigrationApiRow[],
): string | null {
  const curr = parseImmigrationCount(
    immigrationPersonsAlle(currentRows, ImmigrationReason.ALL),
  );
  const prev = parseImmigrationCount(
    immigrationPersonsAlle(previousRows, ImmigrationReason.ALL),
  );
  if (curr === null || prev === null) {
    return null;
  }
  if (prev === 0) {
    if (curr === 0) {
      return null;
    }
    return `Her har antallet innvandrere økt siden i fjor (fra 0 til ${new Intl.NumberFormat("nb-NO").format(curr)})`;
  }
  const pct = ((curr - prev) / prev) * 100;
  const absPct = formatPercentNb(Math.abs(pct));
  if (pct > 0) {
    return `Her har antallet innvandrere økt med ${absPct} % siden i fjor`;
  }
  if (pct < 0) {
    return `Her har antallet innvandrere gått ned med ${absPct} % siden i fjor`;
  }
  return "Her har antallet innvandrere vært uendret siden i fjor";
}

export function fritidssenterAntall(leisure: LeisureApiRow[]): string | null {
  const row = leisure.find(
    (r) => r.contentsCode === FRITIDSSENTERE_CONTENT_CODE,
  );
  const n = row?.value == null ? "" : String(row.value).trim();
  return n === "" ? null : n;
}

export function summaryText(
  year: number,
  immigration: ImmigrationApiRow[],
  immigrationPreviousYear: ImmigrationApiRow[],
  leisure: LeisureApiRow[],
): string {
  const yoy = immigrationInnvandrereYoyClause(
    immigration,
    immigrationPreviousYear,
  );
  const n = fritidssenterAntall(leisure);
  const senterDel =
    n !== null
      ? `det finnes ${n} aktivitetssenter i denne kommunen`
      : `vi har ikke registrert antall aktivitetssentere for denne kommunen for ${year} i våre data`;
  if (yoy) {
    return `${yoy}, ${senterDel}.`;
  }
  const senterFull =
    senterDel.charAt(0).toUpperCase() + senterDel.slice(1) + ".";
  return `Tall for innvandring sammenlignet med i fjor er ikke tilgjengelig for denne kommunen. ${senterFull}`;
}
