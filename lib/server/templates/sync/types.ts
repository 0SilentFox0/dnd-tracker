import type { Bundle, BundleTable } from "@/lib/server/templates/bundle";
import type { SourceSyncScope, SourceSyncStatus } from "@/types/campaigns";

export type TableHashes = Partial<Record<BundleTable, Record<string, string>>>;

export type SyncState = { tables: TableHashes; rules: Record<string, string>; settings?: string };

export const IGNORED_DELETED = "deleted";

export type LocalRow = { table: BundleTable; row: Record<string, unknown> & { id: string; sourceId: string | null }; sourceHash?: string | null };

export interface SyncContext {
  campaignId: string;
  source: { id: string; name: string; kind: string };
  sourceBundle: Bundle;
  target: { settings: Bundle["settings"]; rules: unknown; credits?: string | null; rows: LocalRow[] };
  baseline: SyncState;
  ignored: SyncState;
  syncedAt: Date | null;
}

export interface SyncItem {
  scope: SourceSyncScope;
  key: string;
  localId: string | null;
  name: string;
  status: SourceSyncStatus;
  changedFields: string[];
  sourceHash: string | null;
  requires: Array<{ scope: BundleTable; key: string; name: string }>;
  visible: boolean;
  ignored: boolean;
}
