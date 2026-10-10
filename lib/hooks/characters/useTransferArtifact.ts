import { useMutation, useQueryClient } from "@tanstack/react-query";

import { characterKeys, characterSheetKey } from "./keys";

import { transferArtifact } from "@/lib/api/inventory";

export function useTransferArtifact(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { slot: string; toCharacterId: string }) => transferArtifact(campaignId, characterId, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: characterSheetKey(campaignId) }),
        queryClient.invalidateQueries({ queryKey: characterKeys.roster(campaignId) }),
        queryClient.invalidateQueries({ queryKey: characterKeys.details(campaignId) }),
      ]),
  });
}
