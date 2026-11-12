import { type Bundle, type BundleTableDef, pick, settingsOf } from "@/lib/server/templates/bundle";
import type { SyncState, TableHashes } from "@/lib/server/templates/sync/types";
import { hashJson } from "@/lib/utils/battle/store/stable-json";
import { contentRowHash } from "@/lib/utils/content/row-hash";
import { parseRules } from "@/lib/utils/rules/schema";
import { sectionsOfComposition } from "@/lib/utils/rules/section-registry";
import { composition } from "@/lib/utils/rules/systems/catalog";

export const rowHash = (row: Record<string, unknown>, t: BundleTableDef): string => contentRowHash(t.model, pick(row, t.columns));

const activeMechanicKeys = (parsed: ReturnType<typeof parseRules>): string[] =>
  Object.entries(sectionsOfComposition(composition(parsed.system)))
    .filter(([, section]) => section.mechanic)
    .map(([name]) => name);

/** Mechanic sections present in the composition of this rules JSON; keys unknown to it are neither hashed nor synced */
export const mechanicKeysOf = (rules: unknown): string[] => activeMechanicKeys(parseRules(rules));

export function rulesHashes(rules: unknown): Record<string, string> {
  const parsed = parseRules(rules);

  return Object.fromEntries(activeMechanicKeys(parsed).map((k) => [k, hashJson((parsed as Record<string, unknown>)[k])]));
}

export const settingsHash = (settings: Bundle["settings"]): string => hashJson(settingsOf(settings));

export const baselineFromBundle = (bundle: Bundle, tables: TableHashes): SyncState => ({
  tables,
  rules: rulesHashes(bundle.rules),
  settings: settingsHash(bundle.settings),
});
