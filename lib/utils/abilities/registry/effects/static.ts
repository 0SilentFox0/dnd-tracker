import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { CONDITION_LABELS, DAMAGE_FILTER_LABELS, flatLabel, STAT_LABELS } from "../labels";
import { immuneTo } from "./state";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { Effect, FlagKey, StaticEffect } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/format";

export function stripTiming(effect: StaticEffect): StaticEffect {
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

  const fearBlocked = effect.kind === "modifyStat" && effect.stat === "morale" && typeof effect.flat === "number" && effect.flat < 0;

  const blocked = fearBlocked ? targetIds.filter((id) => immuneTo(input.participants, id, "fear")) : [];

  for (const id of targetIds.filter((t) => !blocked.includes(t))) {
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
          maxStacks: ability.maxStacks,
          abilityEffects: [stripped],
        },
        ctx.round,
      ),
    );
  }

  const applied = targetIds.filter((t) => !blocked.includes(t));

  const messages = applied.length ? [`✨ ${ability.name}: ${describe(effect)} → ${participantNames(ps, applied)} (${rounds} р.)`] : [];

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

export function describeFlag(e: Extract<Effect, { kind: "flag" }>): string {
  switch (e.flag) {
    case "advantage":
      return e.attackKind === "all" ? "перевага на атаки" : `перевага на ${e.attackKind === AttackType.MELEE ? "ближні" : "дальні"} атаки`;
    case "disadvantage":
      return "недолік на атаки";
    case "advantageForAttackers":
      return "атакуючі цю ціль мають перевагу";
    case "disadvantageForAttackers":
      return "недолік для атакувальників";
    case "guaranteedHit":
      return "гарантоване влучання";
    case "resistance":
      return `${e.percent >= 100 ? `імунітет: ${e.damageType}` : e.percent < 0 ? `вразливість ${e.damageType} ${-e.percent}%` : `опір ${e.damageType} ${e.percent}%`}${e.attackKind ? ` (${e.attackKind === "ranged" ? "дальні атаки" : "ближні атаки"})` : ""}`;
    case "spellImmunity":
      return e.spellIds ? `імунітет до заклинань (${e.spellIds.length})` : "імунітет до всіх заклинань";
    case "spellTargeting": {
      const scope = e.school ? `закляття школи ${e.school}` : e.spellIds ? `закляття (${e.spellIds.length})` : "закляття";

      return e.mode === "all" ? `${scope} — на всіх` : `${scope} — по області (до ${e.maxTargets ?? DEFAULT_AREA_TARGETS} цілей)`;
    }
    case "counterAttack":
      return `відсіч${e.attackKinds.includes(AttackType.RANGED) ? " (і на дальні)" : ""} +${e.bonusPercent}%`;
    case "attackHitsAllEnemies":
      return "кожна атака б'є всіх ворогів";
    case "moraleChance":
      return `шанс додаткового ходу від моралі +${e.percent}%`;
    case "lifesteal":
      return `атаки лікують на ${e.percent}% завданої шкоди`;
    case "multiTargetFalloff":
      return `додаткові цілі дальньої атаки отримують ${e.percent}% шкоди`;
    case "seeEnemyHp":
      return "бачить HP ворогів";
    case "noRetaliation":
      return "атаки без відсічі";
    case "unlimitedRetaliation":
      return "відповідає на кожну атаку";
    case "noNegativeMorale":
      return "від'ємна мораль = 0";
    case "ignoreMorale":
      return "мораль не діє";
    case "minMorale":
      return `мораль не нижче ${signed(e.value)}`;
    case "conditionImmunity":
      return e.conditions === "all" ? "імунітет до контролю" : `імунітет: ${e.conditions.map((c) => (c === "fear" ? "страх" : c === "berserk" ? "шал" : c === "charm" ? "чарування" : c)).join(", ")}`;
  }
}

