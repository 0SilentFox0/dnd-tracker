import { BattleRuleError } from "@/lib/utils/battle/store";
import { diceCount, parseDice } from "@/lib/utils/common/dice";

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

/** formula — те, що реально кидає клієнт (для героя — зброя плюс кубики рівня). */
export function assertAttackRolls(formula: string, body: { damageRolls: number[]; targetCount: number }): void {
  assertRollsWithinFormula(formula, body.damageRolls, diceCount(formula) * Math.max(1, body.targetCount) * 2);
}

/** Гравець кидає рівно кубики формули заклинання для свого касту: кількість і грані мусять збігатися. */
export function assertSpellRolls(expected: { count: number; sides: number }, rolls: number[]): void {
  if (rolls.length !== expected.count) invalid(`Потрібно ${expected.count} кубиків заклинання, отримано ${rolls.length}`);

  for (const roll of rolls) {
    if (!Number.isInteger(roll) || roll < 1 || roll > expected.sides) invalid(`Кидок ${roll} неможливий для d${expected.sides}`);
  }
}
