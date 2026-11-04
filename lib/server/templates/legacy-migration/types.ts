import type { Prisma } from "@prisma/client";

import type { BundleTable } from "@/lib/server/templates/bundle";
import type { IneligibleReason } from "@/lib/server/templates/legacy-migration/eligibility";
import type { SyncItem, SyncState } from "@/lib/server/templates/sync/types";

export type ReferrerMode = "content" | "remap" | "history" | "none" | "global" | "special";

export interface Referrer {
  model: Prisma.ModelName;
  mode: ReferrerMode;
  /** Where for the campaign's rows (through a relation for child models); `remap` may narrow it (prepared battles, pending proposals). */
  scope?: (campaignId: string) => Record<string, unknown>;
  columns?: readonly string[];
  /** Primary-key column when it is not `id`. */
  pk?: string;
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

export interface MigrationInput extends PlanInput {
  sourceId: string;
  version: number;
  referrers: Array<{ r: Referrer; rows: Row[] }>;
  legacyItems: SyncItem[];
  pendingRulesSettings: number;
  syncStateFallback: boolean;
  sourceSync: Row | null;
  droppedNotifications?: Row[];
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

export type LegacyMigrationErrorCode = "ID_COLLISION" | "VERIFY_MISMATCH" | "RESIDUAL_REFS";

export class LegacyMigrationError extends Error {
  constructor(readonly code: LegacyMigrationErrorCode, readonly details?: unknown) {
    super(code);
    this.name = "LegacyMigrationError";
  }
}

export interface PreImageCell { model: string; pk: Record<string, unknown>; column: string; before: unknown; after: unknown }

export interface PreImage {
  campaignId: string;
  createdAt: string;
  campaign: { baseSourceId: null; baseVersion: null; contentVersion: number };
  sourceSync: Row | null;
  stored: Record<BundleTable, Row[]>;
  referrerCells: PreImageCell[];
  plan: { idMap: Array<[string, string]>; hides: MigrationPlan["hides"] };
  droppedNotifications?: Row[];
  postContentVersion: number;
}

export interface TableReport {
  stored: number;
  baseRef: number;
  override: { updated: number; conflict: number; own: number; orphan: number };
  local: number;
  hide: number;
  hidePending: number;
}

export interface ReferrerReport { model: string; rows: number; changedRows: number; cells: Record<string, number> }

export interface MigrationReport {
  campaignId: string;
  name: string | null;
  sourceId: string | null;
  version: number | null;
  status: "eligible" | "migrated" | IneligibleReason;
  detail?: string;
  tables: Partial<Record<BundleTable, TableReport>>;
  referrers: ReferrerReport[];
  blockers: MigrationPlan["blockers"];
  warnings: Array<{ code: string; table?: BundleTable; id?: string; count?: number }>;
  residuals?: { composite: Array<{ model: string; count: number }>; history: Array<{ model: string; count: number }> };
}
