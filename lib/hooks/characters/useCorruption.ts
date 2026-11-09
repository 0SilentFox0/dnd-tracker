"use client";

import { useTranslations } from "next-intl";

import { characterKeys, characterWriteKeys } from "./keys";

import { postCorruptionGrant, postCorruptionUndo } from "@/lib/api/corruption";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CorruptionGrantBody, CorruptionUndoBody } from "@/types/corruption";

const corruptionKeys = (c: string, id: string) => [characterKeys.detail(c, id), characterKeys.sheet(c, id), characterKeys.log(c, id), ...characterWriteKeys(c)];

export function useGrantCorruption(campaignId: string, characterId: string) {
  const t = useTranslations("wfrpCorruption.errors");

  return useCrudMutation({ mutationFn: (body: CorruptionGrantBody) => postCorruptionGrant(campaignId, characterId, body), invalidateKeys: corruptionKeys(campaignId, characterId), errorText: t("grantFailed") });
}

export function useUndoCorruption(campaignId: string, characterId: string) {
  const t = useTranslations("wfrpCorruption.errors");

  return useCrudMutation({ mutationFn: (body: CorruptionUndoBody) => postCorruptionUndo(campaignId, characterId, body), invalidateKeys: corruptionKeys(campaignId, characterId), errorText: t("undoFailed") });
}
