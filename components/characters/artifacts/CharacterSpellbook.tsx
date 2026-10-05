"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

import { CharacterSpellbookDialog } from "./CharacterSpellbookDialog";

import { useMainSkills, useSkills, useSkillTrees } from "@/lib/hooks/skills";
import { useSpells } from "@/lib/hooks/spells";
import { convertPrismaToSkillTree } from "@/lib/utils/skills/skill-tree-mock";
import { getLearnedSpellIdsFromTree } from "@/lib/utils/spells";
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

  const { data: allSpells = [] } = useSpells(campaignId, { enabled: spellbookOpen });

  const { data: allSkills = [] } = useSkills(campaignId);

  const { data: apiMainSkills = [] } = useMainSkills(campaignId);

  const { data: rawTrees = [] } = useSkillTrees(campaignId, { enabled: spellbookOpen && !!characterRace });

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
