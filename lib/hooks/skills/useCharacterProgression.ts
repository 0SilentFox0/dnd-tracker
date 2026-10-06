"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { progressionKey } from "./progression-keys";

import { getCharacterProgression } from "@/lib/api/character-progression";
import { normalizeTree, progressionView, rankOffers, resolveLearned } from "@/lib/utils/skills/progression";

export function useCharacterProgression(campaignId: string, characterId: string | undefined) {
  const query = useQuery({
    queryKey: progressionKey(campaignId, characterId ?? ""),
    queryFn: () => getCharacterProgression(campaignId, characterId ?? ""),
    enabled: !!campaignId && !!characterId,
    staleTime: 0,
  });

  const { data } = query;

  const derived = useMemo(() => {
    if (!data?.treeId || !data.tree) return { tree: null, view: null, offers: [], learned: [] };

    const tree = normalizeTree({ id: data.treeId, race: data.race, skills: data.tree });

    return {
      tree,
      view: progressionView(tree, data.unlocked, data.level),
      offers: rankOffers(tree, data.unlocked, data.level),
      learned: resolveLearned(tree, { [tree.treeId]: { unlockedSkills: data.unlocked } }),
    };
  }, [data]);

  return { query, data, ...derived };
}
