import { AttackType, CELL_FEET } from "@/lib/constants/battle";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import { attackRollModifier } from "@/lib/utils/battle/attack/ability";
import { INSPIRATION_LABEL } from "@/lib/utils/battle/attack/inspiration";
import { attackSourceOf } from "@/lib/utils/battle/attack/source";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { rangeDisadvantageReasons } from "@/lib/utils/battle/grid/attack-reach";
import { footprintDistance } from "@/lib/utils/battle/grid/geometry";
import { cellsOf, isAdjacent, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export function calculateAttackBonus(
  attacker: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[] = [attacker],
  extra?: StaticEffect[],
): number {
  const statModifier = attackRollModifier(attacker, attack);

  const base = (attack.attackBonus || 0) + statModifier + attacker.abilities.proficiencyBonus;

  return base + collectModifiers(withSelf(participants, attacker), attacker.basicInfo.id, { stat: "attackBonus", attackKind: attackKindOf(attack.type) }, extra).flat;
}

/** Суміжна атака: на мапі — за клітинками, без мапи — ближня. */
export function isAdjacentAttack(attacker: BattleParticipant, target: BattleParticipant, attack: BattleAttack): boolean {
  return isOnMap(attacker) && isOnMap(target) ? isAdjacent(attacker, target) : attack.type === AttackType.MELEE;
}

export type RollMode = "advantage" | "disadvantage" | "normal";

export type RollModeReasons = { advantage: string[]; disadvantage: string[] };

type SourceOpts = { extra?: StaticEffect[]; targetId?: string; targetExtra?: StaticEffect[]; map?: BattleMapConfig | null; inspiration?: boolean };

const labels = (entries: { label: string }[]) => entries.map((e) => e.label);

/** Що з навичок/ефектів дає перевагу чи недолік — назви джерел. */
export function rollModeReasons(attacker: BattleParticipant, attack: BattleAttack, participants: BattleParticipant[] = [attacker], opts: SourceOpts = {}): RollModeReasons {
  const kind = attackKindOf(attack.type);

  const ps = withSelf(participants, attacker);

  const id = attacker.basicInfo.id;

  const flagEntries = (pid: string, flag: "advantage" | "disadvantage" | "advantageForAttackers" | "disadvantageForAttackers" | "proneDefense", extra?: StaticEffect[]) =>
    collectModifiers(ps, pid, { flag }, extra).entries;

  const target = opts.targetId ? findParticipant(ps, opts.targetId) : undefined;

  const senses = (viewer: BattleParticipant, other: BattleParticipant | undefined, blindOnly = false) => {
    if (!other || !isOnMap(viewer) || !isOnMap(other)) return false;

    const feet = footprintDistance(cellsOf(viewer), cellsOf(other)) * CELL_FEET;

    return collectModifiers(ps, viewer.basicInfo.id, { flag: "sense" }).flags.some((f) => f.flag === "sense" && (f.sense === "blindsight" || (!blindOnly && f.sense === "truesight")) && f.range >= feet);
  };

  const attackerSees = senses(attacker, target);

  const attackerBlindSees = senses(attacker, target, true);

  const targetSees = !!target && senses(target, attacker);

  const proneDefense = target ? labels(flagEntries(target.basicInfo.id, "proneDefense", opts.targetExtra)) : [];

  const adjacent = !!target && proneDefense.length > 0 && isAdjacentAttack(attacker, target, attack);

  const frightenedLabels = attacker.battleData.activeEffects
    .filter((e) => e.source && e.effects.some((m) => m.type === "frightened") && ps.some((p) => p.basicInfo.id === e.source?.participantId && isActive(p)))
    .map((e) => e.name);

  const advantage = [
    ...labels(flagEntries(id, "advantage", opts.extra).filter((e) => !(targetSees && e.condition === "invisible") && e.flag?.flag === "advantage" && (e.flag.attackKind === "all" || e.flag.attackKind === kind))),
    ...(opts.targetId ? labels(flagEntries(opts.targetId, "advantageForAttackers", opts.targetExtra)) : []),
    ...(adjacent ? proneDefense : []),
    ...(opts.inspiration ? [INSPIRATION_LABEL] : []),
  ];

  const disadvantage = [
    ...labels(flagEntries(id, "disadvantage", opts.extra).filter((e) => !(attackerBlindSees && e.condition === "blinded"))),
    ...(opts.targetId ? labels(flagEntries(opts.targetId, "disadvantageForAttackers", opts.targetExtra).filter((e) => !(attackerSees && e.condition === "invisible"))) : []),
    ...(adjacent ? [] : proneDefense),
    ...frightenedLabels,
    ...(target ? rangeDisadvantageReasons(opts.map, ps, attacker, attack, target) : []),
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

  const r = runAbilities(ps, { type: "attack", phase: "before", actorId: attacker.basicInfo.id, targetId: target.basicInfo.id, attackKind: attackKindOf(attack.type), ...attackSourceOf(attack) }, { round, rng: CERTAIN_ONLY });

  const self = findParticipant(r.participants, attacker.basicInfo.id) ?? attacker;

  return { ps: r.participants, self, extra: r.actionModifiers[attacker.basicInfo.id], targetExtra: r.actionModifiers[target.basicInfo.id] };
}

export type PredictedAttack = { totalBonus: number; targetAC: number; mode: RollMode; forced: boolean; reasons: RollModeReasons };

/** Прогноз влучання на клієнті — ті самі числа, що рахує сервер, з одного перегляду фази before (тригери з шансом не враховуємо). */
export function predictAttack(
  attacker: BattleParticipant,
  target: BattleParticipant,
  attack: BattleAttack,
  participants: BattleParticipant[],
  round = 1,
  map?: BattleMapConfig | null,
  opts: { inspiration?: boolean } = {},
): PredictedAttack {
  const { ps, self, extra, targetExtra } = previewBefore(attacker, target, attack, participants, round);

  const reasons = rollModeReasons(self, attack, ps, { extra, targetId: target.basicInfo.id, targetExtra, map, inspiration: opts.inspiration });

  return {
    totalBonus: calculateAttackBonus(self, attack, ps, extra),
    targetAC: statWithModifiers(ps, target.basicInfo.id, "armor", target.combatStats.armorClass, { extra: targetExtra }),
    ...forcedRollMode(reasons),
    reasons,
  };
}
