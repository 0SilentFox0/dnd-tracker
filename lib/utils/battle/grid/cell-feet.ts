import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems/registry";

const FEET_PER_YARD = 3;

export function cellFeetOf(rules: Pick<Ruleset, "system">): number {
  const { unit, perCell } = ruleSystemOf(rules).distance;

  return unit === "yd" ? perCell * FEET_PER_YARD : perCell;
}
