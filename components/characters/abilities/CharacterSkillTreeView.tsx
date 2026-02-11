"use client";

import { useCallback, useMemo, useEffect, useState } from "react";

import { CircularSkillTree } from "@/components/skill-tree/core/CircularSkillTree";
import {
  canLearnRacialSkillLevel,
  getRacialSkillLevelId,
} from "@/components/skill-tree/utils/hooks";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import { useRaces } from "@/lib/hooks/useRaces";
import { useSkills } from "@/lib/hooks/useSkills";
import { useSkillTreeEnrichment } from "@/lib/hooks/useSkillTreeEnrichment";
import {
  convertPrismaToSkillTree,
  createMockSkillTree,
} from "@/lib/utils/skills/skill-tree-mock";
import type {
  MainSkill,
  Skill,
  SkillTree,
  UltimateSkill,
} from "@/types/skill-tree";
import { SkillLevel } from "@/types/skill-tree";

type PrismaSkillTree = {
  id: string;
  campaignId: string;
  race: string;
  skills: unknown;
  createdAt: string;
};

type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

interface CharacterSkillTreeViewProps {
  campaignId: string;
  characterRace: string;
  characterLevel: number;
  skillTreeProgress: SkillTreeProgress;
  onSkillTreeProgressChange?: (next: SkillTreeProgress) => void;
}

export function CharacterSkillTreeView({
  campaignId,
  characterRace,
  characterLevel,
  skillTreeProgress,
  onSkillTreeProgressChange,
}: CharacterSkillTreeViewProps) {
  const [trees, setTrees] = useState<PrismaSkillTree[]>([]);

  const { data: skillsFromLibrary = [] } = useSkills(campaignId);
  const { data: races = [] } = useRaces(campaignId);
  const { data: mainSkills = [] } = useMainSkills(campaignId);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/campaigns/${campaignId}/skill-trees`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PrismaSkillTree[]) => {
        if (!cancelled) setTrees(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setTrees([]);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const baseSkillTree = useMemo(() => {
    if (!characterRace) return null;

    const raw = trees.find((t) => t.race === characterRace);

    if (raw) {
      const converted = convertPrismaToSkillTree({
        ...raw,
        createdAt: new Date(raw.createdAt),
      });
      if (converted) return converted;
    }

    return createMockSkillTree(campaignId, characterRace, mainSkills);
  }, [trees, characterRace, campaignId, mainSkills]);

  const unlockedSkills = useMemo(() => {
    if (!baseSkillTree) return [];
    const progress = skillTreeProgress[baseSkillTree.id];
    return progress?.unlockedSkills ?? [];
  }, [baseSkillTree, skillTreeProgress]);

  const enrichedSkillTree = useSkillTreeEnrichment({
    skillTree: baseSkillTree,
    skillsFromLibrary,
  });

  const race = useMemo(
    () => races.find((r) => r.name === characterRace) ?? null,
    [races, characterRace],
  );

  const maxSkills = characterLevel;
  const canLevel =
    baseSkillTree &&
    onSkillTreeProgressChange &&
    characterLevel > unlockedSkills.length;

  const applyNewUnlocked = useCallback(
    (newUnlocked: string[]) => {
      if (!baseSkillTree || !onSkillTreeProgressChange) return;
      onSkillTreeProgressChange({
        ...skillTreeProgress,
        [baseSkillTree.id]: {
          ...skillTreeProgress[baseSkillTree.id],
          unlockedSkills: newUnlocked,
        },
      });
    },
    [baseSkillTree, onSkillTreeProgressChange, skillTreeProgress],
  );

  const handleSkillClick = useCallback(
    (skill: Skill) => {
      if (!canLevel) return;
      if (unlockedSkills.includes(skill.id)) {
        applyNewUnlocked(unlockedSkills.filter((id) => id !== skill.id));
        return;
      }
      if (unlockedSkills.length >= maxSkills) {
        alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);
        return;
      }
      applyNewUnlocked([...unlockedSkills, skill.id]);
    },
    [canLevel, unlockedSkills, maxSkills, applyNewUnlocked],
  );

  const handleUltimateSkillClick = useCallback(
    (skill: UltimateSkill) => {
      if (!canLevel) return;
      if (unlockedSkills.includes(skill.id)) {
        applyNewUnlocked(unlockedSkills.filter((id) => id !== skill.id));
        return;
      }
      if (unlockedSkills.length >= maxSkills) {
        alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);
        return;
      }
      applyNewUnlocked([...unlockedSkills, skill.id]);
    },
    [canLevel, unlockedSkills, maxSkills, applyNewUnlocked],
  );

  const handleRacialSkillClick = useCallback(
    (mainSkill: MainSkill, level: SkillLevel) => {
      if (!canLevel) return;
      const canLearn = canLearnRacialSkillLevel(
        level,
        mainSkill.id,
        unlockedSkills,
      );
      if (!canLearn) return;
      const racialSkillLevelId = getRacialSkillLevelId(mainSkill.id, level);
      if (unlockedSkills.includes(racialSkillLevelId)) {
        applyNewUnlocked(
          unlockedSkills.filter((id) => id !== racialSkillLevelId),
        );
        return;
      }
      if (unlockedSkills.length >= maxSkills) {
        alert(`Досягнуто максимальну кількість навиків (${maxSkills})`);
        return;
      }
      applyNewUnlocked([...unlockedSkills, racialSkillLevelId]);
    },
    [canLevel, unlockedSkills, maxSkills, applyNewUnlocked],
  );

  if (!characterRace) {
    return (
      <p className="text-sm text-muted-foreground">
        Виберіть расу персонажа, щоб побачити дерево прокачки.
      </p>
    );
  }

  if (!enrichedSkillTree) {
    return (
      <p className="text-sm text-muted-foreground">
        Завантаження дерева прокачки для раси &quot;{characterRace}&quot;…
      </p>
    );
  }

  return (
    <div className="mt-4 border rounded-lg md:p-4 bg-muted/30">
      <h4 className="text-sm font-medium mb-2 p-1">Дерево прокачки</h4>
      <p className="text-sm text-muted-foreground mb-2 p-1">
        Рівень героя: {characterLevel}. Прокачано скілів:{" "}
        {unlockedSkills.length} / {characterLevel}
        {canLevel &&
          " — можна вивчати навики (клікайте по навиках для додавання/зняття)."}
      </p>
      <div className="flex justify-center overflow-auto">
        <CircularSkillTree
          skillTree={enrichedSkillTree}
          race={race}
          unlockedSkills={unlockedSkills}
          playerLevel={characterLevel}
          isDMMode={!canLevel}
          isTrainingCompleted
          onSkillClick={canLevel ? handleSkillClick : undefined}
          onUltimateSkillClick={canLevel ? handleUltimateSkillClick : undefined}
          onRacialSkillClick={canLevel ? handleRacialSkillClick : undefined}
        />
      </div>
    </div>
  );
}
