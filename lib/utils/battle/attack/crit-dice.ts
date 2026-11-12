import { parseDiceLenient, rollGroups } from "@/lib/utils/common/dice";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";

export function critDoublesDice(rules: Ruleset | undefined, isCritical: boolean): boolean {
  const ruleset = rules ?? DEFAULT_RULES;

  return ruleSystemOf(ruleset).combat.damage({ rules: ruleset, crit: isCritical }).doubleDice;
}

export function critDamageRolls(input: { formula: string; rolls: number[]; rng: () => number }): { rolls: number[]; serverRolled: number[] } {
  const groups = input.formula.trim() ? parseDiceLenient(input.formula).groups : [];

  const set = groups.reduce((sum, g) => sum + g.count, 0);

  if (set === 0 || input.rolls.length >= 2 * set) return { rolls: input.rolls, serverRolled: [] };

  const missing = 2 * set - input.rolls.length;

  const serverRolled = rollGroups(groups, input.rng).slice(0, missing);

  return { rolls: [...input.rolls, ...serverRolled], serverRolled };
}
