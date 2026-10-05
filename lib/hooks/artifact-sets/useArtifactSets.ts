"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type ArtifactSetCreatePayload,
  createArtifactSet,
  deleteArtifactSet,
  getArtifactSets,
  updateArtifactSet,
} from "@/lib/api/artifact-sets";

export function useArtifactSetsList(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["artifact-sets", campaignId],
    queryFn: () => getArtifactSets(campaignId),
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

function useRefreshAfter(campaignId: string) {
  const router = useRouter();

  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["artifact-sets", campaignId] });
    void queryClient.invalidateQueries({ queryKey: ["artifacts", campaignId] });
    router.refresh();
  };
}

export function useSaveArtifactSet(campaignId: string, setId?: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({
    mutationFn: (payload: ArtifactSetCreatePayload) =>
      setId ? updateArtifactSet(campaignId, setId, payload) : createArtifactSet(campaignId, payload),
    onSuccess,
  });
}

export function useDeleteArtifactSet(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({ mutationFn: (setId: string) => deleteArtifactSet(campaignId, setId), onSuccess });
}
