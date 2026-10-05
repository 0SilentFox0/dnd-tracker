"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createArtifact,
  type CreateArtifactData,
  deleteAllArtifacts,
  deleteArtifact,
  getArtifacts,
  updateArtifact,
  type UpdateArtifactData,
} from "@/lib/api/artifacts";

export function useArtifactsList(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["artifacts", campaignId],
    queryFn: () => getArtifacts(campaignId),
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

function useRefreshAfter(campaignId: string) {
  const router = useRouter();

  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["artifacts", campaignId] });
    router.refresh();
  };
}

export function useCreateArtifact(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({ mutationFn: (data: CreateArtifactData) => createArtifact(campaignId, data), onSuccess });
}

export function useUpdateArtifact(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({
    mutationFn: ({ artifactId, data }: { artifactId: string; data: UpdateArtifactData }) => updateArtifact(campaignId, artifactId, data),
    onSuccess,
  });
}

export function useDeleteArtifact(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({ mutationFn: (artifactId: string) => deleteArtifact(campaignId, artifactId), onSuccess });
}

export function useDeleteAllArtifacts(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({ mutationFn: () => deleteAllArtifacts(campaignId), onSuccess });
}
