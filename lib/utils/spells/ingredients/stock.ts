import { itemIngredientKey } from "./key";

import { normalizeItems } from "@/lib/utils/inventory/items";
import { toCopper, walletToPurse } from "@/lib/utils/inventory/money";
import type { IngredientStock } from "@/types/battle";

type StockSource = { items: unknown; gold: number; silver: number; copper: number };

/** Battle state reaches every viewer: artifact-linked items are left out and the purse is only included when autoPay needs it. */
export function buildIngredientStock(inventory: StockSource | null | undefined, opts: { withPurse: boolean }): IngredientStock {
  const src = inventory ?? { items: [], gold: 0, silver: 0, copper: 0 };

  const items = normalizeItems(src.items).filter((i) => !i.artifactId && i.quantity > 0).map((i) => ({ id: i.id, key: itemIngredientKey(i), name: i.name, worthGp: i.worthGp ?? 0, qty: i.quantity, used: 0 }));

  return { items, purseCp: opts.withPurse ? toCopper(walletToPurse(src)) : 0, usedCp: 0 };
}
