"use client";

import { useCallback } from "react";

import { scenarioKeys } from "./keys";

import { createScenarioPage, deleteScenarioPage, updateScenarioMeta } from "@/lib/api/scenario";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CreateScenarioPageData, ScenarioPageSummary, UpdateScenarioMetaData } from "@/types/scenario";

export function useScenarioPageActions(campaignId: string) {
  const invalidateKeys = [scenarioKeys.list(campaignId)];

  const create = useCrudMutation({ mutationFn: (data: CreateScenarioPageData) => createScenarioPage(campaignId, data), invalidateKeys, errorText: "Не вдалося створити сторінку" });

  const update = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScenarioMetaData }) => updateScenarioMeta(campaignId, id, data),
    invalidateKeys: (_d, { id }) => [scenarioKeys.list(campaignId), scenarioKeys.page(campaignId, id)],
    errorText: "Не вдалося зберегти властивості",
  });

  const remove = useCrudMutation({ mutationFn: (id: string) => deleteScenarioPage(campaignId, id), invalidateKeys, errorText: "Не вдалося видалити сторінку" });

  const move = useCallback(
    async (id: string, dir: -1 | 1, siblings: ScenarioPageSummary[]) => {
      const at = siblings.findIndex((p) => p.id === id);

      const other = siblings[at + dir];

      if (at < 0 || !other) return;

      const current = siblings[at];

      await update.mutateAsync({ id: current.id, data: { sortOrder: other.sortOrder } });
      await update.mutateAsync({ id: other.id, data: { sortOrder: current.sortOrder === other.sortOrder ? current.sortOrder + dir * -1 : current.sortOrder } });
    },
    [update],
  );

  return {
    create: create.mutateAsync,
    updateMeta: (id: string, data: UpdateScenarioMetaData) => update.mutateAsync({ id, data }),
    remove: async (id: string) => void (await remove.mutateAsync(id)),
    move,
    isPending: create.isPending || update.isPending || remove.isPending,
  };
}
