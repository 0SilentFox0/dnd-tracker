"use client";

import { useMemo } from "react";

import { useCharacterProgression } from "./useCharacterProgression";

import { useSpells } from "@/lib/hooks/spells";
import { learnedSpellIdsFromNodes } from "@/lib/utils/spells";

export function useCharacterLearnedSpellIds(campaignId: string, characterId: string | undefined, knownSpellIds: string[]): string[] {
  const { data, learned } = useCharacterProgression(campaignId, characterId);

  const { data: spells = [] } = useSpells(campaignId, { enabled: learned.length > 0 });

  return useMemo(() => {
    if (!data || learned.length === 0) return knownSpellIds;

    const fromTree = learnedSpellIdsFromNodes(learned, {
      branchSpellGroup: Object.fromEntries(Object.entries(data.branches).map(([id, b]) => [id, b.spellGroupId])),
      skills: data.skills,
      spells,
    });

    return [...new Set([...knownSpellIds, ...fromTree])];
  }, [data, learned, spells, knownSpellIds]);
}
