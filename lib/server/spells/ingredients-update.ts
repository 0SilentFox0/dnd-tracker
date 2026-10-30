import { API_ERRORS } from "@/lib/constants/api-errors";
import type { UpdateSpellInput } from "@/lib/schemas";
import { readStoredIngredients } from "@/lib/schemas/spell-ingredients";
import { ContentError } from "@/lib/server/content/errors";
import type { ComponentFlags } from "@/lib/utils/spells/ingredients/types";

type StoredSpell = { ingredients: unknown; componentFlags: unknown };

/** Resolves the ingredients column for a partial update against the stored row; switching M off clears the list, like the form. */
export function resolveIngredientsUpdate(existing: StoredSpell, data: Pick<UpdateSpellInput, "ingredients" | "componentFlags">) {
  if (data.ingredients?.length && data.componentFlags === undefined) {
    const stored = existing.componentFlags as Partial<ComponentFlags> | null;

    if (stored?.m !== true) throw new ContentError(API_ERRORS.INVALID_BODY, 400, [{ message: "spells.ingredients.needsMaterial", path: ["componentFlags"] }]);
  }

  if (data.ingredients === undefined && data.componentFlags && !data.componentFlags.m && readStoredIngredients(existing.ingredients).length > 0) return [];

  return data.ingredients;
}
