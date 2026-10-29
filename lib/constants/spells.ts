import { SPELL_GROUP_FALLBACK_COLOR } from "@/lib/constants/spell-groups";
import type { SpellSlotProgression } from "@/types/races";

export const DEFAULT_SPELL_SLOT_PROGRESSION: SpellSlotProgression[] = [1, 2, 3, 4, 5].map((level) => ({ level, slots: 0 }));

export const SPELL_IDS_QUERY_MAX = 200;

export const MAX_SPELL_LEVEL = 9;

/* eslint-disable no-restricted-syntax -- spell group names stored in the DB */
const SPELL_CIRCLE_ORDINALS = ["", "Перше", "Друге", "Третє", "Четверте", "П'яте", "Шосте", "Сьоме", "Восьме", "Дев'яте"];

const CANTRIP_NAME = "Замовляння";

export const ROMAN_NUMERALS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

export function spellLevelName(level: number): string {
  if (level <= 0) return CANTRIP_NAME;

  const ordinal = SPELL_CIRCLE_ORDINALS[level];

  return ordinal ? `${ordinal} коло` : `${level}-те коло`;
}

export function spellLevelFromName(name: string): number {
  if (name === CANTRIP_NAME) return 0;

  const index = SPELL_CIRCLE_ORDINALS.findIndex((ordinal, i) => i > 0 && name === `${ordinal} коло`);

  return index > 0 ? index : parseInt(name, 10) || 0;
}

/* eslint-enable no-restricted-syntax */

export function spellLevelRoman(level: number): string {
  return ROMAN_NUMERALS[Math.max(0, level)] ?? String(level);
}

export function spellSchoolColor(group: { color?: string | null } | null | undefined): string {
  return group?.color || SPELL_GROUP_FALLBACK_COLOR;
}

/* eslint-disable no-restricted-syntax -- uk facet labels of the cached info reference (lib/utils/spells/model/labels.ts); UI reads spells.* keys */
export const SPELL_COST_LABELS = {
  action: "Дія",
  bonusAction: "Бонусна дія",
  reaction: "Реакція",
  long: "Тривале накладання",
} as const;

export const SPELL_TARGETING_LABELS = {
  enemy: "Один ворог",
  ally: "Один союзник",
  self: "Заклинатель",
  allyDead: "Полеглий союзник",
  allAlliesDead: "Усі полеглі союзники",
  area: "Область (до N цілей)",
  template: "Шаблон на карті",
  allAllies: "Усі союзники",
  allEnemies: "Усі вороги",
  everyone: "Усі учасники",
} as const;

export const TEMPLATE_SHAPE_LABELS = {
  circle: "Коло",
  cube: "Куб",
  cone: "Конус",
  line: "Лінія",
  cross: "Хрест",
  emanation: "Еманація",
} as const;

export const SPELL_SAVE_ON_SUCCESS_LABELS = {
  half: "Половина шкоди",
  none: "Без ефекту",
} as const;

export const SPELL_NAME_MAX = 100;
