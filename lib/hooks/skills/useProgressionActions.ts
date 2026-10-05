"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { progressionKey } from "./progression-keys";

import { learnNode, resetProgression, unlearnNode } from "@/lib/api/character-progression";
import { ApiError } from "@/lib/api/client";
import { useNotify } from "@/lib/hooks/common";
import type { LearnBlockReason, UnlearnBlockReason } from "@/lib/utils/skills/progression";
import { LEARN_BLOCK_TEXT, UNLEARN_BLOCK_TEXT } from "@/lib/utils/skills/progression";
import type { CharacterProgressionDto } from "@/types/progression";

export function useProgressionActions(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

  const key = progressionKey(campaignId, characterId);

  const run = async (nodeId: string, call: () => Promise<{ unlocked: string[] }>): Promise<boolean> => {
    setPendingNodeId(nodeId);
    try {
      const { unlocked } = await call();

      queryClient.setQueryData<CharacterProgressionDto>(key, (old) => (old ? { ...old, unlocked } : old));
      queryClient.setQueryData<{ skillTreeProgress?: unknown }>(["character", campaignId, characterId], (old) => {
        const treeId = queryClient.getQueryData<CharacterProgressionDto>(key)?.treeId;

        return old && treeId ? { ...old, skillTreeProgress: { [treeId]: { unlockedSkills: unlocked } } } : old;
      });
      void queryClient.invalidateQueries({ queryKey: ["character-damage-preview", campaignId, characterId] });
      void queryClient.invalidateQueries({ queryKey: ["battle-balance"], refetchType: "none" });

      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: key });
        await notify("Прогрес змінився — оновлено");
      } else if (error instanceof ApiError && error.status === 422) {
        const reason = (error.body as { reason?: string } | undefined)?.reason ?? "";

        await notify(LEARN_BLOCK_TEXT[reason as LearnBlockReason] ?? UNLEARN_BLOCK_TEXT[reason as UnlearnBlockReason] ?? error.message);
      } else {
        await notify((error as Error).message);
      }

      return false;
    } finally {
      setPendingNodeId(null);
    }
  };

  return {
    learn: (nodeId: string) => run(nodeId, () => learnNode(campaignId, characterId, nodeId)),
    unlearn: (nodeId: string) => run(nodeId, () => unlearnNode(campaignId, characterId, nodeId)),
    reset: () => run("reset", () => resetProgression(campaignId, characterId)),
    pendingNodeId,
  };
}
