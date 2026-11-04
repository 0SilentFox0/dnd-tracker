export type Direction = "asc" | "desc";

/**
 * Matches Postgres `en_US.UTF-8` ordering for names: case-insensitive first, lowercase first on ties,
 * spaces and punctuation ignored, Latin before Cyrillic. Verified against a real database in
 * content-layer.integration.test.ts; exotic punctuation-only differences are not reproduced.
 */
const collator = new Intl.Collator("en", { ignorePunctuation: true });

export const orderKeys = (orderBy: unknown): Array<[string, Direction]> =>
  (Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : []).flatMap((o: Record<string, unknown>) => Object.entries(o).map(([k, v]) => [k, v as Direction] as [string, Direction]));

export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;

  if (a == null) return 1;

  if (b == null) return -1;

  if (typeof a === "string" && typeof b === "string") return collator.compare(a, b);

  return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0;
}

export function sortRows<T extends Record<string, unknown>>(rows: T[], orderBy: unknown): T[] {
  const keys = orderKeys(orderBy);

  if (!keys.length) return rows;

  return [...rows].sort((x, y) => {
    for (const [key, dir] of keys) {
      const c = compareValues(x[key], y[key]);

      if (c !== 0) return dir === "desc" ? -c : c;
    }

    return 0;
  });
}
