import { BUNDLE_TABLES, delegateOf, type TemplateDb, TemplateLeakError } from "./bundle";
import { CONTENT_ID_RE } from "./ids";
import { collectKeysAndStrings } from "./remap-ids";

export async function findForeignContentIds(tx: TemplateDb, candidates: ReadonlySet<string>, ownIds: ReadonlySet<string>): Promise<string[]> {
  const ids = [...candidates].filter((s) => CONTENT_ID_RE.test(s) && !ownIds.has(s));

  if (ids.length === 0) return [];

  const found = new Set<string>();

  for (const t of BUNDLE_TABLES) {
    const rows = await delegateOf(tx, t).findMany({ where: { id: { in: ids } }, select: { id: true } });

    rows.forEach((r) => found.add(r.id as string));
  }

  return [...found];
}

export function assertNoLeak(rows: Iterable<unknown>, sourceIds: ReadonlySet<string>): void {
  const seen = new Set<string>();

  for (const row of rows) collectKeysAndStrings(row, seen);

  const leaked = [...sourceIds].filter((id) => seen.has(id));

  if (leaked.length > 0) throw new TemplateLeakError(`Template contains source campaign ids: ${leaked.slice(0, 5).join(", ")}`);
}
