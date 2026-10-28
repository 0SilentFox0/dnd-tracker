"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { characterKeys } from "./keys";

import { getCharacterLog, patchResources, postExperience, postHitDie, postInspiration, postRest, postSheetRoll } from "@/lib/api/characters";
import { useCrudMutation } from "@/lib/hooks/common";
import { ENTITY_STALE_MS } from "@/lib/providers/query-provider";
import type { AwardXpBody, ResourcesEditBody, RestBody, SheetRollBody } from "@/types/characters";

const partyKeys = (c: string) => [characterKeys.sheet(c), characterKeys.lists(c), characterKeys.logs(c)];

const heroKeys = (c: string, id: string) => [characterKeys.sheet(c, id), characterKeys.lists(c), characterKeys.log(c, id)];

export function useRest(campaignId: string) {
  return useCrudMutation({ mutationFn: (body: RestBody) => postRest(campaignId, body), invalidateKeys: partyKeys(campaignId), errorText: "Не вдалося провести відпочинок" });
}

export function useAwardXp(campaignId: string) {
  return useCrudMutation({ mutationFn: (body: AwardXpBody) => postExperience(campaignId, body), invalidateKeys: partyKeys(campaignId), errorText: "Не вдалося нарахувати досвід" });
}

export function useSpendHitDie(campaignId: string, characterId: string) {
  return useCrudMutation({ mutationFn: (classId: string) => postHitDie(campaignId, characterId, classId), invalidateKeys: heroKeys(campaignId, characterId) });
}

export function useSheetRoll(campaignId: string, characterId: string) {
  return useCrudMutation({
    mutationFn: (body: SheetRollBody) => postSheetRoll(campaignId, characterId, body),
    invalidateKeys: (_r, body) => (body.useInspiration ? heroKeys(campaignId, characterId) : [characterKeys.log(campaignId, characterId)]),
  });
}

export function useInspiration(campaignId: string, characterId: string) {
  return useCrudMutation({ mutationFn: (value: boolean) => postInspiration(campaignId, characterId, value), invalidateKeys: heroKeys(campaignId, characterId), errorText: "Не вдалося змінити натхнення" });
}

export function useEditResources(campaignId: string, characterId: string) {
  return useCrudMutation({ mutationFn: (body: ResourcesEditBody) => patchResources(campaignId, characterId, body), invalidateKeys: heroKeys(campaignId, characterId), errorText: "Не вдалося змінити ресурси" });
}

export function useCharacterLog(campaignId: string, characterId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: characterKeys.log(campaignId, characterId),
    queryFn: ({ pageParam }) => getCharacterLog(campaignId, characterId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: ENTITY_STALE_MS,
  });
}
