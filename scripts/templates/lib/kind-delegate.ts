import { MATCH_COLUMN } from "./row-columns";

import { type BundleTableDef, tableOfKind } from "@/lib/server/templates/bundle";
import type { PackKind } from "@/lib/utils/templates/manifest";

export type Row = Record<string, unknown> & { id: string };

export interface Delegate {
  findFirst(args: unknown): Promise<Row | null>;
  findMany(args: unknown): Promise<Row[]>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<unknown>;
}

export const delegateFor = (db: unknown, kind: PackKind): { table: BundleTableDef; delegate: Delegate } => {
  const table = tableOfKind(kind);

  if (!table) throw new Error(`No table is registered for kind "${kind}"`);

  return { table, delegate: (db as Record<string, Delegate>)[table.delegate] };
};

/** Select for id, slug and the column rowLabel reads. */
export const labelSelect = (kind: PackKind): Record<string, true> => ({ id: true, slug: true, [MATCH_COLUMN[kind] ?? "name"]: true });

export const rowLabel = (row: Record<string, unknown>, fallback: unknown): string => String(row.name ?? row.title ?? row.race ?? fallback);
