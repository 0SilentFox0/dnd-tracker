import type { Prisma } from "@prisma/client";

import "server-only";

export const ensureInventory = (tx: Prisma.TransactionClient, characterId: string) =>
  tx.characterInventory.upsert({
    where: { characterId },
    create: { characterId, equipped: {}, backpack: [], items: [], stash: [], gold: 0, silver: 0, copper: 0 },
    update: {},
  });
