"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCharacterForm } from "./useCharacterForm";

import { getArtifactSets } from "@/lib/api/artifact-sets";
import { type ArtifactListItem, getArtifacts } from "@/lib/api/artifacts";
import {
  getCharacter,
  getDamagePreview,
  updateCharacter,
} from "@/lib/api/characters";
import { getSkillTrees } from "@/lib/api/skill-trees";
import { getSpells } from "@/lib/api/spells";
import { useMainSkills, useSkills } from "@/lib/hooks/skills";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import { convertPrismaToSkillTree } from "@/lib/utils/skills/skill-tree-mock";
import {
  getLearnedSpellIdsFromProgress,
  getLearnedSpellIdsFromTree,
} from "@/lib/utils/spells";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { Character } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";
import type { SkillTree } from "@/types/skill-tree";
import type { Spell } from "@/types/spells";

export type SkillTreeProgress = Record<
  string,
  { level?: string; unlockedSkills?: string[] }
>;

export function useCharacterView(campaignId: string, characterId: string) {
  const [characterLoaded, setCharacterLoaded] = useState(false);

  const [equipped, setEquipped] = useState<EquippedItems>({});

  const [savingTree, setSavingTree] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

  const [lastSavedSkillTreeProgress, setLastSavedSkillTreeProgress] =
    useState<SkillTreeProgress>({});

  const {
    formData,
    error,
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    abilities,
    spellcasting,
    setFormData,
  } = useCharacterForm({ onSubmit: async () => {} });

  useEffect(() => {
    let cancelled = false;

    const fetchCharacter = async () => {
      try {
        const character: Character = await getCharacter(
          campaignId,
          characterId,
        );

        if (cancelled) return;

        const form = characterToFormData(character);

        setFormData(form);
        setLastSavedSkillTreeProgress(
          (form.skillTreeProgress as SkillTreeProgress) ?? {},
        );
        setEquipped((character.inventory?.equipped as EquippedItems) ?? {});
        setCharacterLoaded(true);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching character:", err);
          setCharacterLoaded(true);
        }
      }
    };

    fetchCharacter();

    return () => {
      cancelled = true;
    };
  }, [campaignId, characterId, setFormData]);

  const { data: artifacts = [] } = useQuery({
    queryKey: ["artifacts", campaignId],
    queryFn: () => getArtifacts(campaignId),
    enabled: !!campaignId && characterLoaded,
  });

  const { data: artifactSets = [] } = useQuery({
    queryKey: ["artifact-sets", campaignId],
    queryFn: () => getArtifactSets(campaignId),
    enabled: !!campaignId && characterLoaded,
  });

  const meleeMult = formData.scalingCoefficients?.meleeMultiplier ?? 1;

  const rangedMult = formData.scalingCoefficients?.rangedMultiplier ?? 1;

  const { data: damagePreview } = useQuery({
    queryKey: [
      "character-damage-preview",
      campaignId,
      characterId,
      meleeMult,
      rangedMult,
    ],
    queryFn: () =>
      getDamagePreview(campaignId, characterId, {
        meleeMultiplier: meleeMult,
        rangedMultiplier: rangedMult,
      }),
    enabled: !!campaignId && !!characterId && characterLoaded,
  });

  const { data: allSpells = [] } = useQuery({
    queryKey: ["spells", campaignId],
    queryFn: () => getSpells(campaignId),
    enabled: !!campaignId && characterLoaded,
  });

  const { data: allSkills = [] } = useSkills(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId, {
    enabled: !!campaignId && characterLoaded,
  });

  const { data: rawSkillTrees = [] } = useQuery({
    queryKey: ["skill-trees", campaignId],
    queryFn: () => getSkillTrees(campaignId),
    enabled: !!campaignId && characterLoaded && !!basicInfo.race,
  });

  const resolvedSkillTree = useMemo((): SkillTree | null => {
    if (!basicInfo.race || !rawSkillTrees.length) return null;

    const raw = rawSkillTrees.find(
      (t) => (t as { race?: string }).race === basicInfo.race,
    );

    if (!raw) return null;

    const tree = convertPrismaToSkillTree(raw as {
      id: string;
      campaignId: string;
      race: string;
      skills: unknown;
      createdAt: Date;
    });

    if (!tree || mainSkills.length === 0) return tree;

    return {
      ...tree,
      mainSkills: tree.mainSkills.map((ms) => {
        const apiMs = mainSkills.find((m) => m.id === ms.id);

        return apiMs?.spellGroupId
          ? { ...ms, spellGroupId: apiMs.spellGroupId }
          : ms;
      }),
    };
  }, [basicInfo.race, rawSkillTrees, mainSkills]);

  const learnedSpellIdsFromSkills = useMemo(() => {
    const progress = (formData.skillTreeProgress ?? {}) as SkillTreeProgress;

    if (Object.keys(progress).length === 0 || allSpells.length === 0) {
      return [];
    }

    let fromTree: string[] = [];

    if (
      resolvedSkillTree &&
      allSkills.length > 0 &&
      mainSkills.length > 0
    ) {
      fromTree = getLearnedSpellIdsFromTree(
        resolvedSkillTree,
        progress,
        allSkills,
        allSpells,
      );
    }

    if (fromTree.length === 0 && mainSkills.length > 0) {
      const librarySkills = allSkills.filter((s) => s.spellGroupId != null);

      fromTree = getLearnedSpellIdsFromProgress(
        progress,
        mainSkills,
        allSpells,
        librarySkills,
      );
    }

    return fromTree;
  }, [
    formData.skillTreeProgress,
    resolvedSkillTree,
    allSkills,
    allSpells,
    mainSkills,
  ]);

  const effectiveKnownSpellIds = useMemo(
    () =>
      Array.from(
        new Set([...spellcasting.knownSpells, ...learnedSpellIdsFromSkills]),
      ),
    [spellcasting.knownSpells, learnedSpellIdsFromSkills],
  );

  const schoolsByCount = useMemo(
    () =>
      allSpells
        .filter((s: Spell) => effectiveKnownSpellIds.includes(s.id))
        .reduce<Record<string, number>>((acc, s) => {
          const name = s.spellGroup?.name ?? "Без школи";

          acc[name] = (acc[name] ?? 0) + 1;

          return acc;
        }, {}),
    [allSpells, effectiveKnownSpellIds],
  );

  const handleSaveSkillTree = async () => {
    setSaveError(null);
    setSavingTree(true);
    try {
      await updateCharacter(campaignId, characterId, {
        skillTreeProgress: formData.skillTreeProgress ?? {},
      });

      setLastSavedSkillTreeProgress(formData.skillTreeProgress ?? {});
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSavingTree(false);
    }
  };

  const artifactOptions = artifacts.map(
    (a: { id: string; name: string; slot: string; icon?: string | null }) => ({
      id: a.id,
      name: a.name,
      slot: a.slot ?? "item",
      icon: a.icon ?? null,
    }),
  );

  const artifactsDetail = artifacts as ArtifactListItem[];

  const artifactSetsRows = artifactSets as ArtifactSetRow[];

  return {
    characterLoaded,
    formData,
    error,
    saveError,
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    abilities,
    spellcasting,
    equipped,
    setFormData,
    artifacts: artifactOptions,
    artifactsDetail,
    artifactSets: artifactSetsRows,
    damagePreview,
    schoolsByCount,
    lastSavedSkillTreeProgress,
    savingTree,
    handleSaveSkillTree,
  };
}
