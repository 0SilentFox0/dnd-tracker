import { BattleRuleError } from "@/lib/utils/battle/store";
import { parseDice } from "@/lib/utils/common/dice";

function invalid(message: string): never {
  throw new BattleRuleError("invalid_dice", message);
}

/** Невідомий запис кубиків (вільний текст у формі юніта) не перевіряється — клієнт кидає його по-своєму. */
export function assertRollsWithinFormula(formula: string, rolls: number[], maxCount: number): void {
  const parsed = parseDice(formula);

  if (!parsed || parsed.groups.length === 0) return;

  const largest = Math.max(...parsed.groups.map((g) => g.size));

  if (rolls.length > maxCount) invalid(`Забагато кидків: ${rolls.length} (максимум ${maxCount})`);

  for (const roll of rolls) {
    if (!Number.isInteger(roll) || roll < 1 || roll > largest) invalid(`Кидок ${roll} неможливий для ${formula}`);
  }
}

function diceCount(formula: string): number {
  return parseDice(formula)?.groups.reduce((sum, g) => sum + g.count, 0) ?? 0;
}

/** formula — те, що реально кидає клієнт (для героя — зброя плюс кубики рівня). */
export function assertAttackRolls(formula: string, body: { damageRolls: number[]; targetCount: number }): void {
  assertRollsWithinFormula(formula, body.damageRolls, diceCount(formula) * Math.max(1, body.targetCount) * 2);
}

export function assertSpellRolls(
  spell: { diceCount: number | null; diceType: string | null },
  rolls: number[],
  targetCount: number,
): void {
  if (!spell.diceCount || !spell.diceType) return;

  const die = spell.diceType.startsWith("d") ? spell.diceType : `d${spell.diceType}`;

  assertRollsWithinFormula(`${spell.diceCount}${die}`, rolls, spell.diceCount * Math.max(1, targetCount) * 2);
}

