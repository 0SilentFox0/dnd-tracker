import type { WfrpConditionKey } from "../conditions/catalog";
import { rollSlot } from "../tables/resolve";
import type { HitLocation } from "./constants";

import { dynamicTextRef } from "@/lib/i18n/text-ref";
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

  const n = index + 1;

  const result: CritResult = { id: `${location}.${n}`, text: "", bonusDamage: 0, conditions: [], markers: [] };

  result.text = row.textKey ? dynamicTextRef(row.textKey) : (row.text ?? "");

  for (const e of row.effects) {
    if (e.type === "damage") result.bonusDamage += e.amount;
    else if (e.type === "condition") result.conditions.push({ key: e.key, levels: e.levels });
    else if (e.type === "marker") result.markers.push(e.key);
  }

  return result;
}
