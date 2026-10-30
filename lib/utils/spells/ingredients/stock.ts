import { itemIngredientKey } from "./key";

import { COIN_VALUE } from "@/lib/constants/inventory";
import { normalizeItems } from "@/lib/utils/inventory/items";
import type { IngredientStock } from "@/types/battle";

export const purseToCp = (p: { gold: number; silver: number; copper: number }) => p.gold * COIN_VALUE.gp + p.silver * COIN_VALUE.sp + p.copper * COIN_VALUE.cp;

type StockSource = { items: unknown; gold: number; silver: number; copper: number };

export function buildIngredientStock(inventory: StockSource | null | undefined): IngredientStock {
  const src = inventory ?? { items: [], gold: 0, silver: 0, copper: 0 };

  const items = normalizeItems(src.items).map((i) => ({ id: i.id, key: itemIngredientKey(i), name: i.name, worthGp: i.worthGp ?? 0, qty: i.quantity, used: 0 }));

  return { items, purseCp: purseToCp(src), usedCp: 0 };
}
