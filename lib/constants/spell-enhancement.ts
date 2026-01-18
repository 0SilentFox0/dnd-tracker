export const SPELL_ENHANCEMENT_TYPES = [
  { value: "effect_increase", label: "Збільшення ефекту" },
  { value: "target_change", label: "Зміна Таргету" },
  { value: "additional_modifier", label: "Додатковий модифікатор" },
  { value: "new_spell", label: "Нове заклинання" },
] as const;

export type SpellEnhancementType =
  (typeof SPELL_ENHANCEMENT_TYPES)[number]["value"];

export const SPELL_ENHANCEMENT_LABELS = SPELL_ENHANCEMENT_TYPES.reduce<
  Record<string, string>
>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export function getSpellEnhancementTypeLabel(
  value?: string | null
): string {
  if (!value) return "";
  return SPELL_ENHANCEMENT_LABELS[value] || value;
}
