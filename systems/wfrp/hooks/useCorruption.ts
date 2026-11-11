"use client";

import { useTranslations } from "next-intl";

import { characterKeys, characterWriteKeys } from "@/lib/hooks/characters/keys";
import { useCrudMutation, useOptionalNotify } from "@/lib/hooks/common";
import { postCorruptionGrant, postCorruptionUndo } from "@/systems/wfrp/api/corruption";

function useCorruptionMutation<B, R>(campaignId: string, characterId: string, failedKey: "grantFailed" | "undoFailed", post: (campaignId: string, characterId: string, body: B) => Promise<R>) {
  const t = useTranslations("wfrpCorruption.errors");

  const notify = useOptionalNotify();

  return useCrudMutation({
    mutationFn: (body: B) => post(campaignId, characterId, body),
    invalidateKeys: [characterKeys.detail(campaignId, characterId), characterKeys.sheet(campaignId, characterId), characterKeys.log(campaignId, characterId), ...characterWriteKeys(campaignId)],
    onError: (error) => notify(error.message || t(failedKey)),
  });
}

export const useGrantCorruption = (campaignId: string, characterId: string) => useCorruptionMutation(campaignId, characterId, "grantFailed", postCorruptionGrant);

export const useUndoCorruption = (campaignId: string, characterId: string) => useCorruptionMutation(campaignId, characterId, "undoFailed", postCorruptionUndo);
