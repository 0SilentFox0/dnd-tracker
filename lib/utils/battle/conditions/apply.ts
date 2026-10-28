import { releaseGrapples } from "./grapple-links";
import { exhaustionLevel, hasCondition, MAX_EXHAUSTION, removeEffects, syncExhaustion } from "./query";
import { CONDITION_5E_REGISTRY, type Condition5eKey, conditionEffectInput } from "./registry";

import type { AbilityKey } from "@/lib/constants/abilities";
import { CombatStatus } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, updateParticipant, withActiveEffects } from "@/lib/utils/abilities/engine/core/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { DODGE_KEY_PREFIX } from "@/lib/utils/battle/actions/effects";
import { concentrationBroken, dropConcentration } from "@/lib/utils/battle/concentration";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";
import type { Ruleset } from "@/lib/utils/rules";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface ApplyCondition5eOptions {
  key: Condition5eKey;
  rounds: number;
  permanent?: boolean;
  levels?: number;
  saveEnds?: { ability: AbilityKey; dc: number };
  source: ActiveEffect["source"];
  sourceName: string;
  timedKey: string;
  round: number;
  rules?: Ruleset;
}

export interface ApplyCondition5eResult {
  participants: BattleParticipant[];
  messages: string[];
  blocked: boolean;
}

function immune(ps: BattleParticipant[], id: string, key: Condition5eKey): boolean {
  return findFlags(ps, id, "conditionImmunity").some((f) => f.conditions === "all" || f.conditions.includes(key));
}

function dropConcentrationIfIncapacitated(ps: BattleParticipant[], targetId: string): { participants: BattleParticipant[]; messages: string[] } {
  const target = findParticipant(ps, targetId);

  if (!target) return { participants: ps, messages: [] };

  if (!concentrationBroken(target)) return { participants: ps, messages: [] };

  return dropConcentration(ps, targetId, target.combatStats.status === CombatStatus.DEAD || target.combatStats.currentHp <= 0 ? "" : "недієздатний");
}

function halveMaxHp(p: BattleParticipant, timedKey: string): BattleParticipant {
  const { maxHp, currentHp } = p.combatStats;

  const nextMax = Math.ceil(maxHp / 2);

  const idx = p.battleData.activeEffects.map((e) => e.abilityKey).lastIndexOf(timedKey);

  const halved = withActiveEffects(p, (list) => list.map((e, i) => (i === idx ? { ...e, exhaustionHpHalved: maxHp - nextMax } : e)));

  return { ...halved, combatStats: { ...p.combatStats, maxHp: nextMax, currentHp: Math.min(currentHp, nextMax) } };
}

export function applyCondition5e(ps: BattleParticipant[], targetId: string, opts: ApplyCondition5eOptions): ApplyCondition5eResult {
  const target = findParticipant(ps, targetId);

  if (!target) return { participants: ps, messages: [], blocked: false };

  const def = CONDITION_5E_REGISTRY[opts.key];

  if (immune(ps, targetId, opts.key)) return { participants: ps, messages: [`⛔ ${opts.sourceName}: ${target.basicInfo.name} — імунітет`], blocked: true };

  const variant = opts.rules?.conditions.exhaustion ?? "2014";

  const messages = [`⛓ ${opts.sourceName}: ${target.basicInfo.name} — ${def.label.toLowerCase()}${opts.permanent ? "" : ` (${opts.rounds} р.)`}`];

  const hadHalved = target.battleData.activeEffects.some((e) => e.exhaustionHpHalved);

  const input = conditionEffectInput(opts.key, { ...opts, exhaustion: variant });

  let next = upsertTimedEffect(target, input, opts.round);

  if (input.effects?.some((m) => m.type === "no_reaction")) next = { ...next, actionFlags: { ...next.actionFlags, hasUsedReaction: true } };

  if (opts.key === "exhaustion") {
    next = syncExhaustion(next);

    const level = exhaustionLevel(next);

    if (level >= MAX_EXHAUSTION) {
      next = { ...next, combatStats: { ...next.combatStats, currentHp: 0, status: CombatStatus.DEAD } };
      messages.push(`💀 ${next.basicInfo.name} помирає від виснаження`);
    } else if (variant === "2014" && level >= 4 && !hadHalved) {
      next = halveMaxHp(next, opts.timedKey);
      messages.push(`🩸 ${next.basicInfo.name}: максимум HP зменшено вдвічі`);
    }
  }

  if (hasCondition(next, "incapacitated") || hasEffectMarker(next, "immobilized")) next = removeEffects(next, (e) => !!e.abilityKey?.startsWith(DODGE_KEY_PREFIX)).participant;

  const applied = updateParticipant(ps, targetId, () => next);

  const dropped = dropConcentrationIfIncapacitated(applied, targetId);

  if (!hasCondition(next, "incapacitated")) return { participants: dropped.participants, messages: [...messages, ...dropped.messages], blocked: false };

  const released = releaseGrapples(dropped.participants, targetId, "недієздатний");

  return { participants: released.participants, messages: [...messages, ...dropped.messages, ...released.messages], blocked: false };
}

export function saveEndsFor(owner: BattleParticipant | undefined, ability: AbilityKey): { ability: AbilityKey; dc: number } {
  return { ability, dc: owner ? spellSaveDc(owner) : 10 };
}
