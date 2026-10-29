import type { Prisma } from "@prisma/client";

import "server-only";
import { notifyCharacterOwners } from "@/lib/server/notifications/notify";
import { inventoryNotificationEvents } from "@/lib/utils/notifications/events";

export type LogInput = { campaignId: string; characterId: string; actorUserId: string; kind: string; delta: Record<string, unknown>; note: string | null };

export async function writeInventoryLog(tx: Prisma.TransactionClient, entries: LogInput[]) {
  const result = await tx.inventoryLog.createMany({ data: entries.map((e) => ({ ...e, delta: e.delta as Prisma.InputJsonValue })) });

  const events = inventoryNotificationEvents(entries);

  if (events.length) await notifyCharacterOwners({ campaignId: entries[0].campaignId, actorUserId: entries[0].actorUserId, events }, tx);

  return result;
}
