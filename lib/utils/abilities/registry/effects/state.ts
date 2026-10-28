import { CONDITION_LABELS } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { countMarks, GUARD_KEY, markKey } from "@/lib/utils/abilities/engine/effects/marks";
import { clampMorale, moraleCapOf } from "@/lib/utils/abilities/engine/effects/morale";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { AnyConditionKey, Condition5eKey, ConditionImmunityKey, Effect } from "@/lib/utils/abilities/schema";
import { CONDITION_5E_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { applyCondition5e, saveEndsFor } from "@/lib/utils/battle/conditions/apply";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { grantExtraActions } from "@/lib/utils/battle/participant/helpers";
import { signed } from "@/lib/utils/common/format";
import { pluralUk } from "@/lib/utils/common/plural";
import { slotLevel, slotRestoreOrder } from "@/lib/utils/spells/slot-keys";
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

function is5e(key: AnyConditionKey): key is Condition5eKey {
  return (CONDITION_5E_KEYS as readonly string[]).includes(key);
}

function applyCondition5eToTargets(input: EffectApplyInput<Of<"applyCondition">>, key: Condition5eKey): EffectApplyResult {
  const { ability, effect, ctx } = input;

  const owner = findParticipant(input.participants, input.ownerId);

  const source = effectSource(owner, ability);

  let ps = input.participants;

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const result = applyCondition5e(ps, id, {
      key,
      rounds: effect.duration.rounds,
      levels: effect.levels,
      saveEnds: effect.saveEnds ? saveEndsFor(owner, effect.saveEnds.ability) : undefined,
      source,
      sourceName: ability.name,
      timedKey: `${ability.key}#${input.effectIndex}@${input.ownerId}`,
      round: ctx.round,
      rules: ctx.rules,
    });

    ps = result.participants;
    messages.push(...result.messages);
  }

  return { participants: ps, messages };
}

export function applyCondition(input: EffectApplyInput<Of<"applyCondition">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  if (is5e(effect.condition)) return applyCondition5eToTargets(input, effect.condition);

  const condition = effect.condition;

  return each(
    input,
    (p) => {
      const next = upsertTimedEffect(
        p,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          source: effectSource(findParticipant(input.participants, input.ownerId), ability),
          name: ability.name,
          type: "condition",
          rounds: effect.duration.rounds,
          stackable: false,
          effects: [{ type: condition, value: condition === "skip_action" ? (effect.percent ?? 100) : 1 }],
          breakOnDamage: effect.breakOnDamage,
        },
        ctx.round,
      );

      return condition === "no_reaction" ? { ...next, actionFlags: { ...next.actionFlags, hasUsedReaction: true } } : next;
    },
    (names) => `⛓ ${ability.name}: ${names} — ${CONDITION_LABELS[condition]} (${effect.duration.rounds} р.)`,
    (p) => immuneTo(input.participants, p.basicInfo.id, condition),
  );
}

export function applyGrantAction(input: EffectApplyInput<Of<"grantAction">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const granted = grantExtraActions(p, effect.extraActions ?? 0);

      return {
        ...granted,
        ...(effect.refreshReaction && { battleData: { ...granted.battleData, retaliationsUsed: 0 } }),
        actionFlags: {
          ...granted.actionFlags,
          ...(effect.refreshAction && { hasUsedAction: false }),
          ...(effect.refreshBonusAction && { hasUsedBonusAction: false }),
          ...(effect.refreshReaction && { hasUsedReaction: false }),
        },
      };
    },
    (names) => `⚔️ ${ability.name}: ${names} — ${describeGrantAction(effect)}`,
  );
}

export function applyRestoreSpellSlot(input: EffectApplyInput<Of<"restoreSpellSlot">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const slots = p.spellcasting.spellSlots;

      const level = slotRestoreOrder(slots).find((l) => slots[l].current < slots[l].max);

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

export function applyDrainSpellSlot(input: EffectApplyInput<Of<"drainSpellSlot">>): EffectApplyResult {
  const { effect } = input;

  let ps = input.participants;

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const p = findParticipant(ps, id);

    if (!p) continue;

    const slots = { ...p.spellcasting.spellSlots };

    const lost: string[] = [];

    for (let i = 0; i < effect.count; i++) {
      const level = Object.keys(slots)
        .filter((l) => slots[l].current > 0)
        .sort((a, b) => slotLevel(slots, b) - slotLevel(slots, a))[0];

      if (!level) break;

      slots[level] = { ...slots[level], current: slots[level].current - 1 };
      lost.push(level);
    }

    if (!lost.length) continue;

    ps = updateParticipant(ps, id, (t) => ({ ...t, spellcasting: { ...t.spellcasting, spellSlots: slots } }));
    messages.push(...lost.map((l) => `🔮 ${p.basicInfo.name} втрачає слот${Number.isNaN(Number(l)) ? "" : ` ${l}-го рівня`}`));
  }

  return { participants: ps, messages };
}

export function applyChangeMorale(input: EffectApplyInput<Of<"changeMorale">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const morale = clampMorale(p.combatStats.morale + effect.delta, moraleCapOf(p));

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
      const { participant: cleaned, removed } = removeEffects(p, (e) => e.type === "debuff" || (!!effect.includeConditions && e.type === "condition"));

      if (!removed.length) return null;

      // знятий чарм більше не поверне учасника наприкінці ходу — повертаємо одразу
      const charm = removed.find((e) => e.charmOrigin);

      return charm ? restoreCharm({ ...cleaned, battleData: { ...cleaned.battleData, charmReturn: charm.charmOrigin } }) : cleaned;
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
        { timedKey: markKey(effect.markId), source: effectSource(owner, ability), name: ability.name, type: "debuff", rounds: effect.duration.rounds, stackable: true, countdownAtTurnStart: true },
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
