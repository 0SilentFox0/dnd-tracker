"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { getScenarioVersions, restoreScenarioVersion } from "@/lib/api/scenario";
import { useCrudMutation } from "@/lib/hooks/common";

export function useScenarioVersions(campaignId: string, pageId: string, enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: scenarioKeys.versions(campaignId, pageId), queryFn: () => getScenarioVersions(campaignId, pageId), enabled });

  const restore = useCrudMutation({
    mutationFn: (versionId: string) => restoreScenarioVersion(campaignId, pageId, versionId),
    invalidateKeys: [scenarioKeys.versions(campaignId, pageId), scenarioKeys.list(campaignId)],
    errorText: "Не вдалося відновити версію",
    onSuccess: (page) => queryClient.setQueryData(scenarioKeys.page(campaignId, pageId), page),
  });

  return { versions: query.data ?? [], isLoading: query.isLoading, restore: async (id: string) => void (await restore.mutateAsync(id)), isRestoring: restore.isPending };
}
