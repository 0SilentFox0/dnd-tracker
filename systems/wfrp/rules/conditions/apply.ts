import { isWfrpConditionKey,WFRP_CONDITION_REGISTRY, wfrpConditionEffectKey, type WfrpConditionKey, wfrpConditionMarker } from "./catalog";
import { conditionLevel } from "./levels";

import { CombatStatus, EffectMarker } from "@/lib/constants/battle";
import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { upsertLabeled } from "@/lib/utils/battle/actions/effects";
import { PERMANENT_ROUNDS } from "@/lib/utils/battle/conditions";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import type { SystemConditionApply, SystemConditionResult } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export const UNTIMED_CONDITIONS: ReadonlySet<WfrpConditionKey> = new Set(["unconscious"]);

const labelKey = (key: WfrpConditionKey) => `battleWfrp.conditions.${key}.label`;

export function applyWfrpConditionTo(p: BattleParticipant, input: SystemConditionApply & { key: WfrpConditionKey }): { participant: BattleParticipant; messages: LogLine[] } {
  const { key } = input;

  if (key === "unconscious" && conditionLevel(p, key) > 0 && p.combatStats.status !== CombatStatus.ACTIVE) return { participant: p, messages: [] };

  const def = WFRP_CONDITION_REGISTRY[key];

  const effectKey = wfrpConditionEffectKey(key);

  const levels = def.leveled ? Math.min(Math.max(input.levels ?? 1, 1), def.leveled.max - conditionLevel(p, key)) : 1;

  const rounds = UNTIMED_CONDITIONS.has(key) ? undefined : (input.rounds ?? def.rounds);

  const message = textRef("battleWfrp.log.applied", { target: p.basicInfo.name, condition: dynamicTextRef(labelKey(key)), level: levels, source: input.sourceName });

  let next = p;

  if (!def.leveled || conditionLevel(p, key) < def.leveled.max) {
    next = upsertLabeled(
      p,
      {
        timedKey: effectKey,
        name: effectKey,
        label: dynamicTextRef(labelKey(key)),
        type: "condition",
        rounds: rounds ?? PERMANENT_ROUNDS,
        permanent: !rounds,
        stackable: !!def.leveled,
        source: input.source,
        effects: [{ type: wfrpConditionMarker(key), value: levels }, ...def.markers.map((m) => ({ type: m, value: m === EffectMarker.SKIP_ACTION ? 100 : 1 }))],
      },
      input.round,
    );

    const description = dynamicTextRef(`battleWfrp.conditions.${key}.description`);

    next = { ...next, battleData: { ...next.battleData, activeEffects: next.battleData.activeEffects.map((e) => (e.abilityKey === effectKey ? { ...e, description, ...(input.concealed && { concealed: true as const }) } : e)) } };
  }

  if (key === "unconscious" && next.combatStats.status !== CombatStatus.DEAD) next = { ...next, combatStats: { ...next.combatStats, status: CombatStatus.UNCONSCIOUS } };

  return { participant: next, messages: [message] };
}

export function reduceWfrpCondition(p: BattleParticipant, key: WfrpConditionKey, by: 1 | "all"): { participant: BattleParticipant; removed: boolean } {
  const def = WFRP_CONDITION_REGISTRY[key];

  const effectKey = wfrpConditionEffectKey(key);

  const marker = wfrpConditionMarker(key);

  const own = p.battleData.activeEffects.filter((e) => e.abilityKey === effectKey);

  let next = p;

  if (own.length) {
    const newest = own[own.length - 1];

    const value = newest.effects.find((x) => x.type === marker)?.value ?? 1;

    if (by === "all") next = removeEffects(p, (e) => e.abilityKey === effectKey).participant;
    else if (!def.leveled || value <= 1) next = removeEffects(p, (e) => e.id === newest.id).participant;
    else {
      const effects = newest.effects.map((x) => (x.type === marker ? { ...x, value: value - 1 } : x));

      next = { ...p, battleData: { ...p.battleData, activeEffects: p.battleData.activeEffects.map((e) => (e.id === newest.id ? { ...e, effects } : e)) } };
    }
  }

  const removed = conditionLevel(next, key) === 0;

  if (removed && key === "unconscious" && next.combatStats.status === CombatStatus.UNCONSCIOUS && next.combatStats.currentHp > 0) {
    next = { ...next, combatStats: { ...next.combatStats, status: CombatStatus.ACTIVE } };
  }

  return { participant: next, removed };
}

export function applyWfrpCondition(ps: BattleParticipant[], targetId: string, input: SystemConditionApply): SystemConditionResult {
  const target = ps.find((p) => p.basicInfo.id === targetId);

  if (!target || !isWfrpConditionKey(input.key)) return { participants: ps, messages: [] };

  const { participant, messages } = applyWfrpConditionTo(target, { ...input, key: input.key });

  return { participants: ps.map((p) => (p === target ? participant : p)), messages };
}

export function reduceWfrpConditionIn(ps: BattleParticipant[], targetId: string, key: string, by: 1 | "all"): SystemConditionResult & { removed: boolean } {
  const target = ps.find((p) => p.basicInfo.id === targetId);

  if (!target || !isWfrpConditionKey(key)) return { participants: ps, messages: [], removed: false };

  const { participant, removed } = reduceWfrpCondition(target, key, by);

  const messages = removed ? [textRef("battleWfrp.log.removed", { target: target.basicInfo.name, condition: dynamicTextRef(labelKey(key)) })] : [];

  return { participants: ps.map((p) => (p === target ? participant : p)), messages, removed };
}
