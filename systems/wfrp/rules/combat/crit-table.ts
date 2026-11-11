import type { WfrpConditionKey } from "../conditions/catalog";
import { rollSlot, rowText } from "../tables/resolve";
import type { HitLocation } from "./constants";

import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { TableSlot } from "@/lib/utils/rules/tables-schema";
import type { LogLine } from "@/types/text";

export interface CritResult {
  id: string;
  text: LogLine;
  bonusDamage: number;
  conditions: { key: WfrpConditionKey; levels: number }[];
  markers: string[];
}

const SLOT: Record<HitLocation, TableSlot> = { head: "critHead", arm: "critArm", body: "critBody", leg: "critLeg" };

export function rollCrit(location: HitLocation, rules: Pick<Ruleset, "tables">, rng: Rng, presetRoll?: number): CritResult {
  const { index, row } = rollSlot(rules, SLOT[location], rng, presetRoll);

  const result: CritResult = { id: `${location}.${index + 1}`, text: rowText(row), bonusDamage: 0, conditions: [], markers: [] };

  for (const e of row.effects) {
    if (e.type === "damage") result.bonusDamage += e.amount;
    else if (e.type === "condition") result.conditions.push({ key: e.key, levels: e.levels });
    else if (e.type === "marker") result.markers.push(e.key);
  }

  return result;
}
