import { itemIngredientKey } from "./key";

import { COIN_VALUE } from "@/lib/constants/inventory";
import { normalizeItems } from "@/lib/utils/inventory/items";
import type { IngredientStock } from "@/types/battle";

export const purseToCp = (p: { gold: number; silver: number; copper: number }) => p.gold * COIN_VALUE.gp + p.silver * COIN_VALUE.sp + p.copper * COIN_VALUE.cp;

export function buildIngredientStock(inventory: { items: unknown; gold: number; silver: number; copper: number }): IngredientStock | undefined {
  const items = normalizeItems(inventory.items).map((i) => ({ id: i.id, key: itemIngredientKey(i), name: i.name, worthGp: i.worthGp ?? 0, qty: i.quantity, used: 0 }));

  const purseCp = purseToCp(inventory);

  if (!items.length && purseCp <= 0) return undefined;

  return { items, purseCp, usedCp: 0 };
}
