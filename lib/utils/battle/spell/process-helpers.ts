import { leadingDice, rollDiceList } from "@/lib/utils/common/dice";

export function getDiceSize(diceType: string | null | undefined): number {
  return leadingDice(diceType ?? "")?.size ?? 6;
}

export function generateSpellDamageRolls(
  diceCount: number,
  diceType: string | null | undefined,
): number[] {
  return diceCount > 0 ? rollDiceList(`${diceCount}d${getDiceSize(diceType)}`) : [];
}
