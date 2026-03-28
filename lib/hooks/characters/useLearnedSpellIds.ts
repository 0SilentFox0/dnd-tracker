"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { SkillTreeProgress } from "./useCharacterView";

import { getSkillTrees } from "@/lib/api/skill-trees";
import { getSpells } from "@/lib/api/spells";
import { useMainSkills, useSkills } from "@/lib/hooks/skills";
import { convertPrismaToSkillTree } from "@/lib/utils/skills/skill-tree-mock";
import { getLearnedSpellIdsFromTree } from "@/lib/utils/spells";
import type { SkillTree } from "@/types/skill-tree";
import type { Spell } from "@/types/spells";

export interface UseLearnedSpellIdsOptions {
  campaignId: string;
  characterRace?: string;
  skillTreeProgress: SkillTreeProgress;
  /** Заклинання з аркуша персонажа, якщо дерево ще не змерджено */
  knownSpellIdsFallback: string[];
}

/**
 * Ті самі ID заклинань, що й у книзі заклинань: дерево скілів + школи магії,
 * інакше — knownSpells з персонажа.
 */
export function useLearnedSpellIds({
  campaignId,
  characterRace,
  skillTreeProgress = {},
  knownSpellIdsFallback,
}: UseLearnedSpellIdsOptions): string[] {
  const { data: allSpells = [] } = useQuery<Spell[]>({
    queryKey: ["spells", campaignId],
    queryFn: () => getSpells(campaignId),
    enabled: !!campaignId,
  });

  const { data: allSkills = [] } = useSkills(campaignId);

  const { data: apiMainSkills = [] } = useMainSkills(campaignId);

  const { data: rawTrees = [] } = useQuery({
    queryKey: ["skill-trees", campaignId],
    queryFn: () => getSkillTrees(campaignId),
    enabled: !!campaignId && !!characterRace,
  });

  const skillTree = useMemo((): SkillTree | null => {
    if (!characterRace || !rawTrees.length) return null;

    const raw = rawTrees.find(
      (t) => (t as { race?: string }).race === characterRace,
    );

    if (!raw) return null;

    const tree = convertPrismaToSkillTree(raw as {
      id: string;
      campaignId: string;
      race: string;
      skills: unknown;
      createdAt: Date;
    });

    if (tree && apiMainSkills.length > 0) {
      tree.mainSkills = tree.mainSkills.map((ms) => {
        const apiMs = apiMainSkills.find((m) => m.id === ms.id);

        return apiMs?.spellGroupId
          ? { ...ms, spellGroupId: apiMs.spellGroupId }
          : ms;
      });
    }

    return tree;
  }, [characterRace, rawTrees, apiMainSkills]);

  return useMemo(() => {
    if (
      characterRace &&
      skillTreeProgress &&
      Object.keys(skillTreeProgress).length > 0 &&
      skillTree &&
      allSkills.length > 0 &&
      allSpells.length > 0
    ) {
      return getLearnedSpellIdsFromTree(
        skillTree,
        skillTreeProgress,
        allSkills,
        allSpells,
      );
    }

    return knownSpellIdsFallback;
  }, [
    characterRace,
    skillTreeProgress,
    skillTree,
    allSkills,
    allSpells,
    knownSpellIdsFallback,
  ]);
}
