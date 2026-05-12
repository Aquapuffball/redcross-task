/**
 * Normaliserer kommunenummer fra kildedata der feltet allerede er kun siffer (SSB/CSV).
 */
export function normalizeKommuneCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid kommune code: "${raw}"`);
  }
  return trimmed.padStart(4, "0");
}

/**
 * Utleder kanonisk kommunenummer (nøyaktig fire siffer) fra en lagret `code`-streng.
 * Fjerner alt som ikke er siffer; ugyldig hvis det ikke finnes 1–4 siffer.
 */
export function canonicalKommuneCodeFromStored(value: string): string | null {
  const digits = value.trim().replace(/\D/g, "");
  if (!/^\d{1,4}$/.test(digits)) {
    return null;
  }
  return digits.padStart(4, "0");
}

/** Sant når `code` allerede er eksakt fire siffer (kanonisk form). */
export function isCanonicalKommuneCode(code: string): boolean {
  return /^[0-9]{4}$/.test(code);
}

/**
 * Mangler brukbar kommunenavn: tomt, identisk med rå kode, eller kun siffer som matcher kommunenummeret.
 */
export function lacksKommuneNavn(name: string, code: string): boolean {
  const label = name.trim();
  if (!label) {
    return true;
  }
  const canonical = canonicalKommuneCodeFromStored(code);
  if (!canonical) {
    return true;
  }
  if (label === code) {
    return true;
  }
  if (/^\d+$/.test(label)) {
    const nameAsCode = canonicalKommuneCodeFromStored(label);
    if (nameAsCode === canonical) {
      return true;
    }
  }
  return false;
}
