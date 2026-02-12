"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getCharacter, updateCharacter } from "@/lib/api/characters";
import { useCharacterForm } from "@/lib/hooks/useCharacterForm";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";

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
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/artifacts`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
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
    queryFn: async () => {
      const params = new URLSearchParams();
      if (meleeMult !== 1) params.set("meleeMultiplier", String(meleeMult));
      if (rangedMult !== 1) params.set("rangedMultiplier", String(rangedMult));
      const qs = params.toString();
      const url = `/api/campaigns/${campaignId}/characters/${characterId}/damage-preview${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json() as Promise<{
        melee: { total: number };
        ranged: { total: number };
      }>;
    },
    enabled: !!campaignId && !!characterId && characterLoaded,
  });

  const { data: allSpells = [] } = useQuery({
    queryKey: ["spells", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/spells`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled:
      !!campaignId && characterLoaded && spellcasting.knownSpells.length > 0,
  });

  const schoolsByCount = allSpells
    .filter((s: { id: string }) => spellcasting.knownSpells.includes(s.id))
    .reduce<Record<string, number>>(
      (acc, s: { spellGroup?: { name: string } | null }) => {
        const name = s.spellGroup?.name ?? "Без школи";
        acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      },
      {},
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
    damagePreview,
    schoolsByCount,
    lastSavedSkillTreeProgress,
    savingTree,
    handleSaveSkillTree,
  };
}
