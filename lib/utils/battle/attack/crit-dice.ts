import { parseDiceLenient, rollGroups } from "@/lib/utils/common/dice";
import type { Ruleset } from "@/lib/utils/rules/schema";

export const critDoublesDice = (rules: Ruleset | undefined, isCritical: boolean): boolean => !!rules?.criticals.doubleDice && isCritical;

export function critDamageRolls(input: { formula: string; rolls: number[]; rng: () => number }): { rolls: number[]; serverRolled: number[] } {
  const groups = input.formula.trim() ? parseDiceLenient(input.formula).groups : [];

  const set = groups.reduce((sum, g) => sum + g.count, 0);

  if (set === 0 || input.rolls.length >= 2 * set) return { rolls: input.rolls, serverRolled: [] };

  const missing = 2 * set - input.rolls.length;

  const serverRolled = rollGroups(groups, input.rng).slice(0, missing);

  return { rolls: [...input.rolls, ...serverRolled], serverRolled };
}
