import type { Prisma } from "@prisma/client";

export type ReferrerMode = "content" | "remap" | "history" | "none" | "global" | "special";

export interface Referrer {
  model: Prisma.ModelName;
  mode: ReferrerMode;
  /** Where for the campaign's rows (through a relation for child models); `remap` may narrow it (prepared battles, pending proposals). */
  scope?: (campaignId: string) => Record<string, unknown>;
  columns?: readonly string[];
  /** Per-row override of `columns` (participant `sourceId` only when it points at a unit). */
  columnsFor?: (row: Record<string, unknown>) => readonly string[];
  /** Recompute derived fields after remap: snapshotHash, href. */
  derive?: (row: Record<string, unknown>, campaignId: string) => Record<string, unknown>;
  /** SELECT ... FOR UPDATE over the `remap` rows. */
  lockSql?: (campaignId: string) => Prisma.Sql;
}
