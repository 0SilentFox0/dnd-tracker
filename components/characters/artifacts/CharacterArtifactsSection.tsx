"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { getSpells } from "@/lib/api/spells";
import { useSkills } from "@/lib/hooks/useSkills";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import { getLearnedSpellIdsFromTree } from "@/lib/utils/spells/spell-learning";
import { convertPrismaToSkillTree } from "@/lib/utils/skills/skill-tree-mock";
import type { Spell } from "@/types/spells";
import type { SkillTree } from "@/types/skill-tree";
import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { CharacterSpellbookDialog } from "./CharacterSpellbookDialog";

type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

interface CharacterArtifactsSectionProps {
  knownSpellIds: string[];
  campaignId: string;
  /** Якщо передано — заклинання обчислюються з дерева прокачки (школи магії). */
  characterRace?: string;
  skillTreeProgress?: SkillTreeProgress;
}

const SLOTS_COUNT = 9;

export function CharacterArtifactsSection({
  knownSpellIds,
  campaignId,
  characterRace,
  skillTreeProgress = {},
}: CharacterArtifactsSectionProps) {
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

    const raw = rawTrees.find((t: { race: string }) => t.race === characterRace);

    if (!raw) return null;

    const tree = convertPrismaToSkillTree({
      ...raw,
      createdAt: new Date(raw.createdAt),
    });

    // Збагачуємо mainSkills у дереві spellGroupId з API (для старих збережених дерев без цього поля)
    if (tree && apiMainSkills.length > 0) {
      if (typeof window !== "undefined") {
        console.info(
          "[Книга заклинань] apiMainSkills:",
          apiMainSkills.map((m) => ({ id: m.id, name: m.name, spellGroupId: m.spellGroupId }))
        );

        console.info(
          "[Книга заклинань] tree.mainSkills (до збагачення):",
          tree.mainSkills.map((m) => ({ id: m.id, name: m.name, spellGroupId: m.spellGroupId }))
        );
      }

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
        allSpells
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
        knownSpells.map((s) => ({ id: s.id, name: s.name, level: s.level }))
      );
    }
  }, [spellbookOpen, knownSpells]);

  return (
    <div className="w-full">
      <div className="relative w-full max-w-md mx-auto aspect-square rounded-lg overflow-hidden bg-[#2a2520] border border-amber-900/50 shadow-xl">
        {/* Фон лицаря / артефактів */}
        <div className="absolute inset-0">
          <Image
            src="/screen-bg/artefacts-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-40 sepia"
            sizes="(max-width: 448px) 100vw, 448px"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/30 to-stone-950/50" />
        </div>

        {/* Сітка 3x3 слотів */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-full h-full max-w-[280px] max-h-[280px]">
            {Array.from({ length: SLOTS_COUNT }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded border-2 border-amber-700/80 bg-stone-900/60 shadow-inner"
                title={`Слот артефакту ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Книжка заклинань — правий верхній кут */}
        <button
          type="button"
          onClick={() => setSpellbookOpen(true)}
          className="absolute top-3 right-3 z-10 flex items-center justify-center w-12 h-12 rounded-lg border-2 border-amber-500/90 bg-amber-950/80 text-amber-200 shadow-lg hover:bg-amber-900/80 hover:border-amber-400 transition-colors"
          title="Заклинання героя"
        >
          <BookOpen className="h-6 w-6" />
        </button>
      </div>

      <CharacterSpellbookDialog
        open={spellbookOpen}
        onOpenChange={setSpellbookOpen}
        spells={knownSpells}
      />
    </div>
  );
}
