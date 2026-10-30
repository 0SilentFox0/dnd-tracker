import { INGREDIENT_PRESETS, type IngredientPresetId } from "@/lib/constants/spell-ingredients";
import { defaultFocus, type SpellIngredient } from "@/lib/schemas/spell-ingredients";

export function ingredientFromPreset(id: IngredientPresetId, name: string): SpellIngredient {
  const preset = INGREDIENT_PRESETS.find((p) => p.id === id);

  const base = { name, qty: 1, consumed: preset?.consumed ?? false, ...(preset && "minGp" in preset && { minGp: preset.minGp }) };

  return { ...base, focus: defaultFocus(base) };
}

export const blankIngredient = (name = ""): SpellIngredient => ({ name, qty: 1, consumed: false, focus: true });

/** Focus follows its default until the user flips it by hand. */
export function patchIngredient(current: SpellIngredient, patch: Partial<SpellIngredient>): SpellIngredient {
  const next = { ...current, ...patch };

  if (!("focus" in patch) && current.focus === defaultFocus(current)) next.focus = defaultFocus(next);

  return next;
}
