import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterKeys, characterSheetKey } from "./keys";

import { updateInventory } from "@/lib/api/inventory";

export interface EquipSlotChange {
  slot: string;
  artifactId: string | null;
}

export function useEquipArtifact(campaignId: string, characterId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (equipSlot: EquipSlotChange) => {
      if (!characterId) throw new Error("Немає персонажа");

      return updateInventory(campaignId, characterId, { equipSlot });
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: characterSheetKey(campaignId, characterId) }),
        queryClient.invalidateQueries({ queryKey: characterKeys.roster(campaignId) }),
      ]),
  });
}
