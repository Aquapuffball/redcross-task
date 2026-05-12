/**
 * `pg` / `pg-connection-string` warns when `sslmode` is `prefer`, `require`, or
 * `verify-ca` without an explicit choice, because future `pg` will align with
 * libpq semantics for those modes. Setting `sslmode=verify-full` keeps today’s
 * strict verification and removes the warning.
 *
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizeDatabaseUrlForPg(url: string): string {
  const trimmed = url.trim();
  if (
    !trimmed.startsWith("postgres://") &&
    !trimmed.startsWith("postgresql://")
  ) {
    return trimmed;
  }
  try {
    const u = new URL(trimmed);
    if (u.searchParams.get("uselibpqcompat") === "true") {
      return trimmed;
    }
    const mode = u.searchParams.get("sslmode")?.toLowerCase();
    if (
      mode === "prefer" ||
      mode === "require" ||
      mode === "verify-ca"
    ) {
      u.searchParams.set("sslmode", "verify-full");
      return u.toString();
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}
