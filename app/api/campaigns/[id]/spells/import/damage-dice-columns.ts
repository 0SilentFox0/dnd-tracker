import { leadingDice } from "@/lib/utils/common/dice";

export function damageDiceColumns(damageDice: string | undefined): { diceCount: number | null; diceType: string | null } {
  const group = damageDice ? leadingDice(damageDice) : null;

  return group ? { diceCount: group.count, diceType: `d${group.size}` } : { diceCount: null, diceType: null };
}
