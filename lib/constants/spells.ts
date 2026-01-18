export const SPELL_TARGET_OPTIONS = [
  { value: "enemies", label: "Вороги" },
  { value: "allies", label: "Союзники" },
  { value: "all", label: "Усі" },
] as const;

export const DAMAGE_MODIFIER_OPTIONS = [
  { value: "control", label: "Контроль" },
  { value: "charm", label: "Причарування" },
  { value: "sleep", label: "Сон" },
  { value: "state", label: "Стан" },
  { value: "burning", label: "Підпал" },
  { value: "poison", label: "Отрута" },
  { value: "freezing", label: "Замородення" },
] as const;

export const HEAL_MODIFIER_OPTIONS = [
  { value: "heal", label: "Лікування" },
  { value: "regeneration", label: "Регенерація" },
  { value: "dispel", label: "Розвіювання" },
  { value: "shield", label: "Щит" },
  { value: "vampirism", label: "Вампіризм" },
] as const;

export const DAMAGE_MODIFIER_LABELS = DAMAGE_MODIFIER_OPTIONS.reduce<
  Record<string, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export const HEAL_MODIFIER_LABELS = HEAL_MODIFIER_OPTIONS.reduce<
  Record<string, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export const SPELL_TARGET_LABELS = SPELL_TARGET_OPTIONS.reduce<
  Record<string, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export function getDamageModifierLabel(value?: string | null): string {
  if (!value) return "";
  return DAMAGE_MODIFIER_LABELS[value] || value;
}

export function getHealModifierLabel(value?: string | null): string {
  if (!value) return "";
  return HEAL_MODIFIER_LABELS[value] || value;
}

export function getSpellTargetLabel(value?: string | null): string {
  if (!value) return "";
  return SPELL_TARGET_LABELS[value] || value;
}
