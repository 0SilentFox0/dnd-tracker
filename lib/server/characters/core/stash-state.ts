import type { Prisma } from "@prisma/client";

import { ensureInventory } from "@/lib/server/artifacts/inventory";
import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";
import { attunedRefs } from "@/lib/utils/items/resolve";
import type { EquippedItems, StashState } from "@/types/inventory";

export async function loadStashState(tx: Prisma.TransactionClient, characterId: string): Promise<StashState> {
  const inv = await ensureInventory(tx, characterId);

  return {
    equipped: inv.equipped as EquippedItems,
    stash: normalizeStash(inv.stash),
    items: normalizeItems(inv.items),
    purse: { gp: inv.gold, sp: inv.silver, cp: inv.copper },
    attuned: attunedRefs(inv),
  };
}
