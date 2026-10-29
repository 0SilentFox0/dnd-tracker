import type { EffectApplyInput, EffectApplyResult } from "./types";

import { EffectMarker } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, participantNames, updateParticipant, withActiveEffects } from "@/lib/utils/abilities/engine/core/participants";
import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { countMarks, GUARD_KEY, markKey } from "@/lib/utils/abilities/engine/effects/marks";
import { clampMorale, moraleCapOf } from "@/lib/utils/abilities/engine/effects/morale";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { logText } from "@/lib/utils/abilities/log-text";
import type { ConditionImmunityKey, Effect } from "@/lib/utils/abilities/schema";
import { isCondition5eKey, isCustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import { seg, type Segment } from "@/lib/utils/abilities/segments";
import { helpEffect } from "@/lib/utils/battle/actions/effects";
import { applyCondition5e, type ConditionKey, saveEndsFor } from "@/lib/utils/battle/conditions/apply";
import { removeEffects } from "@/lib/utils/battle/conditions/query";
import { grantExtraActions } from "@/lib/utils/battle/participant/helpers";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";
import { signed } from "@/lib/utils/common/format";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { slotLevel, slotRestoreOrder } from "@/lib/utils/spells/slot-keys";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

function each(
  input: EffectApplyInput,
  fn: (p: BattleParticipant) => BattleParticipant | null,
  message: (names: string) => LogLine,
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

  if (blocked.length) messages.push(textRef("abilityText.log.immune", { ability: input.ability.name, target: participantNames(ps, blocked) }));

  return { participants: ps, messages };
}

const flag = (value: unknown): string => String(!!value);

export function immuneTo(ps: BattleParticipant[], id: string, key: ConditionImmunityKey): boolean {
  return findFlags(ps, id, "conditionImmunity").some((f) => f.conditions === "all" || f.conditions.includes(key));
}

function applyCondition5eToTargets(input: EffectApplyInput<Of<"applyCondition">>, key: ConditionKey): EffectApplyResult {
  const { ability, effect, ctx } = input;

  const owner = findParticipant(input.participants, input.ownerId);

  const source = effectSource(owner, ability);

  let ps = input.participants;

  const messages: LogLine[] = [];

  for (const id of input.targetIds) {
    const result = applyCondition5e(ps, id, {
      key,
      rounds: effect.duration.rounds,
      levels: effect.levels,
      saveEnds: effect.saveEnds ? saveEndsFor(owner, effect.saveEnds.ability, (ctx.rules ?? DEFAULT_RULES).formulas.saveDcBase) : undefined,
      source,
      sourceName: ability.name,
      timedKey: `${ability.key}#${input.effectIndex}@${input.ownerId}`,
      round: ctx.round,
      rules: ctx.rules,
    });

    ps = result.participants;
    messages.push(...result.messages);

    if (effect.escapeDc && owner && !result.blocked) ps = updateParticipant(ps, id, (p) => withEscapeDc(p, `${ability.key}#${input.effectIndex}@${input.ownerId}`, spellSaveDc(owner, undefined, (ctx.rules ?? DEFAULT_RULES).formulas.saveDcBase)));
  }

  return { participants: ps, messages };
}

const withEscapeDc = (p: BattleParticipant, timedKey: string, escapeDc: number): BattleParticipant =>
  withActiveEffects(p, (list) => list.map((e) => (e.abilityKey === timedKey ? { ...e, escapeDc } : e)));

export function applyCondition(input: EffectApplyInput<Of<"applyCondition">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  if (isCondition5eKey(effect.condition) || isCustomConditionKey(effect.condition)) return applyCondition5eToTargets(input, effect.condition);

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
          effects: [{ type: condition, value: condition === EffectMarker.SKIP_ACTION ? (effect.percent ?? 100) : 1 }],
          breakOnDamage: effect.breakOnDamage,
        },
        ctx.round,
      );

      return condition === EffectMarker.NO_REACTION ? { ...next, actionFlags: { ...next.actionFlags, hasUsedReaction: true } } : next;
    },
    (names) => textRef("abilityText.log.condition", { ability: ability.name, target: names, condition: textRef(`abilityRegistry.options.condition.${condition}`), rounds: effect.duration.rounds }),
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
    (names) => textRef("abilityText.log.grantAction", { ability: ability.name, target: names, text: logText(describeGrantAction(effect)) }),
  );
}

export function applyHelp(input: EffectApplyInput<Of<"help">>): EffectApplyResult {
  const { ability, ctx } = input;

  const owner = findParticipant(input.participants, input.ownerId);

  return each(
    input,
    (p) => upsertTimedEffect(p, { ...helpEffect(input.ownerId), source: effectSource(owner, ability) }, ctx.round),
    (names) => textRef("abilityText.log.help", { ability: ability.name, target: names }),
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
    (names) => textRef("abilityText.log.restoreSlot", { ability: ability.name, target: names, count: effect.count }),
  );
}

export function applyDrainSpellSlot(input: EffectApplyInput<Of<"drainSpellSlot">>): EffectApplyResult {
  const { effect } = input;

  let ps = input.participants;

  const messages: LogLine[] = [];

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
    messages.push(...lost.map((l) => textRef("abilityText.log.drainSlot", { target: p.basicInfo.name, hasLevel: flag(!Number.isNaN(Number(l))), level: l })));
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
    (names) => textRef("abilityText.log.morale", { ability: ability.name, target: names, delta: signed(effect.delta) }),
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
    (names) => textRef("abilityText.log.cleanse", { ability: ability.name, target: names, conditions: flag(effect.includeConditions) }),
  );
}

export function describeGrantAction(e: Of<"grantAction">): Segment[] {
  const parts = [
    e.extraActions ? seg("summary.effects.grantExtra", { n: e.extraActions }) : null,
    e.refreshAction ? seg("summary.effects.grantRefreshAction") : null,
    e.refreshBonusAction ? seg("summary.effects.grantRefreshBonusAction") : null,
    e.refreshReaction ? seg("summary.effects.grantRefreshReaction") : null,
  ].filter((x): x is Segment => !!x);

  return [seg("summary.effects.grantAction", { parts: { join: ", ", items: parts } })];
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
    (names) => textRef("abilityText.log.mark", { ability: ability.name, target: names, hasCount: flag(counts.length === 1), count: counts[0] ?? "" }),
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
    (names) => textRef("abilityText.log.guard", { ability: ability.name, target: names, percent: effect.percent, rounds: effect.duration.rounds }),
    (p) => p.basicInfo.id === input.ownerId || p.basicInfo.side !== owner?.basicInfo.side,
  );
}
