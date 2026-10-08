import { AttackType } from "@/lib/constants/battle";
import { collectModifiers, findFlags, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export function calculateAttackBonus(
  attacker: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  extra?: StaticEffect[],
): number {
  const statModifier = getAttackAbilityModifier(attacker.abilities, attack.type);

  const base = (attack.attackBonus || 0) + statModifier + attacker.abilities.proficiencyBonus;

  return base + collectModifiers(withSelf(participants, attacker), attacker.basicInfo.id, { stat: "attackBonus", attackKind: attackKindOf(attack.type) }, extra).flat;
}

export function hasAdvantage(
  attacker: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  extra?: StaticEffect[],
  opts: { targetId?: string; targetExtra?: StaticEffect[] } = {},
): boolean {
  const kind = attackKindOf(attack.type);

  if (attacker.abilities.race?.toLowerCase().includes("elf") && kind === AttackType.RANGED) return true;

  const ps = withSelf(participants, attacker);

  if (findFlags(ps, attacker.basicInfo.id, "advantage", extra).some((f) => f.attackKind === "all" || f.attackKind === kind)) return true;

  return !!opts.targetId && findFlags(ps, opts.targetId, "advantageForAttackers", opts.targetExtra).length > 0;
}

export function hasDisadvantage(
  attacker: BattleParticipant,
  _attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  opts: { extra?: StaticEffect[]; targetId?: string; targetExtra?: StaticEffect[] } = {},
): boolean {

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

export function predictRollMode(attacker: BattleParticipant, target: BattleParticipant, attack: BattleAttack, participants: BattleParticipant[]): "advantage" | "disadvantage" | "normal" {
  const ps = withSelf(withSelf(participants, target), attacker);

  const adv = hasAdvantage(attacker, attack, ps, undefined, { targetId: target.basicInfo.id });

  const dis = hasDisadvantage(attacker, attack, ps, { targetId: target.basicInfo.id });

  return adv === dis ? "normal" : adv ? "advantage" : "disadvantage";
}
