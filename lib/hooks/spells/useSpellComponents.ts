"use client";

import { useMemo } from "react";

import type { IngredientPresetId } from "@/lib/constants/spell-ingredients";
import { SPELL_INGREDIENTS_MAX } from "@/lib/constants/spell-ingredients";
import { useTranslator } from "@/lib/i18n/use-translator";
import { ingredientKey } from "@/lib/utils/spells/ingredients/key";
import { blankIngredient, ingredientFromPreset, patchIngredient } from "@/lib/utils/spells/ingredients/presets";
import { deriveComponentFlags, summarizeIngredients } from "@/lib/utils/spells/ingredients/summary";
import type { ComponentFlags, SpellIngredient } from "@/lib/utils/spells/ingredients/types";
import type { SpellFormData } from "@/types/spells";

const NO_FLAGS: ComponentFlags = { v: false, s: false, m: false };

export function useSpellComponents(form: { data: SpellFormData; set: (data: SpellFormData) => void }) {
  const t = useTranslator("spells");

  const { data, set } = form;

  const ingredients = useMemo(() => data.ingredients ?? [], [data.ingredients]);

  const flags = data.componentFlags ?? deriveComponentFlags(data.components) ?? NO_FLAGS;

  const setFlag = (key: keyof ComponentFlags, on: boolean) => {
    const next = { ...flags, [key]: on };

    set({ ...data, componentFlags: next, ...(key === "m" && !on && { ingredients: [] }) });
  };

  const setIngredients = (list: SpellIngredient[]) => set({ ...data, componentFlags: { ...flags, m: true }, ingredients: list });

  const seen = new Set<string>();

  const duplicates = new Set<number>();

  ingredients.forEach((i, idx) => {
    const key = ingredientKey(i.name);

    if (!key) return;

    if (seen.has(key)) duplicates.add(idx);

    seen.add(key);
  });

  const summary = summarizeIngredients(ingredients, { minGp: (gp) => t("ingredients.minGpShort", { gp }), consumed: t("ingredients.consumedShort") });

  return {
    flags,
    setFlag,
    ingredients,
    duplicates,
    summary,
    canAdd: ingredients.length < SPELL_INGREDIENTS_MAX,
    add: () => setIngredients([...ingredients, blankIngredient()]),
    addPreset: (id: IngredientPresetId) => setIngredients([...ingredients, ingredientFromPreset(id, t(`ingredients.presets.${id}`))]),
    update: (index: number, patch: Partial<SpellIngredient>) => setIngredients(ingredients.map((i, n) => (n === index ? patchIngredient(i, patch) : i))),
    remove: (index: number) => setIngredients(ingredients.filter((_, n) => n !== index)),
  };
}
