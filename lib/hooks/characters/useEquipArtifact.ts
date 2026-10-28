import { characterKeys } from "./keys";

import { updateInventory } from "@/lib/api/inventory";
import { useCrudMutation } from "@/lib/hooks/common";

interface EquipSlotChange {
  slot: string;
  artifactId: string | null;
}

export function useEquipArtifact(campaignId: string, characterId?: string) {
  return useCrudMutation({
    mutationFn: (equipSlot: EquipSlotChange) => {
      if (!characterId) throw new Error("Немає персонажа");

      return updateInventory(campaignId, characterId, { equipSlot });
    },
    awaitInvalidation: true,
    invalidateKeys: [characterKeys.sheet(campaignId, characterId), characterKeys.roster(campaignId), characterKeys.stashes(campaignId), characterKeys.freeArtifacts(campaignId)],
  });
}
