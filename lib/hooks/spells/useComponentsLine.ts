"use client";

import { useTranslator } from "@/lib/i18n/use-translator";
import type { ComponentFlags, SpellIngredient } from "@/lib/schemas/spell-ingredients";
import { summarizeIngredients } from "@/lib/utils/spells/ingredients/summary";

interface ComponentsSource {
  ingredients?: SpellIngredient[];
  componentFlags?: ComponentFlags | null;
  components?: string | null;
}

export function useComponentsLine(spell: ComponentsSource): string | null {
  const t = useTranslator("spells");

  const { componentFlags: flags, ingredients = [], components } = spell;

  if (!flags) return components?.trim() || null;

  const letters = (["v", "s", "m"] as const).filter((k) => flags[k]).map((k) => k.toUpperCase());

  if (letters.length === 0) return null;

  const list = flags.m ? summarizeIngredients(ingredients, { minGp: (gp) => t("ingredients.minGpShort", { gp }), consumed: t("ingredients.consumedShort") }) : "";

  return list ? `${letters.join(" ")} · ${list}` : letters.join(" ");
}
