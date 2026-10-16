import { AttackType } from "@/lib/constants/battle";
import { collectModifiers, findFlags, statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
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

// Тригери з шансом < 100 % не передбачаємо — їх кидає сервер.
const CERTAIN_ONLY = () => 0.9999;

function previewBefore(attacker: BattleParticipant, target: BattleParticipant, attack: BattleAttack, participants: BattleParticipant[], round: number) {
  const ps = withSelf(withSelf(participants, target), attacker);

  const r = runAbilities(ps, { type: "attack", phase: "before", actorId: attacker.basicInfo.id, targetId: target.basicInfo.id, attackKind: attackKindOf(attack.type) }, { round, rng: CERTAIN_ONLY });

  const self = r.participants.find((p) => p.basicInfo.id === attacker.basicInfo.id) ?? attacker;

  return { ps: r.participants, self, extra: r.actionModifiers[attacker.basicInfo.id], targetExtra: r.actionModifiers[target.basicInfo.id] };
}

export type PredictedAttack = { totalBonus: number; targetAC: number; mode: "advantage" | "disadvantage" | "normal" };

/** Прогноз влучання на клієнті — ті самі числа, що рахує сервер, з одного перегляду фази before (тригери з шансом не враховуємо). */
export function predictAttack(attacker: BattleParticipant, target: BattleParticipant, attack: BattleAttack, participants: BattleParticipant[], round = 1): PredictedAttack {
  const { ps, self, extra, targetExtra } = previewBefore(attacker, target, attack, participants, round);

  const opts = { targetId: target.basicInfo.id, targetExtra };

  const adv = hasAdvantage(self, attack, ps, extra, opts);

  const dis = hasDisadvantage(self, attack, ps, { ...opts, extra });

  return {
    totalBonus: calculateAttackBonus(self, attack, ps, extra),
    targetAC: statWithModifiers(ps, target.basicInfo.id, "armor", target.combatStats.armorClass, { extra: targetExtra }),
    mode: adv === dis ? "normal" : adv ? "advantage" : "disadvantage",
  };
}
