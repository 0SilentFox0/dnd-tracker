/**
 * Константи для ефектів скілів (stat, type, тощо)
 */

import type { SelectOption } from "@/components/ui/select-field";

// ---------- Effect type ----------

export const EFFECT_TYPES = [
  "percent",
  "flat",
  "formula",
  "dice",
  "flag",
  "ignore",
  "stack",
  "min",
] as const;

export type EffectType = (typeof EFFECT_TYPES)[number];

export const EFFECT_TYPE_OPTIONS: SelectOption[] = [
  { value: "percent", label: "Відсоток (%)" },
  { value: "flat", label: "Фіксоване число" },
  { value: "formula", label: "Формула" },
  { value: "dice", label: "Кубики (dice)" },
  { value: "flag", label: "Прапорець (flag)" },
  { value: "ignore", label: "Ігнорування" },
  { value: "stack", label: "Стак (stack)" },
  { value: "min", label: "Мінімум (min)" },
];

/** Типи, що потребують текстового вводу (не числового) */
export const TEXT_VALUE_TYPES: ReadonlySet<string> = new Set(["formula", "dice"]);

/** Типи, що є прапорцями (boolean, не мають числового значення) */
export const FLAG_VALUE_TYPES: ReadonlySet<string> = new Set(["flag", "ignore"]);

// ---------- Effect stat ----------

export const EFFECT_STAT_OPTIONS: SelectOption[] = [
  // Бойові
  { value: "melee_damage", label: "Шкода ближня" },
  { value: "ranged_damage", label: "Шкода дальня" },
  { value: "all_damage", label: "Шкода (вся)" },
  { value: "counter_damage", label: "Контр-атака" },
  { value: "area_damage", label: "Площинна шкода" },

  // DOT
  { value: "bleed_damage", label: "Кровотеча (DOT)" },
  { value: "poison_damage", label: "Отрута (DOT)" },
  { value: "burn_damage", label: "Опік (DOT)" },
  { value: "fire_damage", label: "Вогняна шкода (DOT)" },

  // Захист
  { value: "armor", label: "Броня" },
  { value: "hp_bonus", label: "Бонус HP" },
  { value: "physical_resistance", label: "Резист фізичний" },
  { value: "spell_resistance", label: "Резист магічний" },
  { value: "all_resistance", label: "Резист (увесь)" },
  { value: "damage_resistance", label: "Зниження шкоди" },

  // Характеристики
  { value: "speed", label: "Швидкість" },
  { value: "initiative", label: "Ініціатива" },
  { value: "morale", label: "Мораль" },
  { value: "crit_threshold", label: "Поріг криту" },

  // Магія
  { value: "spell_levels", label: "Рівень заклинань" },
  { value: "spell_slots_lvl4_5", label: "Слоти 4-5 рівня" },
  { value: "spell_targets_lvl4_5", label: "Цілі 4-5 рівня" },

  // Тактичні
  { value: "advantage", label: "Перевага (advantage)" },
  { value: "enemy_attack_disadvantage", label: "Недолік ворожої атаки" },
  { value: "guaranteed_hit", label: "Гарантований удар" },
  { value: "attack_before_enemy", label: "Атака перед ворогом" },
  { value: "control_units", label: "Контроль юнітів" },

  // Бойові дії
  { value: "summon_tier", label: "Виклик істоти (tier)" },
  { value: "redirect_physical_damage", label: "Перенаправлення шкоди" },
  { value: "marked_targets", label: "Позначені цілі" },
  { value: "extra_casts", label: "Додаткові касти" },
  { value: "restore_spell_slot", label: "Відновлення слоту" },
  { value: "field_damage", label: "Пекельна земля (AoE)" },
  { value: "revive_hp", label: "Воскресіння HP" },
  { value: "runic_attack", label: "Рунічна атака" },
  { value: "blood_sacrifice_heal", label: "Кровожертсво" },
  { value: "clear_negative_effects", label: "Зняття негативних ефектів" },
  { value: "morale_per_kill", label: "Мораль за вбивство" },
  { value: "morale_per_ally_death", label: "Мораль за смерть союзника" },
  { value: "light_spells_target_all_allies", label: "Заклинання світла на всіх" },
];

// ---------- Effect target ----------

export const EFFECT_TARGET_OPTIONS: SelectOption[] = [
  { value: "self", label: "Сам" },
  { value: "enemy", label: "Ворог" },
  { value: "all_allies", label: "Союзники" },
  { value: "all_enemies", label: "Вороги" },
  { value: "all", label: "Усі" },
];

// ---------- Lookup helpers ----------

const _statLabelMap = new Map(EFFECT_STAT_OPTIONS.map((o) => [o.value, o.label]));
const _typeLabelMap = new Map(EFFECT_TYPE_OPTIONS.map((o) => [o.value, o.label]));

/** Повертає людино-читабельну назву stat */
export function getStatLabel(stat: string): string {
  return _statLabelMap.get(stat) ?? stat;
}

/** Повертає людино-читабельну назву типу ефекту */
export function getTypeLabel(type: string): string {
  return _typeLabelMap.get(type) ?? type;
}

/** Чи потребує цей тип текстового вводу для value */
export function isTextValueType(type: string): boolean {
  return TEXT_VALUE_TYPES.has(type);
}

/** Чи є цей тип прапорцем (boolean) */
export function isFlagValueType(type: string): boolean {
  return FLAG_VALUE_TYPES.has(type);
}
