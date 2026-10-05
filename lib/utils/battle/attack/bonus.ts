/**
 * Бонус до атаки, Advantage, Disadvantage
 */

import { AttackType } from "@/lib/constants/battle";
import { collectModifiers, findFlags, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

function attackKindOf(attack: BattleAttack): "melee" | "ranged" {
  return attack.type === AttackType.RANGED ? "ranged" : "melee";
}

export function calculateAttackBonus(
  attacker: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  extra?: StaticEffect[],
): number {
  const statModifier =
    attack.type === AttackType.MELEE ? attacker.abilities.modifiers.strength : attacker.abilities.modifiers.dexterity;

  const base = (attack.attackBonus || 0) + statModifier + attacker.abilities.proficiencyBonus;

  return base + collectModifiers(withSelf(participants, attacker), attacker.basicInfo.id, { stat: "attackBonus", attackKind: attackKindOf(attack) }, extra).flat;
}

export function hasAdvantage(
  attacker: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  extra?: StaticEffect[],
): boolean {
  const kind = attackKindOf(attack);

  if (attacker.abilities.race?.toLowerCase().includes("elf") && kind === "ranged") return true;

  return findFlags(withSelf(participants, attacker), attacker.basicInfo.id, "advantage", extra).some(
    (f) => f.attackKind === "all" || f.attackKind === kind,
  );
}

export function hasDisadvantage(
  attacker: BattleParticipant,
  _attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  opts: { extra?: StaticEffect[]; targetId?: string; targetExtra?: StaticEffect[] } = {},
): boolean {
  void _attack;

  const ps = withSelf(participants, attacker);

  if (findFlags(ps, attacker.basicInfo.id, "disadvantage", opts.extra).length > 0) return true;

  return !!opts.targetId && findFlags(ps, opts.targetId, "disadvantageForAttackers", opts.targetExtra).length > 0;
}

/** Числа для прогнозу влучання на клієнті — ті самі, що рахує сервер (без модифікаторів фази before). */
export function predictAttackNumbers(
  attacker: BattleParticipant,
  target: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[],
): { totalBonus: number; targetAC: number } {
  const ps = withSelf(withSelf(participants, target), attacker);

  return {
    totalBonus: calculateAttackBonus(attacker, attack, ps),
    targetAC: statWithModifiers(ps, target.basicInfo.id, "armor", target.combatStats.armorClass),
  };
}
