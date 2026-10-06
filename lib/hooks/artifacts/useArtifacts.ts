"use client";

import { useQuery } from "@tanstack/react-query";

import {
  createArtifact,
  type CreateArtifactData,
  deleteAllArtifacts,
  deleteArtifact,
  getArtifacts,
  updateArtifact,
  type UpdateArtifactData,
} from "@/lib/api/artifacts";
import { useCrudMutation } from "@/lib/hooks/common";

const listKey = (campaignId: string) => ["artifacts", campaignId];

export function useArtifactsList(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey(campaignId),
    queryFn: () => getArtifacts(campaignId),
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

export function useCreateArtifact(campaignId: string) {
  return useCrudMutation({ mutationFn: (data: CreateArtifactData) => createArtifact(campaignId, data), invalidateKeys: [listKey(campaignId)] });
}

export function useUpdateArtifact(campaignId: string) {
  return useCrudMutation({
    mutationFn: ({ artifactId, data }: { artifactId: string; data: UpdateArtifactData }) => updateArtifact(campaignId, artifactId, data),
    invalidateKeys: [listKey(campaignId)],
  });
}

export function useDeleteArtifact(campaignId: string) {
  return useCrudMutation({ mutationFn: (artifactId: string) => deleteArtifact(campaignId, artifactId), invalidateKeys: [listKey(campaignId)] });
}

export function useDeleteAllArtifacts(campaignId: string) {
  return useCrudMutation({ mutationFn: () => deleteAllArtifacts(campaignId), invalidateKeys: [listKey(campaignId)] });
}
