import { useQuery } from "@tanstack/react-query";

import { fetchDamagePreview } from "./damage-preview";

export function useDamagePreview(campaignId: string, characterId: string, coefficients: { melee: number; ranged: number }) {
  return useQuery({
    queryKey: ["character-damage-preview", campaignId, characterId, coefficients.melee, coefficients.ranged],
    queryFn: () => fetchDamagePreview(campaignId, characterId, coefficients.melee, coefficients.ranged, null, null),
    enabled: !!campaignId && !!characterId,
  });
}
