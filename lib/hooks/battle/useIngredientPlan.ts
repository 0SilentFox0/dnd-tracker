"use client";

import { useMemo } from "react";

import { useBattleScene } from "./useBattleScene";

import { COIN_VALUE } from "@/lib/constants/inventory";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { SpellIngredient } from "@/lib/schemas/spell-ingredients";
import { trackedIngredients } from "@/lib/utils/spells/ingredients";
import { planIngredients } from "@/lib/utils/spells/ingredients/plan";
import { formatMissing, summarizeIngredients } from "@/lib/utils/spells/ingredients/summary";
import type { BattleParticipant } from "@/types/battle";

export interface IngredientLine {
  need: string;
  missing: string;
  payGp: number;
  blocked: boolean;
}

export function useIngredientPlan(caster: BattleParticipant | null, spell: { ingredients?: SpellIngredient[] } | null, skip: boolean): IngredientLine | null {
  const t = useTranslator("spells");

  const rule = useBattleScene().battle.rules?.spellIngredients;

  const stock = caster?.battleData.ingredientStock;

  const list = spell?.ingredients;

  const enabled = !skip && !!rule?.enabled && !!stock && trackedIngredients(list ?? []).length > 0;

  const autoPay = !!rule?.autoPay;

  const plan = useMemo(() => (enabled && stock && list ? planIngredients(list, stock, { autoPay }) : null), [enabled, stock, list, autoPay]);

  if (!plan || !list) return null;

  const need = summarizeIngredients(trackedIngredients(list), { minGp: (gp) => t("ingredients.minGpShort", { gp }), consumed: t("ingredients.consumedShort") });

  return { need, missing: formatMissing(plan.missing), payGp: plan.spendCp / COIN_VALUE.gp, blocked: !plan.ok };
}
