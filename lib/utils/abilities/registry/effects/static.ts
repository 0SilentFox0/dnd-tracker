import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { DAMAGE_FILTER_LABELS, flatLabel, signed, STAT_LABELS } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { Effect, StaticEffect } from "@/lib/utils/abilities/schema";

export function stripTiming(effect: StaticEffect): StaticEffect {
  const { duration: _d, target: _t, ...rest } = effect;

  void _d;
  void _t;

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

  for (const id of targetIds) {
    ps = updateParticipant(ps, id, (p) =>
      upsertTimedEffect(
        p,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          name: ability.name,
          type: p.basicInfo.side === owner?.basicInfo.side ? "buff" : "debuff",
          rounds,
          stackable: ability.stackable === true,
          abilityEffects: [stripped],
        },
        ctx.round,
      ),
    );
  }

  return {
    participants: ps,
    messages: [`✨ ${ability.name}: ${describe(effect)} → ${participantNames(ps, targetIds)} (${rounds} р.)`],
  };
}

const VALUE_FIELDS: readonly FieldMeta[] = [
  { name: "flat", label: "Число / формула", input: "flat", optional: true },
  { name: "percent", label: "%", input: "number", optional: true },
];

export const modifyStatFields: readonly FieldMeta[] = [
  { name: "stat", label: "Стат", input: "select", options: Object.entries(STAT_LABELS).map(([value, label]) => ({ value, label })) },
  ...VALUE_FIELDS,
  TARGET_FIELD,
  DURATION_FIELD,
];

export const damageBonusFields: readonly FieldMeta[] = [
  { name: "filter.kind", label: "Тип шкоди", input: "select", options: Object.entries(DAMAGE_FILTER_LABELS).map(([value, label]) => ({ value, label })) },
  { name: "filter.school", label: "Школа магії", input: "text", optional: true },
  ...VALUE_FIELDS,
  TARGET_FIELD,
  DURATION_FIELD,
];

function valueLabel(e: { flat?: Parameters<typeof flatLabel>[0]; percent?: number }): string {
  return [e.flat !== undefined ? flatLabel(e.flat) : null, e.percent !== undefined ? `${signed(e.percent)}%` : null]
    .filter(Boolean)
    .join(" ");
}

export function describeModifyStat(e: Extract<Effect, { kind: "modifyStat" }>): string {
  const levels = e.spellLevels ? ` (рівні ${e.spellLevels.join(", ")})` : "";

  return `${STAT_LABELS[e.stat]}${levels} ${valueLabel(e)}`;
}

export function describeDamageBonus(e: Extract<Effect, { kind: "damageBonus" }>): string {
  return `шкода (${DAMAGE_FILTER_LABELS[e.filter.kind]}${e.filter.school ? ", школа" : ""}) ${valueLabel(e)}`;
}

export function describeFlag(e: Extract<Effect, { kind: "flag" }>): string {
  switch (e.flag) {
    case "advantage":
      return e.attackKind === "all" ? "перевага на атаки" : `перевага на ${e.attackKind === "melee" ? "ближні" : "дальні"} атаки`;
    case "disadvantage":
      return "недолік на атаки";
    case "disadvantageForAttackers":
      return "недолік для атакувальників";
    case "guaranteedHit":
      return "гарантоване влучання";
    case "resistance":
      return e.percent >= 100 ? `імунітет: ${e.damageType}` : `опір ${e.damageType} ${e.percent}%`;
    case "spellImmunity":
      return `імунітет до заклинань (${e.spellIds.length})`;
    case "counterAttack":
      return `контратака +${e.bonusPercent}%`;
    case "seeEnemyHp":
      return "бачить HP ворогів";
    case "conditionImmunity":
      return e.conditions === "all" ? "імунітет до контролю" : `імунітет: ${e.conditions.map((c) => (c === "fear" ? "страх" : c)).join(", ")}`;
  }
}