export const FLAG_LABELS: Record<FlagKey, string> = {
  advantage: "Перевага",
  disadvantage: "Недолік на свої атаки",
  disadvantageForAttackers: "Недолік для атакувальників",
  advantageForAttackers: "Перевага для атакувальників",
  guaranteedHit: "Гарантоване влучання",
  resistance: "Опір / імунітет до шкоди",
  spellImmunity: "Імунітет до заклинань",
  spellTargeting: "Режим цілей заклять",
  counterAttack: "Контратака",
  attackHitsAllEnemies: "Атака б'є всіх ворогів",
  seeEnemyHp: "Бачить HP ворогів",
  multiTargetFalloff: "Шкода додаткових цілей дальньої атаки",
  lifesteal: "Вампіризм (лікування від шкоди атак)",
  moraleChance: "Шанс додаткового ходу від моралі",
  noRetaliation: "Без відповіді",
  unlimitedRetaliation: "Безмежна відсіч",
  noNegativeMorale: "Мораль не нижче 0",
  ignoreMorale: "Мораль не діє",
  minMorale: "Мінімальна мораль",
  conditionImmunity: "Імунітет до станів",
};

const ATTACK_KIND_ALL = [
  { value: "all", label: "усі" },
  { value: AttackType.MELEE, label: "ближні" },
  { value: AttackType.RANGED, label: "дальні" },
] as const;

const COUNTER_KIND_OPTIONS = [
  { value: AttackType.MELEE, label: "ближня" },
  { value: AttackType.RANGED, label: "дальня" },
] as const;

export const FLAG_FIELDS: Record<FlagKey, readonly FieldMeta[]> = {
  advantage: [{ name: "attackKind", label: "Атаки", input: "select", options: ATTACK_KIND_ALL }],
  disadvantage: [],
  disadvantageForAttackers: [],
  advantageForAttackers: [],
  guaranteedHit: [],
  resistance: [
    { name: "damageType", label: "Тип шкоди (all, physical, spell, fire…)", input: "text" },
    { name: "percent", label: "%, 100 = імунітет, від'ємне = вразливість", input: "number" },
    { name: "attackKind", label: "Лише проти атак", input: "select", options: [{ value: "melee", label: "ближніх" }, { value: "ranged", label: "дальніх" }], optional: true },
  ],
  spellImmunity: [{ name: "spellIds", label: "Заклинання (порожньо = усі)", input: "spells", optional: true }],
  spellTargeting: [
    { name: "mode", label: "Режим", input: "select", options: [{ value: "area", label: "по області" }, { value: "all", label: "на всіх" }] },
    { name: "spellIds", label: "Заклинання", input: "spells", optional: true },
    { name: "school", label: "Школа", input: "text", optional: true },
    { name: "maxTargets", label: "Макс. цілей (область)", input: "number", optional: true },
    { name: "maxLevel", label: "Макс. рівень закляття", input: "number", optional: true },
  ],
  counterAttack: [
    { name: "attackKinds", label: "На атаки", input: "multiselect", options: COUNTER_KIND_OPTIONS },
    { name: "bonusPercent", label: "Бонус шкоди, %", input: "number" },
  ],
  attackHitsAllEnemies: [],
  seeEnemyHp: [],
  multiTargetFalloff: [{ name: "percent", label: "% шкоди додаткових цілей", input: "number" }],
  lifesteal: [{ name: "percent", label: "% завданої шкоди", input: "number" }],
  moraleChance: [{ name: "percent", label: "+% до шансу додаткового ходу", input: "number" }],
  noRetaliation: [],
  unlimitedRetaliation: [],
  noNegativeMorale: [],
  ignoreMorale: [],
  minMorale: [{ name: "value", label: "Мінімум (−3…3)", input: "number" }],
  conditionImmunity: [
    {
      name: "conditions",
      label: "Стани",
      input: "multiselect",
      options: [
        { value: "all", label: "усі (контроль)" },
        { value: "fear", label: "страх" },
        { value: "berserk", label: "шал" },
        { value: "charm", label: "чарування (Ляльковод)" },
        ...Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label })),
      ],
    },
  ],
};
