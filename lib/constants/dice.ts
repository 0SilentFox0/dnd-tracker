export const DICE_OPTIONS = [
  { value: "d4", label: "d4" },
  { value: "d6", label: "d6" },
  { value: "d8", label: "d8" },
  { value: "d10", label: "d10" },
  { value: "d12", label: "d12" },
  { value: "d20", label: "d20" },
  { value: "d100", label: "d100" },
] as const;

export type DiceType = (typeof DICE_OPTIONS)[number]["value"];

export const DICE_LABELS = DICE_OPTIONS.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {}
);

export function getDiceLabel(value?: string | null): string {
  if (!value) return "";
  return DICE_LABELS[value] || value;
}
