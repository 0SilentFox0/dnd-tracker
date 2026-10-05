import { BattleRuleError } from "@/lib/utils/battle/store";
import { maxRoll, parseDice } from "@/lib/utils/common/dice";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

function invalid(message: string): never {
  throw new BattleRuleError("invalid_dice", message);
}

export function assertRollsWithinFormula(formula: string, rolls: number[], maxCount: number): void {
  const parsed = parseDice(formula);

  const largest = parsed ? Math.max(0, ...parsed.groups.map((g) => g.size)) : 0;

  if (rolls.length > maxCount) invalid(`Забагато кидків: ${rolls.length} (максимум ${maxCount})`);

  for (const roll of rolls) {
    if (!Number.isInteger(roll) || roll < 1 || roll > largest) invalid(`Кидок ${roll} неможливий для ${formula}`);
  }
}

function diceCount(formula: string): number {
  return parseDice(formula)?.groups.reduce((sum, g) => sum + g.count, 0) ?? 0;
}

export function assertAttackRolls(attack: Pick<BattleAttack, "damageDice">, body: { damageRolls: number[]; targetCount: number }): void {
  const formula = attack.damageDice ?? "";

  assertRollsWithinFormula(formula, body.damageRolls, diceCount(formula) * Math.max(1, body.targetCount) * 2);
}

export function assertSpellRolls(spell: { diceCount: number | null; diceType: string | null }, rolls: number[], targetCount: number): void {
  if (!spell.diceCount || !spell.diceType) {
    if (rolls.length > 0) invalid("Заклинання не має кубиків шкоди");

    return;
  }

  const die = spell.diceType.startsWith("d") ? spell.diceType : `d${spell.diceType}`;

  assertRollsWithinFormula(`${spell.diceCount}${die}`, rolls, spell.diceCount * Math.max(1, targetCount) * 2);
}

export function assertReactionDamage(defender: BattleParticipant, value: number | undefined): void {
  if (value === undefined) return;

  const best = Math.max(0, ...defender.battleData.attacks.map((a) => maxRoll(a.damageDice ?? "")));

  if (!Number.isInteger(value) || value < 0 || value > best * 2) invalid(`Шкода реакції ${value} неможлива`);
}
