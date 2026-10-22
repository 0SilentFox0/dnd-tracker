import type { Prisma } from "@prisma/client";

import "server-only";

export type LogInput = { campaignId: string; characterId: string; actorUserId: string; kind: string; delta: Record<string, unknown>; note: string | null };

export const writeInventoryLog = (tx: Prisma.TransactionClient, entries: LogInput[]) =>
  tx.inventoryLog.createMany({ data: entries.map((e) => ({ ...e, delta: e.delta as Prisma.InputJsonValue })) });
