import type { Prisma } from "@prisma/client";

import "server-only";

export const lockPlayerDrafts = (tx: Prisma.TransactionClient, campaignId: string, userId: string) =>
  tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`draft:${campaignId}:${userId}`}))`;
