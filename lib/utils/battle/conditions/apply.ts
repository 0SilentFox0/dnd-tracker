import { releaseGrapples } from "./grapple-links";
import { exhaustionLevel, hasCondition, MAX_EXHAUSTION, removeEffects, syncExhaustion } from "./query";
import { type Condition5eKey, conditionEffectInput, customConditionDef, customConditionInput } from "./registry";

import type { AbilityKey } from "@/lib/constants/abilities";
import { CombatStatus, EffectMarker } from "@/lib/constants/battle";
import { DEFAULT_RULES_EDITION } from "@/lib/constants/rules";
import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, updateParticipant, withActiveEffects } from "@/lib/utils/abilities/engine/core/participants";
import { type CustomConditionKey, isCustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import { DODGE_KEY_PREFIX, upsertLabeled } from "@/lib/utils/battle/actions/effects";
import { concentrationBroken, dropConcentration } from "@/lib/utils/battle/concentration";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";
import type { Ruleset } from "@/lib/utils/rules";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export type ConditionKey = Condition5eKey | CustomConditionKey;

export interface ApplyCondition5eOptions {
  key: ConditionKey;
  rounds: number;
  permanent?: boolean;
  levels?: number;
  saveEnds?: { ability: AbilityKey; dc: number };
  source: ActiveEffect["source"];
  sourceName: LogLine;
  timedKey: string;
  round: number;
  rules?: Ruleset;
}

export interface ApplyCondition5eResult {
  participants: BattleParticipant[];
  messages: LogLine[];
  blocked: boolean;
}

function immune(ps: BattleParticipant[], id: string, key: ConditionKey): boolean {
  return findFlags(ps, id, "conditionImmunity").some((f) => f.conditions === "all" || (f.conditions as string[]).includes(key));
}

function dropConcentrationIfIncapacitated(ps: BattleParticipant[], targetId: string): { participants: BattleParticipant[]; messages: LogLine[] } {
  const target = findParticipant(ps, targetId);

  if (!target) return { participants: ps, messages: [] };

  if (!concentrationBroken(target)) return { participants: ps, messages: [] };

  return dropConcentration(ps, targetId, target.combatStats.status === CombatStatus.DEAD || target.combatStats.currentHp <= 0 ? "" : textRef("battleActions.condition.incapacitatedReason"));
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

  const custom = isCustomConditionKey(opts.key) ? customConditionDef(opts.key, opts.rules) : undefined;

  if (isCustomConditionKey(opts.key) && !custom) return { participants: ps, messages: [textRef("battleActions.condition.undefinedCustom", { source: opts.sourceName })], blocked: false };

  if (immune(ps, targetId, opts.key)) return { participants: ps, messages: [textRef("battleActions.condition.immune", { source: opts.sourceName, target: target.basicInfo.name })], blocked: true };

  const variant = opts.rules?.conditions.exhaustion ?? DEFAULT_RULES_EDITION;

  const messages: LogLine[] = [textRef(opts.permanent ? "battleActions.condition.applied" : "battleActions.condition.appliedTimed", { source: opts.sourceName, target: target.basicInfo.name, condition: custom ? custom.name : dynamicTextRef(`battleActions.condition.lower.${opts.key}`), rounds: opts.rounds })];

  const hadHalved = target.battleData.activeEffects.some((e) => e.exhaustionHpHalved);

  const input = custom ? customConditionInput(custom, { ...opts, exhaustion: variant }) : conditionEffectInput(opts.key as Condition5eKey, { ...opts, exhaustion: variant });

  let next = upsertLabeled(target, input, opts.round);

  if (input.effects?.some((m) => m.type === EffectMarker.NO_REACTION)) next = { ...next, actionFlags: { ...next.actionFlags, hasUsedReaction: true } };

  if (opts.key === "exhaustion") {
    next = syncExhaustion(next);

    const level = exhaustionLevel(next);

    if (level >= MAX_EXHAUSTION) {
      next = { ...next, combatStats: { ...next.combatStats, currentHp: 0, status: CombatStatus.DEAD } };
      messages.push(textRef("battleActions.condition.exhaustionDeath", { name: next.basicInfo.name }));
    } else if (variant === "2014" && level >= 4 && !hadHalved) {
      next = halveMaxHp(next, opts.timedKey);
      messages.push(textRef("battleActions.condition.exhaustionHalved", { name: next.basicInfo.name }));
    }
  }

  if (hasCondition(next, "incapacitated") || hasEffectMarker(next, EffectMarker.IMMOBILIZED)) next = removeEffects(next, (e) => !!e.abilityKey?.startsWith(DODGE_KEY_PREFIX)).participant;

  const applied = updateParticipant(ps, targetId, () => next);

  const dropped = dropConcentrationIfIncapacitated(applied, targetId);

  if (!hasCondition(next, "incapacitated")) return { participants: dropped.participants, messages: [...messages, ...dropped.messages], blocked: false };

  const released = releaseGrapples(dropped.participants, targetId, textRef("battleActions.grapple.reasons.incapacitated"));

  return { participants: released.participants, messages: [...messages, ...dropped.messages, ...released.messages], blocked: false };
}

export function saveEndsFor(owner: BattleParticipant | undefined, ability: AbilityKey, saveDcBase: number): { ability: AbilityKey; dc: number } {
  return { ability, dc: owner ? spellSaveDc(owner, undefined, saveDcBase) : 10 };
}
