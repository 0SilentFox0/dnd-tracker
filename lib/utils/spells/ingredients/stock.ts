import { itemIngredientKey } from "./key";

import { normalizeItems } from "@/lib/utils/inventory/items";
import { toCopper, walletToPurse } from "@/lib/utils/inventory/money";
import type { IngredientStock } from "@/types/battle";

type StockSource = { items: unknown; gold: number; silver: number; copper: number };

export function buildIngredientStock(inventory: StockSource | null | undefined): IngredientStock {
  const src = inventory ?? { items: [], gold: 0, silver: 0, copper: 0 };

  const items = normalizeItems(src.items).map((i) => ({ id: i.id, key: itemIngredientKey(i), name: i.name, worthGp: i.worthGp ?? 0, qty: i.quantity, used: 0 }));

  return { items, purseCp: toCopper(walletToPurse(src)), usedCp: 0 };
}
