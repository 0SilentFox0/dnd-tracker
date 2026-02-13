"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

import { CharacterSpellbookDialog } from "./CharacterSpellbookDialog";

import { getSpells } from "@/lib/api/spells";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import { useSkills } from "@/lib/hooks/useSkills";
import { convertPrismaToSkillTree } from "@/lib/utils/skills/skill-tree-mock";
import { getLearnedSpellIdsFromTree } from "@/lib/utils/spells/spell-learning";
import type { SkillTree } from "@/types/skill-tree";
import type { Spell } from "@/types/spells";

type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

export interface CharacterSpellbookProps {
  knownSpellIds: string[];
  campaignId: string;
  characterRace?: string;
  skillTreeProgress?: SkillTreeProgress;
}

export function CharacterSpellbook({
  knownSpellIds,
  campaignId,
  characterRace,
  skillTreeProgress = {},
}: CharacterSpellbookProps) {
  const [spellbookOpen, setSpellbookOpen] = useState(false);

  const { data: allSpells = [] } = useQuery<Spell[]>({
    queryKey: ["spells", campaignId],
    queryFn: () => getSpells(campaignId),
    enabled: spellbookOpen && !!campaignId,
  });

  const { data: allSkills = [] } = useSkills(campaignId);

  const { data: apiMainSkills = [] } = useMainSkills(campaignId);

  const { data: rawTrees = [] } = useQuery({
    queryKey: ["skill-trees", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/skill-trees`);

      if (!res.ok) return [];

      const data = await res.json();

      return Array.isArray(data) ? data : [];
    },
    enabled: spellbookOpen && !!campaignId && !!characterRace,
  });

  const skillTree = useMemo((): SkillTree | null => {
    if (!characterRace || !rawTrees.length) return null;

    const raw = rawTrees.find(
      (t: { race: string }) => t.race === characterRace,
    );

    if (!raw) return null;

    const tree = convertPrismaToSkillTree({
      ...raw,
      createdAt: new Date(raw.createdAt),
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

  const learnedSpellIds = useMemo(() => {
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

    return knownSpellIds;
  }, [
    characterRace,
    skillTreeProgress,
    skillTree,
    allSkills,
    allSpells,
    knownSpellIds,
  ]);

  const knownSpells = useMemo(() => {
    if (!allSpells.length) return [];

    return learnedSpellIds
      .map((id) => allSpells.find((s) => s.id === id))
      .filter((s): s is Spell => !!s);
  }, [allSpells, learnedSpellIds]);

  useEffect(() => {
    if (spellbookOpen && typeof window !== "undefined") {
      console.info(
        "[Книга заклинань] Доступні заклинання героя:",
        knownSpells.map((s) => ({ id: s.id, name: s.name, level: s.level })),
      );
    }
  }, [spellbookOpen, knownSpells]);

  return (
    <>
      <button
        type="button"
        onClick={() => setSpellbookOpen(true)}
        className="flex shrink-0 items-center justify-center w-12 h-12 rounded-lg border-2 border-amber-500/90 bg-amber-950/80 text-amber-200 shadow-lg hover:bg-amber-900/80 hover:border-amber-400 transition-colors"
        title="Заклинання героя"
      >
        <BookOpen className="h-6 w-6" />
      </button>
      <CharacterSpellbookDialog
        open={spellbookOpen}
        onOpenChange={setSpellbookOpen}
        spells={knownSpells}
      />
    </>
  );
}
