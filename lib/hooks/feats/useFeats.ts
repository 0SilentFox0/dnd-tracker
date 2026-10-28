import { useQuery } from "@tanstack/react-query";

import { featKeys } from "./keys";

import { createFeat, deleteFeat, getFeat, getFeats, updateFeat } from "@/lib/api/feats";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { FeatData, FeatFormData } from "@/types/choices";

const featDependentKeys = (campaignId: string) => [featKeys.list(campaignId), characterKeys.sheet(campaignId)];

export function useFeats(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery<FeatData[]>({ queryKey: featKeys.list(campaignId), staleTime: REFERENCE_STALE_MS, queryFn: () => getFeats(campaignId), enabled: opts?.enabled ?? true });
}

export function useFeat(campaignId: string, featId: string) {
  return useQuery<FeatData>({ queryKey: featKeys.detail(campaignId, featId), staleTime: REFERENCE_STALE_MS, queryFn: () => getFeat(campaignId, featId) });
}

export function useCreateFeat(campaignId: string) {
  return useCrudMutation({ mutationFn: (data: FeatFormData) => createFeat(campaignId, data), invalidateKeys: [featKeys.list(campaignId)] });
}

export function useUpdateFeat(campaignId: string) {
  return useCrudMutation({ mutationFn: ({ featId, data }: { featId: string; data: Partial<FeatFormData> }) => updateFeat(campaignId, featId, data), invalidateKeys: featDependentKeys(campaignId) });
}

export function useDeleteFeat(campaignId: string) {
  return useCrudMutation({ mutationFn: (featId: string) => deleteFeat(campaignId, featId), invalidateKeys: featDependentKeys(campaignId) });
}
