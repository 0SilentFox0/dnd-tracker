import { BUNDLE_TABLES, type BundleTable } from "@/lib/server/templates/bundle";
import type { LocalRow, SyncContext } from "@/lib/server/templates/sync/types";

type SourceEntry = { table: BundleTable; row: Record<string, unknown> & { id: string } };

export interface SyncIndex {
  rowsByTable: Map<BundleTable, LocalRow["row"][]>;
  sourceToLocal: Map<string, string>;
  localToSource: Map<string, string>;
  sourceIds: Set<string>;
  sourceIndex: Map<string, SourceEntry>;
  localById: Map<string, LocalRow>;
}

const cache = new WeakMap<SyncContext, SyncIndex>();

function build(ctx: SyncContext): SyncIndex {
  const rowsByTable = new Map<BundleTable, LocalRow["row"][]>(BUNDLE_TABLES.map((t) => [t.key, []]));

  const sourceToLocal = new Map<string, string>();

  const localToSource = new Map<string, string>();

  const localById = new Map<string, LocalRow>();

  for (const r of ctx.target.rows) {
    rowsByTable.get(r.table)!.push(r.row);
    localById.set(r.row.id, r);

    if (r.row.sourceId) {
      sourceToLocal.set(r.row.sourceId, r.row.id);
      localToSource.set(r.row.id, r.row.sourceId);
    }
  }

  const sourceIndex = new Map<string, SourceEntry>();

  for (const t of BUNDLE_TABLES) for (const row of ctx.sourceBundle[t.key]) sourceIndex.set(row.id, { table: t.key, row });

  return { rowsByTable, sourceToLocal, localToSource, sourceIds: new Set(sourceIndex.keys()), sourceIndex, localById };
}

export function indexOf(ctx: SyncContext): SyncIndex {
  let index = cache.get(ctx);

  if (!index) cache.set(ctx, (index = build(ctx)));

  return index;
}
