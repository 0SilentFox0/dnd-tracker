import type { SpellSlotProgression } from "@/types/races";

export const DEFAULT_SPELL_SLOT_PROGRESSION: SpellSlotProgression[] = [1, 2, 3, 4, 5].map((level) => ({ level, slots: 0 }));

export const SPELL_IDS_QUERY_MAX = 200;

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

export function spellLevelRoman(level: number): string {
  return ROMAN_NUMERALS[Math.max(0, level)] ?? String(level);
}

const SPELL_SCHOOL_COLORS: Record<string, string> = {
  Природа: "#12a52b",
  Світло: "#f2b300",
  Темрява: "#7a1fe6",
  Хаос: "#ec1c0c",
};

export function spellSchoolColor(name: string | null | undefined): string {
  return (name && SPELL_SCHOOL_COLORS[name]) || "#6d7177";
}

export const SPELL_COST_LABELS = {
  action: "Дія",
  bonusAction: "Бонусна дія",
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
} as const;

export const SPELL_SAVE_ON_SUCCESS_LABELS = {
  half: "Половина шкоди",
  none: "Без ефекту",
} as const;

export const labelOptions = <K extends string>(labels: Record<K, string>) =>
  (Object.entries(labels) as [K, string][]).map(([value, label]) => ({ value, label }));
