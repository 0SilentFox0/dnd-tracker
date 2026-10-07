"use client";

import { artifactSetKeys } from "./keys";

import {
  type ArtifactSetCreatePayload,
  createArtifactSet,
  deleteArtifactSet,
  updateArtifactSet,
} from "@/lib/api/artifact-sets";
import { artifactKeys } from "@/lib/hooks/artifacts/keys";
import { useCrudMutation } from "@/lib/hooks/common";

const keys = (campaignId: string) => [
  artifactSetKeys.list(campaignId),
  artifactKeys.list(campaignId),
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
