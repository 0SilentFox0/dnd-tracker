/**
 * Підказки для JSON бонусу сету (ArtifactSet.setBonus).
 * Див. також lib/types/artifact-set-bonus.ts та docs/ARTIFACT-SETS.md
 */

import type { SelectOption } from "@/components/ui/select-field";
import { EFFECT_STAT_OPTIONS } from "@/lib/constants/skill-effects";

/** Плоскі числові бонуси (merge-set-bonus). */
export const ARTIFACT_SET_FLAT_BONUS_OPTIONS: SelectOption[] = [
  { value: "strength", label: "Сила" },
  { value: "dexterity", label: "Спритність" },
  { value: "constitution", label: "Статура" },
  { value: "intelligence", label: "Інтелект" },
  { value: "wisdom", label: "Мудрість" },
  { value: "charisma", label: "Харизма" },
  { value: "armorClass", label: "Клас броні" },
  { value: "speed", label: "Швидкість" },
  { value: "initiative", label: "Ініціатива" },
  { value: "morale", label: "Мораль" },
  { value: "minTargets", label: "Мін. цілей" },
  { value: "maxTargets", label: "Макс. цілей" },
];

/** Модифікатори як у synthetic equipped artifact (attack / damage / цілі). */
export const ARTIFACT_SET_MODIFIER_OPTIONS: SelectOption[] = [
  { value: "melee_damage", label: "Шкода ближня" },
  { value: "ranged_damage", label: "Шкода дальня" },
  { value: "physical_damage", label: "Шкода фізична (мілі + дальн.)" },
  { value: "all_damage", label: "Шкода (усі фізичні атаки)" },
  { value: "damageMelee", label: "Шкода ближня (legacy)" },
  { value: "damageRanged", label: "Шкода дальня (legacy)" },
  { value: "attack", label: "Бонус до кидка атаки" },
  { value: "min_targets", label: "Мін. цілей (модифікатор)" },
  { value: "max_targets", label: "Макс. цілей (модифікатор)" },
];

const ARTIFACT_SET_PASSIVE_STATS = new Set([
  "hp_bonus",
  "physical_resistance",
  "spell_resistance",
  "all_resistance",
  "morale",
  "crit_threshold",
  "spell_levels",
  "spell_slots_lvl4_5",
  "enemy_attack_disadvantage",
  "advantage",
  "spell_targets_lvl4_5",
  "light_spells_target_all_allies",
  "control_units",
  "morale_per_kill",
  "morale_per_ally_death",
]);

/** Пасиви сету — тільки те, що обробляє apply-set-passive-effects. */
export const ARTIFACT_SET_PASSIVE_STAT_OPTIONS: SelectOption[] =
  EFFECT_STAT_OPTIONS.filter((o) => ARTIFACT_SET_PASSIVE_STATS.has(o.value));

export const ARTIFACT_SET_PASSIVE_FLAG_STATS = new Set([
  "enemy_attack_disadvantage",
  "advantage",
  "light_spells_target_all_allies",
]);

export const SPELL_SLOT_LEVEL_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
] as const;

export const ARTIFACT_SET_FLAT_BONUS_KEYS = ARTIFACT_SET_FLAT_BONUS_OPTIONS.map(
  (o) => o.value,
);

export const ARTIFACT_SET_BONUS_JSON_PLACEHOLDER = `{
  "description": "Короткий опис бонусу повного сету",
  "bonuses": {
    "strength": 2,
    "morale": 1,
    "armorClass": 1,
    "minTargets": 0,
    "maxTargets": 1
  },
  "modifiers": [
    { "type": "damageMelee", "value": 15, "isPercentage": true },
    { "type": "attack", "value": 1 }
  ],
  "spellSlotBonus": {
    "3": 1,
    "4": 1
  },
  "passiveEffects": [
    { "stat": "advantage", "type": "flat", "value": 1 },
    { "stat": "spell_targets_lvl4_5", "value": 1 }
  ]
}`;
