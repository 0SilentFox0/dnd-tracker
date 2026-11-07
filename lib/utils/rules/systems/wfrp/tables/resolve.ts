import { DEFAULT_TABLES, type ResolvedRow } from "./defaults";
import { rollTable } from "./roll-table";

import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { TableSlot } from "@/lib/utils/rules/tables-schema";

export function resolveTable(rules: Pick<Ruleset, "tables">, slot: TableSlot): readonly ResolvedRow[] {
  return rules.tables[slot] ?? DEFAULT_TABLES[slot];
}

export function rollSlot(rules: Pick<Ruleset, "tables">, slot: TableSlot, rng: Rng, preset?: number): { index: number; row: ResolvedRow; roll: number } {
  return rollTable(resolveTable(rules, slot), rng, preset);
}
