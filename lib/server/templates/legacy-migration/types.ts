import type { Prisma } from "@prisma/client";

import type { BundleTable } from "@/lib/server/templates/bundle";
import type { SyncState } from "@/lib/server/templates/sync/types";

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

export type Row = Record<string, unknown> & { id: string };

export type OverrideReason = "dmEdited" | "templateChanged" | "both" | "noBaseline" | "orphan";

export type RowDecision =
  | { kind: "baseRef"; table: BundleTable; localId: string; key: string }
  | { kind: "override"; table: BundleTable; localId: string; key: string; sourceHash: string; reason: OverrideReason }
  | { kind: "local"; table: BundleTable; localId: string; demoted?: "duplicate" | "badSourceId" }
  | { kind: "hide"; table: BundleTable; key: string; pending: boolean };

export interface PlanInput {
  campaignId: string;
  stored: Record<BundleTable, Row[]>;
  base: Record<BundleTable, Map<string, Row>>;
  baseline: SyncState["tables"];
  ignored: SyncState;
}

export interface MigrationPlan {
  idMap: Map<string, string>;
  decisions: RowDecision[];
  rows: Record<BundleTable, Row[]>;
  hides: Array<{ table: string; id: string }>;
  ignored: SyncState;
  blockers: Array<{ code: "ID_COLLISION"; table: BundleTable; id: string }>;
  warnings: Array<{ code: "DUPLICATE_SOURCE_ID" | "BAD_SOURCE_ID"; table: BundleTable; id: string }>;
}
