import { CONDITION_LABELS } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { countMarks, GUARD_KEY, markKey } from "@/lib/utils/abilities/engine/marks";
import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { ConditionImmunityKey, Effect } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/format";
import { pluralUk } from "@/lib/utils/plural";
import type { BattleParticipant } from "@/types/battle";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

function each(
  input: EffectApplyInput,
  fn: (p: BattleParticipant) => BattleParticipant | null,
  message: (names: string) => string,
  immune?: (p: BattleParticipant) => boolean,
): EffectApplyResult {
  let ps = input.participants;

  const touched: string[] = [];

  const blocked: string[] = [];

  for (const id of input.targetIds) {
    const p = findParticipant(ps, id);

    if (p && immune?.(p)) {
      blocked.push(id);
      continue;
    }

    const next = p ? fn(p) : null;

    if (!next) continue;

    ps = updateParticipant(ps, id, () => next);
    touched.push(id);
  }

  const messages = touched.length ? [message(participantNames(ps, touched))] : [];

  if (blocked.length) messages.push(`⛔ ${input.ability.name}: ${participantNames(ps, blocked)} — імунітет`);

  return { participants: ps, messages };
}

export function immuneTo(ps: BattleParticipant[], id: string, key: ConditionImmunityKey): boolean {
  return findFlags(ps, id, "conditionImmunity").some((f) => f.conditions === "all" || f.conditions.includes(key));
}

export { CONDITION_LABELS };

export function applyCondition(input: EffectApplyInput<Of<"applyCondition">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  return each(
    input,
    (p) =>
      upsertTimedEffect(
        p,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          source: effectSource(findParticipant(input.participants, input.ownerId), ability),
          name: ability.name,
          type: "condition",
          rounds: effect.duration.rounds,
          stackable: false,
          effects: [{ type: effect.condition, value: 1 }],
        },
        ctx.round,
      ),
    (names) => `⛓ ${ability.name}: ${names} — ${CONDITION_LABELS[effect.condition]} (${effect.duration.rounds} р.)`,
    (p) => immuneTo(input.participants, p.basicInfo.id, effect.condition),
  );
}

export function applyGrantAction(input: EffectApplyInput<Of<"grantAction">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => ({
      ...p,
      actionFlags: {
        ...p.actionFlags,
        ...((effect.refreshAction || effect.extraActions) && { hasUsedAction: false }),
        ...(effect.refreshBonusAction && { hasUsedBonusAction: false }),
        ...(effect.refreshReaction && { hasUsedReaction: false }),
      },
      battleData: effect.extraActions
        ? { ...p.battleData, pendingExtraActions: (p.battleData.pendingExtraActions ?? 0) + effect.extraActions }
        : p.battleData,
    }),
    (names) => `⚔️ ${ability.name}: ${names} — ${describeGrantAction(effect)}`,
  );
}

export function applyRestoreSpellSlot(input: EffectApplyInput<Of<"restoreSpellSlot">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const slots = p.spellcasting.spellSlots;

      const level = Object.keys(slots)
        .sort((a, b) => Number(a) - Number(b))
        .find((l) => slots[l].current < slots[l].max);

      if (!level) return null;

      const slot = slots[level];

      return {
        ...p,
        spellcasting: { ...p.spellcasting, spellSlots: { ...slots, [level]: { ...slot, current: Math.min(slot.max, slot.current + effect.count) } } },
      };
    },
    (names) => `🔮 ${ability.name}: ${names} відновлює ${effect.count} ${pluralUk(effect.count, ["слот", "слоти", "слотів"])}`,
  );
}

export function applyChangeMorale(input: EffectApplyInput<Of<"changeMorale">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const morale = Math.max(-3, Math.min(3, p.combatStats.morale + effect.delta));

      return morale === p.combatStats.morale ? null : { ...p, combatStats: { ...p.combatStats, morale } };
    },
    (names) => `📊 ${ability.name}: ${names} мораль ${signed(effect.delta)}`,
    (p) => effect.delta < 0 && immuneTo(input.participants, p.basicInfo.id, "fear"),
  );
}

export function applyCleanse(input: EffectApplyInput<Of<"cleanse">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const kept = p.battleData.activeEffects.filter((e) => e.type !== "debuff" && !(effect.includeConditions && e.type === "condition"));

      return kept.length === p.battleData.activeEffects.length ? null : { ...p, battleData: { ...p.battleData, activeEffects: kept } };
    },
    (names) => `✨ ${ability.name}: з ${names} знято ${effect.includeConditions ? "дебафи та стани" : "дебафи"}`,
  );
}

export function describeGrantAction(e: Of<"grantAction">): string {
  return [
    e.extraActions ? `+${e.extraActions} дія` : null,
    e.refreshAction ? "оновлює дію" : null,
    e.refreshBonusAction ? "оновлює бонусну дію" : null,
    e.refreshReaction ? "оновлює реакцію" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export function applyMark(input: EffectApplyInput<Of<"mark">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  const owner = findParticipant(input.participants, input.ownerId);

  const counts: number[] = [];

  return each(
    input,
    (p) => {
      const next = upsertTimedEffect(
        p,
        { timedKey: markKey(effect.markId), source: effectSource(owner, ability), name: ability.name, type: "debuff", rounds: effect.duration.rounds, stackable: true },
        ctx.round,
      );

      counts.push(countMarks(next, effect.markId, input.ownerId));

      return next;
    },
    (names) => `🎯 ${ability.name}: ${names} — мітка${counts.length === 1 ? ` (${counts[0]})` : ""}`,
  );
}

export function applyGuard(input: EffectApplyInput<Of<"guard">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  const owner = findParticipant(input.participants, input.ownerId);

  return each(
    input,
    (p) =>
      upsertTimedEffect(
        p,
        {
          timedKey: GUARD_KEY,
          source: effectSource(owner, ability),
          name: ability.name,
          type: "buff",
          rounds: effect.duration.rounds,
          stackable: false,
          effects: [{ type: "guard", value: effect.percent }],
        },
        ctx.round,
      ),
    (names) => `🛡 ${ability.name}: ${names} — захист ${effect.percent}% (${effect.duration.rounds} р.)`,
    (p) => p.basicInfo.id === input.ownerId || p.basicInfo.side !== owner?.basicInfo.side,
  );
}
