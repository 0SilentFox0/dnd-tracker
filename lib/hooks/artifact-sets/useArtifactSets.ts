"use client";

import {
  type ArtifactSetCreatePayload,
  createArtifactSet,
  deleteArtifactSet,
  updateArtifactSet,
} from "@/lib/api/artifact-sets";
import { useCrudMutation } from "@/lib/hooks/common";

const keys = (campaignId: string) => [
  ["artifact-sets", campaignId],
  ["artifacts", campaignId],
];

export function useSaveArtifactSet(campaignId: string, setId?: string) {
  return useCrudMutation({
    mutationFn: (payload: ArtifactSetCreatePayload) =>
      setId ? updateArtifactSet(campaignId, setId, payload) : createArtifactSet(campaignId, payload),
    invalidateKeys: keys(campaignId),
  });
}

export function useDeleteArtifactSet(campaignId: string) {
  return useCrudMutation({ mutationFn: (setId: string) => deleteArtifactSet(campaignId, setId), invalidateKeys: keys(campaignId) });
}
