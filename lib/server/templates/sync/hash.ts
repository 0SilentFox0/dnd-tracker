import { type Bundle, type BundleTableDef, pick, settingsOf } from "@/lib/server/templates/bundle";
import type { SyncState, TableHashes } from "@/lib/server/templates/sync/types";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules/registry";
import { parseRules } from "@/lib/utils/rules/schema";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";

export const MECHANIC_KEYS = Object.keys(MECHANIC_REGISTRY) as Array<keyof typeof MECHANIC_REGISTRY>;

const isDefaultCharacteristics = (v: unknown) => v == null || (typeof v === "object" && Object.keys(v).length === 0) || hashJson(v) === hashJson(DEFAULT_CHARACTERISTICS);

// units.characteristics and feats.xpCost/maxRank postdate stored baselines: an empty/default value must hash as absent
export function rowHash(row: Record<string, unknown>, t: BundleTableDef): string {
  const picked = pick(row, t.columns);

  if (t.key === "units" && isDefaultCharacteristics(picked.characteristics)) delete picked.characteristics;

  if (t.key === "feats") for (const c of ["xpCost", "maxRank"]) if (picked[c] == null) delete picked[c];

  return hashJson(picked);
}

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
