import { AttackType } from "@/lib/constants/battle";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
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

export type RollMode = "advantage" | "disadvantage" | "normal";

export type RollModeReasons = { advantage: string[]; disadvantage: string[] };

type SourceOpts = { extra?: StaticEffect[]; targetId?: string; targetExtra?: StaticEffect[] };

const labels = (entries: { label: string }[]) => entries.map((e) => e.label);

/** Що з навичок/ефектів дає перевагу чи недолік — назви джерел. */
export function rollModeReasons(attacker: BattleParticipant, attack: BattleAttack, participants: BattleParticipant[] = [attacker], opts: SourceOpts = {}): RollModeReasons {
  const kind = attackKindOf(attack.type);

  const ps = withSelf(participants, attacker);

  const id = attacker.basicInfo.id;

  const flagEntries = (pid: string, flag: "advantage" | "disadvantage" | "advantageForAttackers" | "disadvantageForAttackers", extra?: StaticEffect[]) =>
    collectModifiers(ps, pid, { flag }, extra).entries;

  const advantage = [
    ...(attacker.abilities.race?.toLowerCase().includes("elf") && kind === AttackType.RANGED ? ["Ельфійське око"] : []),
    ...labels(flagEntries(id, "advantage", opts.extra).filter((e) => e.flag?.flag === "advantage" && (e.flag.attackKind === "all" || e.flag.attackKind === kind))),
    ...(opts.targetId ? labels(flagEntries(opts.targetId, "advantageForAttackers", opts.targetExtra)) : []),
  ];

  const disadvantage = [
    ...labels(flagEntries(id, "disadvantage", opts.extra)),
    ...(opts.targetId ? labels(flagEntries(opts.targetId, "disadvantageForAttackers", opts.targetExtra)) : []),
  ];

  return { advantage: [...new Set(advantage)], disadvantage: [...new Set(disadvantage)] };
}

/** Режим кидка з навичок; forced — якщо хоч одне джерело є (взаємне скасування теж вирішене навичками). */
export function forcedRollMode(r: RollModeReasons): { mode: RollMode; forced: boolean } {
  const adv = r.advantage.length > 0;

  const dis = r.disadvantage.length > 0;

  return { mode: adv === dis ? "normal" : adv ? "advantage" : "disadvantage", forced: adv || dis };
}

export function hasAdvantage(
  attacker: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  extra?: StaticEffect[],
  opts: { targetId?: string; targetExtra?: StaticEffect[] } = {},
): boolean {
  return rollModeReasons(attacker, attack, participants, { ...opts, extra }).advantage.length > 0;
}

export function hasDisadvantage(
  attacker: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  opts: SourceOpts = {},
): boolean {
  return rollModeReasons(attacker, attack, participants, opts).disadvantage.length > 0;
}

// Тригери з шансом < 100 % не передбачаємо — їх кидає сервер.
const CERTAIN_ONLY = () => 0.9999;

function previewBefore(attacker: BattleParticipant, target: BattleParticipant, attack: BattleAttack, participants: BattleParticipant[], round: number) {
  const ps = withSelf(withSelf(participants, target), attacker);

  const r = runAbilities(ps, { type: "attack", phase: "before", actorId: attacker.basicInfo.id, targetId: target.basicInfo.id, attackKind: attackKindOf(attack.type) }, { round, rng: CERTAIN_ONLY });

  const self = r.participants.find((p) => p.basicInfo.id === attacker.basicInfo.id) ?? attacker;

  return { ps: r.participants, self, extra: r.actionModifiers[attacker.basicInfo.id], targetExtra: r.actionModifiers[target.basicInfo.id] };
}

export type PredictedAttack = { totalBonus: number; targetAC: number; mode: RollMode; forced: boolean; reasons: RollModeReasons };

/** Прогноз влучання на клієнті — ті самі числа, що рахує сервер, з одного перегляду фази before (тригери з шансом не враховуємо). */
export function predictAttack(attacker: BattleParticipant, target: BattleParticipant, attack: BattleAttack, participants: BattleParticipant[], round = 1): PredictedAttack {
  const { ps, self, extra, targetExtra } = previewBefore(attacker, target, attack, participants, round);

  const reasons = rollModeReasons(self, attack, ps, { extra, targetId: target.basicInfo.id, targetExtra });

  return {
    totalBonus: calculateAttackBonus(self, attack, ps, extra),
    targetAC: statWithModifiers(ps, target.basicInfo.id, "armor", target.combatStats.armorClass, { extra: targetExtra }),
    ...forcedRollMode(reasons),
    reasons,
  };
}
