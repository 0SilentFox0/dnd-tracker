import { characterKeys } from "./keys";

import { transferArtifact } from "@/lib/api/inventory";
import { useCrudMutation } from "@/lib/hooks/common";

export function useTransferArtifact(campaignId: string, characterId: string) {
  return useCrudMutation({
    mutationFn: (body: { toCharacterId: string; slot?: string; artifactId?: string }) => transferArtifact(campaignId, characterId, body),
    awaitInvalidation: true,
    invalidateKeys: [characterKeys.sheet(campaignId), characterKeys.roster(campaignId), characterKeys.details(campaignId), characterKeys.stashes(campaignId), characterKeys.inventoryLogs(campaignId), characterKeys.freeArtifacts(campaignId)],
  });
}
