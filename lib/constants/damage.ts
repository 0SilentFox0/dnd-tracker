export const DAMAGE_ELEMENT_OPTIONS = [
  { value: "fire", label: "Вогонь" },
  { value: "cold", label: "Лід" },
  { value: "lightning", label: "Блискавка" },
  { value: "acid", label: "Кислота" },
  { value: "poison", label: "Отрута" },
  { value: "necrotic", label: "Некротична" },
  { value: "radiant", label: "Світло" },
  { value: "thunder", label: "Грім" },
  { value: "psychic", label: "Психічна" },
  { value: "force", label: "Сила" },
  { value: "bludgeoning", label: "Дробляча" },
  { value: "piercing", label: "Колюча" },
  { value: "slashing", label: "Рубляча" },
  { value: "bleed", label: "Кровотеча" },
] as const;

export const DAMAGE_ELEMENT_LABELS = DAMAGE_ELEMENT_OPTIONS.reduce<
  Record<string, string>
>((acc, option) => {
  acc[option.value] = option.label;

  return acc;
}, {});

export function getDamageElementLabel(value?: string | null): string {
  if (!value) return "Без модифікатора";

  return DAMAGE_ELEMENT_LABELS[value] || value;
}

export const PHYSICAL_DAMAGE_TYPES: readonly string[] = ["slashing", "piercing", "bludgeoning", "physical"];
