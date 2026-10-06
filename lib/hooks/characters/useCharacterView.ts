"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCharacterForm } from "./useCharacterForm";

import { getArtifactSets } from "@/lib/api/artifact-sets";
import { type ArtifactListItem, getArtifacts } from "@/lib/api/artifacts";
import { getCharacter, getDamagePreview } from "@/lib/api/characters";
import { getSpells } from "@/lib/api/spells";
import { useCharacterLearnedSpellIds } from "@/lib/hooks/skills";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { Character } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";
import type { Spell } from "@/types/spells";

export function useCharacterView(campaignId: string, characterId: string) {
  const [characterLoaded, setCharacterLoaded] = useState(false);

  const [equipped, setEquipped] = useState<EquippedItems>({});

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

  const effectiveKnownSpellIds = useCharacterLearnedSpellIds(campaignId, characterId, spellcasting.knownSpells);

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
  };
}
