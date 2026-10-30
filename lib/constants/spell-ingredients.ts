export const SPELL_INGREDIENTS_MAX = 8;
export const INGREDIENT_NAME_MAX = 80;
export const INGREDIENT_QTY_MAX = 99;
export const INGREDIENT_MIN_GP_MAX = 100000;

export const INGREDIENT_PRESETS = [
  { id: "gem", minGp: 100, consumed: true },
  { id: "powder", consumed: true },
  { id: "holySymbol", minGp: 5, consumed: false },
  { id: "focus", consumed: false },
] as const satisfies ReadonlyArray<{ id: string; minGp?: number; consumed: boolean }>;

export type IngredientPresetId = (typeof INGREDIENT_PRESETS)[number]["id"];
