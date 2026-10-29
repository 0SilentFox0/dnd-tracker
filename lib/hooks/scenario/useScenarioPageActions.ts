"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";

import { scenarioKeys } from "./keys";

import { createScenarioPage, deleteScenarioPage, updateScenarioMeta } from "@/lib/api/scenario";
import { useCrudMutation, useNotify } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { CreateScenarioPageData, ScenarioPage, ScenarioPageSummary, UpdateScenarioMetaData } from "@/types/scenario";

export function useScenarioPageActions(campaignId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const t = useTranslations("scenario.actions");

  const onError = (fallback: string) => (error: unknown) => void notify(errorMessage(error, fallback));

  const invalidateKeys = [scenarioKeys.list(campaignId)];

  const mergeIntoPageCache = (summary: ScenarioPageSummary) =>
    queryClient.setQueryData<ScenarioPage>(scenarioKeys.page(campaignId, summary.id), (old) => old && { ...old, ...summary, content: old.content, version: old.version });

  const create = useCrudMutation({ mutationFn: (data: CreateScenarioPageData) => createScenarioPage(campaignId, data), invalidateKeys, onError: onError(t("createFailed")) });

  const update = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScenarioMetaData }) => updateScenarioMeta(campaignId, id, data),
    invalidateKeys,
    onSuccess: mergeIntoPageCache,
    onError: onError(t("saveFailed")),
  });

  const reorder = useCrudMutation({
    mutationFn: (patches: { id: string; sortOrder: number }[]) => Promise.all(patches.map(({ id, sortOrder }) => updateScenarioMeta(campaignId, id, { sortOrder }))),
    invalidateKeys,
    onSuccess: (summaries) => summaries.forEach(mergeIntoPageCache),
    onError: onError(t("saveFailed")),
  });

  const remove = useCrudMutation({ mutationFn: (id: string) => deleteScenarioPage(campaignId, id), invalidateKeys, onError: onError(t("deleteFailed")) });

  const move = useCallback(
    async (id: string, dir: -1 | 1, siblings: ScenarioPageSummary[]) => {
      const at = siblings.findIndex((p) => p.id === id);

      const other = siblings[at + dir];

      if (at < 0 || !other) return;

      const current = siblings[at];

      await reorder.mutateAsync([
        { id: current.id, sortOrder: other.sortOrder },
        { id: other.id, sortOrder: current.sortOrder === other.sortOrder ? current.sortOrder + dir * -1 : current.sortOrder },
      ]);
    },
    [reorder],
  );

  return {
    create: create.mutateAsync,
    updateMeta: (id: string, data: UpdateScenarioMetaData) => update.mutateAsync({ id, data }),
    remove: async (id: string) => void (await remove.mutateAsync(id)),
    move,
    isPending: create.isPending || update.isPending || reorder.isPending || remove.isPending,
  };
}
