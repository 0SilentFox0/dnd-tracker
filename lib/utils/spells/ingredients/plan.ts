import { ingredientKey, trackedIngredients } from "./key";

import { COIN_VALUE } from "@/lib/constants/inventory";
import type { SpellIngredient } from "@/lib/utils/spells/ingredients/types";
import type { IngredientStock } from "@/types/battle";

export interface IngredientPlan {
  ok: boolean;
  spendItems: Record<string, number>;
  spendCp: number;
  missing: Array<{ name: string; qty: number; minGp?: number }>;
}

export function planIngredients(ingredients: SpellIngredient[], stock: IngredientStock, opts: { autoPay: boolean }): IngredientPlan {
  const taken: Record<string, number> = {};

  const held: Record<string, number> = {};

  const missing: IngredientPlan["missing"] = [];

  let spendCp = 0;

  for (const ing of trackedIngredients(ingredients)) {
    const key = ingredientKey(ing.name);

    const minGp = ing.minGp ?? 0;

    const candidates = stock.items.filter((i) => i.key === key && i.worthGp >= minGp).sort((a, b) => a.worthGp - b.worthGp);

    let rest = ing.qty;

    for (const item of candidates) {
      if (rest <= 0) break;

      const take = Math.min(rest, item.qty - item.used - (held[item.id] ?? 0));

      if (take <= 0) continue;

      held[item.id] = (held[item.id] ?? 0) + take;

      if (ing.consumed) taken[item.id] = (taken[item.id] ?? 0) + take;

      rest -= take;
    }

    if (rest <= 0) continue;

    if (!ing.consumed) {
      missing.push({ name: ing.name, qty: rest, ...(ing.minGp !== undefined && { minGp: ing.minGp }) });
      continue;
    }

    const cost = Math.round(minGp * COIN_VALUE.gp) * rest;

    if (opts.autoPay && minGp > 0 && stock.purseCp - stock.usedCp - spendCp >= cost) spendCp += cost;
    else missing.push({ name: ing.name, qty: rest, ...(ing.minGp !== undefined && { minGp: ing.minGp }) });
  }

  if (missing.length) return { ok: false, spendItems: {}, spendCp: 0, missing };

  return { ok: true, spendItems: taken, spendCp, missing };
}

export const applyIngredientPlan = (stock: IngredientStock, plan: IngredientPlan): IngredientStock => ({
  items: stock.items.map((i) => ({ ...i, used: i.used + (plan.spendItems[i.id] ?? 0) })),
  purseCp: stock.purseCp,
  usedCp: stock.usedCp + plan.spendCp,
});
