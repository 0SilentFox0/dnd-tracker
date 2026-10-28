import { type Bundle, type BundleTableDef, pick, settingsOf } from "@/lib/server/templates/bundle";
import type { SyncState, TableHashes } from "@/lib/server/templates/sync/types";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules/registry";
import { parseRules } from "@/lib/utils/rules/schema";

export const MECHANIC_KEYS = Object.keys(MECHANIC_REGISTRY) as Array<keyof typeof MECHANIC_REGISTRY>;

export const rowHash = (row: Record<string, unknown>, t: BundleTableDef): string => hashJson(pick(row, t.columns));

export function rulesHashes(rules: unknown): Record<string, string> {
  const parsed = parseRules(rules);

  return Object.fromEntries(MECHANIC_KEYS.map((k) => [k, hashJson(parsed[k])]));
}

export const settingsHash = (settings: Bundle["settings"]): string => hashJson(settingsOf(settings));

export const baselineFromBundle = (bundle: Bundle, tables: TableHashes): SyncState => ({
  tables,
  rules: rulesHashes(bundle.rules),
  settings: settingsHash(bundle.settings),
});
