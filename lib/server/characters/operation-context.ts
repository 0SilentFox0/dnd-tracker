import type { Prisma } from "@prisma/client";

import { lockCharacters } from "./lock";

export { operationAccess, operationDM } from "./campaign-access";

import { lockCampaignArtifacts } from "@/lib/server/artifacts/lock";
import { withCampaignContentWrite } from "@/lib/server/content/write";

export function characterIds(input: Record<string, unknown>): string[] {
  return [...new Set([input.characterId, input.toCharacterId, ...(Array.isArray(input.characterIds) ? input.characterIds : [])].filter((id): id is string => typeof id === "string" && id.length > 0))].sort();
}

export function withCharacterOperation<T>(campaignId: string, operation: string, input: Record<string, unknown>, callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return withCampaignContentWrite(campaignId, async tx => {
    // Keep artifact ownership serialization before any character/inventory row locks.
    if (["inventory-update", "stash-update", "transfer", "inventory.patch", "stash.apply"].includes(operation)) await lockCampaignArtifacts(tx, campaignId);

    const ids = operation === "delete-all"
      ? (await tx.character.findMany({ where: { campaignId, type: "player" }, select: { id: true }, orderBy: { id: "asc" } })).map(row => row.id)
      : characterIds(input);

    await lockCharacters(tx, ids);

    return callback(tx);
  });
}
