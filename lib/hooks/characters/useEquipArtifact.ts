import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterSheetKey } from "./keys";

import { updateInventory } from "@/lib/api/inventory";
import type { EquippedItems } from "@/types/inventory";

export function useEquipArtifact(campaignId: string, characterId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (equipped: EquippedItems) => {
      if (!characterId) throw new Error("Немає персонажа");

      return updateInventory(campaignId, characterId, { equipped });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: characterSheetKey(campaignId, characterId) }),
  });
}
