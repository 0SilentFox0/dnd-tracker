"use client";

import { useCallback, useMemo, useState } from "react";

import { buildRecipe, type Recipe, type RecipeContext, type RecipeValues } from "@/lib/utils/abilities/templates";

const defaultsOf = (recipe: Recipe | null): RecipeValues => Object.fromEntries((recipe?.params ?? []).map((p) => [p.key, p.default]));

export function useRecipeValues(recipe: Recipe | null, ctx: RecipeContext) {
  const [edits, setEdits] = useState<{ id: string | null; values: RecipeValues }>({ id: null, values: {} });

  const id = recipe?.id ?? null;

  const values = useMemo(() => ({ ...defaultsOf(recipe), ...(edits.id === id ? edits.values : {}) }), [recipe, id, edits]);

  const set = useCallback((key: string, v: string | number) => setEdits((prev) => ({ id, values: { ...(prev.id === id ? prev.values : {}), [key]: v } })), [id]);

  const reset = useCallback(() => setEdits({ id: null, values: {} }), []);

  const built = useMemo(() => (recipe ? buildRecipe(recipe, values, ctx) : null), [recipe, values, ctx]);

  return { values, set, built, reset };
}
