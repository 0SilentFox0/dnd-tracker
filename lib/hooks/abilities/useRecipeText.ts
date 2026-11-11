"use client";

import { useCallback } from "react";

import { useTranslator } from "@/lib/i18n/use-translator";
import type { Recipe } from "@/lib/utils/abilities/templates";

export function useRecipeText(): (r: Recipe, suffix: string) => string {
  const root = useTranslator();

  const tr = useTranslator("abilityRegistry");

  return useCallback((r, suffix) => (r.textKey ? root(`${r.textKey}.${suffix}`) : tr(`templates.${r.id}.${suffix}`)), [root, tr]);
}
