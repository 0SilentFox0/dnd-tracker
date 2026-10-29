import type { Prisma } from "@prisma/client";

import "server-only";

// pg_advisory_xact_lock повертає void — $queryRaw не вміє його десеріалізувати, тому $executeRaw
export const lockCampaignArtifacts = (tx: Prisma.TransactionClient, campaignId: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`artifacts:${campaignId}`}))`;
