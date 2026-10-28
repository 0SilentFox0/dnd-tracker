import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { DAMAGE_FILTER_LABELS, flatLabel, STAT_LABELS } from "../labels";
import { immuneTo } from "./state";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { AttackType } from "@/lib/constants/battle";
import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { applySpellTimedEffect } from "@/lib/utils/abilities/engine/effects/opposing-spells";
import { effectSource } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { Effect, StaticEffect } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/common/format";

function stripTiming(effect: StaticEffect): StaticEffect {
  const { duration: _d, target: _t, ...rest } = effect;

  return rest as StaticEffect;
}

export function applyStatic(input: EffectApplyInput<StaticEffect>, describe: (e: Effect) => string): EffectApplyResult {
  const { effect, ability, targetIds, ctx } = input;

  const stripped = stripTiming(effect);

  if (!effect.duration) {
    return {
      participants: input.participants,
      messages: [],
      actionModifiers: targetIds.map((participantId) => ({ participantId, effect: stripped })),
    };
  }

  const rounds = effect.duration.rounds;

  const owner = findParticipant(input.participants, input.ownerId);

  let ps = input.participants;

  const timedKey = `${ability.key}#${input.effectIndex}`;

  const cancelled: string[] = [];

  const fearBlocked = effect.kind === "modifyStat" && effect.stat === "morale" && typeof effect.flat === "number" && effect.flat < 0;

  const blocked = fearBlocked ? targetIds.filter((id) => immuneTo(input.participants, id, "fear")) : [];

  for (const id of targetIds.filter((t) => !blocked.includes(t))) {
    ps = updateParticipant(ps, id, (target) => {
      const { participant, removed } = applySpellTimedEffect(
        target,
        {
          timedKey,
          source: effectSource(owner, ability),
          name: ability.name,
          type: target.basicInfo.side === owner?.basicInfo.side ? "buff" : "debuff",
          rounds,
          stackable: ability.stackable === true,
          maxStacks: ability.maxStacks,
          abilityEffects: [stripped],
        },
        ctx.round,
      );

      for (const e of removed) cancelled.push(`⚖️ ${ability.name} знімає «${e.name}» → ${target.basicInfo.name}`);

      return participant;
    });
  }

  const applied = targetIds.filter((t) => !blocked.includes(t));

  const messages = [...new Set(cancelled), ...(applied.length ? [`✨ ${ability.name}: ${describe(effect)} → ${participantNames(ps, applied)} (${rounds} р.)`] : [])];

  if (blocked.length) messages.push(`⛔ ${ability.name}: ${participantNames(ps, blocked)} — імунітет`);

  return { participants: ps, messages };
}

const VALUE_FIELDS: readonly FieldMeta[] = [
  { name: "flat", label: "Число / формула", input: "flat", optional: true },
  { name: "percent", label: "% (число / формула)", input: "flat", optional: true },
];

export const modifyStatFields: readonly FieldMeta[] = [
  { name: "stat", label: "Стат", input: "select", options: Object.entries(STAT_LABELS).map(([value, label]) => ({ value, label })) },
  ...VALUE_FIELDS,
  { name: "attackKind", label: "Тип атаки", input: "select", optional: true, options: [{ value: AttackType.MELEE, label: "ближня" }, { value: AttackType.RANGED, label: "дальня" }], visibleWhen: (e) => e.stat === "attackBonus" },
  { name: "spellLevels", label: "Рівні слотів", input: "numberList", visibleWhen: (e) => e.stat === "spellSlots" },
  TARGET_FIELD,
  DURATION_FIELD,
];

export const damageBonusFields: readonly FieldMeta[] = [
  { name: "filter.kind", label: "Тип шкоди", input: "select", options: Object.entries(DAMAGE_FILTER_LABELS).map(([value, label]) => ({ value, label })) },
  { name: "filter.school", label: "Школа магії", input: "text", optional: true },
  ...VALUE_FIELDS,
  { name: "perMark", label: "За кожну мітку (id мітки)", input: "text", optional: true },
  TARGET_FIELD,
  DURATION_FIELD,
];

const percentLabel = (p: Parameters<typeof flatLabel>[0]) => (typeof p === "number" ? `${signed(p)}%` : `(${p.formula})%`);

function valueLabel(e: { flat?: Parameters<typeof flatLabel>[0]; percent?: Parameters<typeof flatLabel>[0] }): string {
  return [e.flat !== undefined ? flatLabel(e.flat) : null, e.percent !== undefined ? percentLabel(e.percent) : null]
    .filter(Boolean)
    .join(" ");
}

export function describeModifyStat(e: Extract<Effect, { kind: "modifyStat" }>): string {
  const levels = e.spellLevels ? ` (рівні ${e.spellLevels.join(", ")})` : "";

  return `${STAT_LABELS[e.stat]}${levels} ${valueLabel(e)}`;
}

export function describeDamageBonus(e: Extract<Effect, { kind: "damageBonus" }>): string {
  return `шкода (${DAMAGE_FILTER_LABELS[e.filter.kind]}${e.filter.school ? ", школа" : ""}) ${valueLabel(e)}${e.perMark ? ` за мітку «${e.perMark}»` : ""}`;
}
