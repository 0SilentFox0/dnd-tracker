import type { SyncState } from "@/lib/server/templates/sync/types";
import type { SourceSyncScope } from "@/types/campaigns";

export const emptyState = (): SyncState => ({ tables: {}, rules: {} });

export const cloneState = (s: SyncState): SyncState => ({ tables: structuredClone(s.tables), rules: { ...s.rules }, settings: s.settings });

export function getEntry(state: SyncState, scope: SourceSyncScope, key: string): string | undefined {
  if (scope === "rules") return state.rules[key];

  if (scope === "settings") return state.settings;

  return state.tables[scope]?.[key];
}

export function setEntry(state: SyncState, scope: SourceSyncScope, key: string, value: string | undefined) {
  if (scope === "settings") {
    state.settings = value;

    return;
  }

  const map = scope === "rules" ? state.rules : (state.tables[scope] ??= {});

  if (value === undefined) delete map[key];
  else map[key] = value;
}
