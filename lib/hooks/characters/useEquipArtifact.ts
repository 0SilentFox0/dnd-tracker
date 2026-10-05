import { useMutation } from "@tanstack/react-query";

import { updateInventory } from "@/lib/api/inventory";
import type { EquippedItems } from "@/types/inventory";

export function useEquipArtifact(campaignId: string, characterId?: string) {
  return useMutation({
    mutationFn: (equipped: EquippedItems) => {
      if (!characterId) throw new Error("Немає персонажа");

      return updateInventory(campaignId, characterId, { equipped });
    },
  });
}
