import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { CONDITION_LABELS, DAMAGE_FILTER_LABELS, flatLabel, signed, STAT_LABELS } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { Effect, FlagKey, StaticEffect } from "@/lib/utils/abilities/schema";

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
          source: effectSource(owner, ability),
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
  { name: "attackKind", label: "Тип атаки", input: "select", optional: true, options: [{ value: "melee", label: "ближня" }, { value: "ranged", label: "дальня" }], visibleWhen: (e) => e.stat === "attackBonus" },
  { name: "spellLevels", label: "Рівні слотів", input: "numberList", visibleWhen: (e) => e.stat === "spellSlots" },
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

export const FLAG_LABELS: Record<FlagKey, string> = {
  advantage: "Перевага",
  disadvantage: "Недолік на свої атаки",
  disadvantageForAttackers: "Недолік для атакувальників",
  guaranteedHit: "Гарантоване влучання",
  resistance: "Опір / імунітет до шкоди",
  spellImmunity: "Імунітет до заклинань",
  counterAttack: "Контратака",
  seeEnemyHp: "Бачить HP ворогів",
  conditionImmunity: "Імунітет до станів",
};

const ATTACK_KIND_ALL = [
  { value: "all", label: "усі" },
  { value: "melee", label: "ближні" },
  { value: "ranged", label: "дальні" },
] as const;

const DAMAGE_KIND_OPTIONS = [
  { value: "melee", label: "ближня" },
  { value: "ranged", label: "дальня" },
  { value: "magic", label: "магія" },
] as const;

export const FLAG_FIELDS: Record<FlagKey, readonly FieldMeta[]> = {
  advantage: [{ name: "attackKind", label: "Атаки", input: "select", options: ATTACK_KIND_ALL }],
  disadvantage: [],
  disadvantageForAttackers: [],
  guaranteedHit: [],
  resistance: [
    { name: "damageType", label: "Тип шкоди (physical, spell, fire…)", input: "text" },
    { name: "percent", label: "%, 100 = імунітет", input: "number" },
  ],
  spellImmunity: [{ name: "spellIds", label: "Заклинання", input: "spells" }],
  counterAttack: [
    { name: "attackKinds", label: "На атаки", input: "multiselect", options: DAMAGE_KIND_OPTIONS },
    { name: "bonusPercent", label: "Бонус шкоди, %", input: "number" },
  ],
  seeEnemyHp: [],
  conditionImmunity: [
    {
      name: "conditions",
      label: "Стани",
      input: "multiselect",
      options: [
        { value: "all", label: "усі (контроль)" },
        { value: "fear", label: "страх" },
        ...Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label })),
      ],
    },
  ],
};
