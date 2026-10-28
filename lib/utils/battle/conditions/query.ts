import { exhaustionEffects } from "./registry";

import { DEFAULT_RULES_EDITION } from "@/lib/constants/rules";
import { findParticipant, replaceParticipant, withActiveEffects } from "@/lib/utils/abilities/engine/core/participants";
import { type Condition5eKey, isCondition5eKey } from "@/lib/utils/abilities/schema/kinds";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export const MAX_EXHAUSTION = 6;

const carries = (e: ActiveEffect, key: string) => e.effects.some((m) => m.type === key);

export function hasCondition(p: BattleParticipant, key: Condition5eKey): boolean {
  return hasEffectMarker(p, key);
}

export function conditionSourceIds(p: BattleParticipant, key: Condition5eKey): string[] {
  return p.battleData.activeEffects.flatMap((e) => (e.source && carries(e, key) ? [e.source.participantId] : []));
}

export function exhaustionLevel(p: BattleParticipant): number {
  const sum = p.battleData.activeEffects.reduce((acc, e) => acc + e.effects.filter((m) => m.type === "exhaustion").reduce((a, m) => a + m.value, 0), 0);

  return Math.min(MAX_EXHAUSTION, sum);
}

export function restoreExhaustionHp(p: BattleParticipant, removed: ActiveEffect[]): BattleParticipant {
  const back = removed.reduce((acc, e) => acc + (e.exhaustionHpHalved ?? 0), 0);

  if (back <= 0) return p;

  return { ...p, combatStats: { ...p.combatStats, maxHp: p.combatStats.maxHp + back } };
}

export function syncExhaustion(p: BattleParticipant): BattleParticipant {
  const stacks = p.battleData.activeEffects.filter((e) => carries(e, "exhaustion"));

  if (!stacks.length) return p;

  const variant = stacks.find((e) => e.exhaustionVariant)?.exhaustionVariant ?? DEFAULT_RULES_EDITION;

  const derived = exhaustionEffects(exhaustionLevel(p), variant);

  const oldest = stacks[0];

  return withActiveEffects(p, (list) =>
    list.map((e) => {
      if (!stacks.includes(e)) return e;

      const { abilityEffects: _drop, ...rest } = e;

      return e === oldest && derived.length ? { ...rest, abilityEffects: derived } : rest;
    }),
  );
}

export function removeEffects(p: BattleParticipant, pred: (e: ActiveEffect) => boolean): { participant: BattleParticipant; removed: ActiveEffect[] } {
  const removed = p.battleData.activeEffects.filter(pred);

  if (!removed.length) return { participant: p, removed };

  const stripped = withActiveEffects(p, (list) => list.filter((e) => !pred(e)));

  return { participant: removed.some((e) => carries(e, "exhaustion")) ? syncExhaustion(restoreExhaustionHp(stripped, removed)) : stripped, removed };
}

const isCondition5eEffect = (e: ActiveEffect) => e.type === "condition" && isCondition5eKey(e.effects[0]?.type);

/** Ефекти-стани 5e: перший маркер ефекту — власний ключ стану (решта — наслідки через implies). */
export function conditionEffects(p: BattleParticipant): { key: Condition5eKey; effect: ActiveEffect }[] {
  return p.battleData.activeEffects.flatMap((effect) => (isCondition5eEffect(effect) ? [{ key: effect.effects[0].type as Condition5eKey, effect }] : []));
}

export function hasAnyCondition5e(p: BattleParticipant): boolean {
  return p.battleData.activeEffects.some(isCondition5eEffect);
}

export function removeCondition5e(ps: BattleParticipant[], id: string, key: Condition5eKey): { participants: BattleParticipant[]; removed: ActiveEffect[] } {
  const target = findParticipant(ps, id);

  if (!target) return { participants: ps, removed: [] };

  const own = new Set(conditionEffects(target).filter((c) => c.key === key).map((c) => c.effect));

  const { participant, removed } = removeEffects(target, (e) => own.has(e));

  return { participants: removed.length ? replaceParticipant(ps, participant) : ps, removed };
}
