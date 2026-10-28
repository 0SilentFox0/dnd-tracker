import { useQuery } from "@tanstack/react-query";

import { backgroundKeys } from "./keys";

import { createBackground, deleteBackground, getBackground, getBackgrounds, updateBackground } from "@/lib/api/backgrounds";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { BackgroundData, BackgroundFormData } from "@/types/backgrounds";

const backgroundDependentKeys = (campaignId: string) => [backgroundKeys.list(campaignId), characterKeys.sheet(campaignId)];

export function useBackgrounds(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery<BackgroundData[]>({ queryKey: backgroundKeys.list(campaignId), staleTime: REFERENCE_STALE_MS, queryFn: () => getBackgrounds(campaignId), enabled: opts?.enabled ?? true });
}

export function useBackground(campaignId: string, backgroundId: string) {
  return useQuery<BackgroundData>({ queryKey: backgroundKeys.detail(campaignId, backgroundId), staleTime: REFERENCE_STALE_MS, queryFn: () => getBackground(campaignId, backgroundId) });
}

export function useCreateBackground(campaignId: string) {
  return useCrudMutation({ mutationFn: (data: BackgroundFormData) => createBackground(campaignId, data), invalidateKeys: [backgroundKeys.list(campaignId)] });
}

export function useUpdateBackground(campaignId: string) {
  return useCrudMutation({ mutationFn: ({ backgroundId, data }: { backgroundId: string; data: Partial<BackgroundFormData> }) => updateBackground(campaignId, backgroundId, data), invalidateKeys: backgroundDependentKeys(campaignId), errorText: "Не вдалося зберегти передісторію" });
}

export function useDeleteBackground(campaignId: string) {
  return useCrudMutation({ mutationFn: (backgroundId: string) => deleteBackground(campaignId, backgroundId), invalidateKeys: backgroundDependentKeys(campaignId) });
}
