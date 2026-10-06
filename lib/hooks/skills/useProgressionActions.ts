"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { progressionKey } from "./progression-keys";

import { learnNode, resetProgression, unlearnNodes } from "@/lib/api/character-progression";
import { ApiError } from "@/lib/api/client";
import { characterSheetKey } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import type { LearnBlockReason, UnlearnBlockReason } from "@/lib/utils/skills/progression";
import { LEARN_BLOCK_TEXT, normalizeTree, skillPoints, UNLEARN_BLOCK_TEXT } from "@/lib/utils/skills/progression";
import type { CharacterSheet } from "@/types/characters";
import type { CharacterProgressionDto } from "@/types/progression";

const SHEET_REFRESH_DELAY_MS = 1000;

export function useProgressionActions(campaignId: string, characterId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);

  const inFlight = useRef(false);

  const sheetRefresh = useRef<ReturnType<typeof setTimeout> | null>(null);

  const key = progressionKey(campaignId, characterId);

  const sheetKey = characterSheetKey(campaignId, characterId);

  const patchSheet = (unlocked: string[]) => {
    const dto = queryClient.getQueryData<CharacterProgressionDto>(key);

    if (dto?.treeId && dto.tree) {
      const free = skillPoints(normalizeTree({ id: dto.treeId, race: dto.race, skills: dto.tree }), unlocked, dto.level).free;

      queryClient.setQueryData<CharacterSheet>(sheetKey, (old) => (old ? { ...old, progression: { ...old.progression, freePoints: free } } : old));
    }

    if (sheetRefresh.current) clearTimeout(sheetRefresh.current);

    sheetRefresh.current = setTimeout(() => void queryClient.invalidateQueries({ queryKey: sheetKey }), SHEET_REFRESH_DELAY_MS);
  };

  const run = async (nodeId: string, call: () => Promise<{ unlocked: string[] }>): Promise<boolean> => {
    // подвійний тап приходить раніше, ніж React вимкне кнопку
    if (inFlight.current) return false;

    inFlight.current = true;
    setPendingNodeId(nodeId);
    try {
      const { unlocked } = await call();

      queryClient.setQueryData<CharacterProgressionDto>(key, (old) => (old ? { ...old, unlocked } : old));
      queryClient.setQueryData<{ skillTreeProgress?: Record<string, object> | null }>(["character", campaignId, characterId], (old) => {
        const treeId = queryClient.getQueryData<CharacterProgressionDto>(key)?.treeId;

        if (!old || !treeId) return old;

        const progress = old.skillTreeProgress ?? {};

        return { ...old, skillTreeProgress: { ...progress, [treeId]: { ...progress[treeId], unlockedSkills: unlocked } } };
      });
      patchSheet(unlocked);
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
      inFlight.current = false;
      setPendingNodeId(null);
    }
  };

  return {
    learn: (nodeId: string) => run(nodeId, () => learnNode(campaignId, characterId, nodeId)),
    unlearn: (nodeIds: string[]) => run(nodeIds.length === 1 ? nodeIds[0] : "orphans", () => unlearnNodes(campaignId, characterId, nodeIds)),
    reset: () => run("reset", () => resetProgression(campaignId, characterId)),
    pendingNodeId,
  };
}
