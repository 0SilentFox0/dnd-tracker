import { useMutation } from "@tanstack/react-query";

import { getOwnerAbilities } from "@/lib/api/abilities";
import type { AbilitySourceRef } from "@/types/abilities";

export function useCopyOwnerAbilities(campaignId: string) {
  return useMutation({
    mutationFn: (s: AbilitySourceRef) => getOwnerAbilities(campaignId, s.kind, s.id).then((r) => r.abilities),
  });
}
