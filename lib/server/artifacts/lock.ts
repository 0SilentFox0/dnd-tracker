import type { Prisma } from "@prisma/client";

import "server-only";

// pg_advisory_xact_lock повертає void — $queryRaw не вміє його десеріалізувати, тому $executeRaw
export const lockCampaignArtifacts = (tx: Prisma.TransactionClient, campaignId: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`artifacts:${campaignId}`}))`;

export const ensureInventory = (tx: Prisma.TransactionClient, characterId: string) =>
  tx.characterInventory.upsert({
    where: { characterId },
    create: { characterId, equipped: {}, backpack: [], items: [], gold: 0, silver: 0, copper: 0 },
    update: {},
  });
