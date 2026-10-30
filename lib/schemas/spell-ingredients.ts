import { z } from "zod";

import { INGREDIENT_MIN_GP_MAX, INGREDIENT_NAME_MAX, INGREDIENT_QTY_MAX, SPELL_INGREDIENTS_MAX } from "@/lib/constants/spell-ingredients";
import { ingredientKey } from "@/lib/utils/spells/ingredients/key";

export type SpellIngredient = { name: string; qty: number; minGp?: number; consumed: boolean; focus: boolean };
export type ComponentFlags = { v: boolean; s: boolean; m: boolean };

export const defaultFocus = (i: { minGp?: number; consumed?: boolean }) => !((i.minGp ?? 0) > 0) && !i.consumed;

export const SpellIngredientSchema: z.ZodType<SpellIngredient, unknown> = z.object({
  name: z.string().trim().min(1).max(INGREDIENT_NAME_MAX),
  qty: z.number().int().min(1).max(INGREDIENT_QTY_MAX).default(1),
  minGp: z.number().min(0).max(INGREDIENT_MIN_GP_MAX).optional(),
  consumed: z.boolean().default(false),
  focus: z.boolean(),
});

export const ComponentFlagsSchema: z.ZodType<ComponentFlags> = z.object({ v: z.boolean(), s: z.boolean(), m: z.boolean() });

export const SpellIngredientsSchema = z.array(SpellIngredientSchema).max(SPELL_INGREDIENTS_MAX).refine((list) => new Set(list.map((i) => ingredientKey(i.name))).size === list.length, { message: "spells.ingredients.duplicate" });

export const ingredientsRequireMaterial = (v: { ingredients?: unknown[]; componentFlags?: ComponentFlags | null }) => !v.ingredients?.length || v.componentFlags?.m === true;
