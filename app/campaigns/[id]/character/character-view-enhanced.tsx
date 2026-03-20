"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { CharacterViewEnhancedAccordion } from "./components/character-view/CharacterViewEnhancedAccordion";
import { CharacterViewPlayerHero } from "./components/character-view/CharacterViewPlayerHero";

import type { CharacterAbilityArtifactBonuses } from "@/components/characters/stats/CharacterAbilityScores";
import type { CharacterCombatArtifactBonuses } from "@/components/characters/stats/CharacterCombatParams";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReadOnlyProvider } from "@/components/ui/read-only-context";
import { getArtifactSets } from "@/lib/api/artifact-sets";
import { type ArtifactListItem,getArtifacts } from "@/lib/api/artifacts";
import { getCharacter, updateCharacter } from "@/lib/api/characters";
import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";
import { useCampaignMembers } from "@/lib/hooks/campaigns";
import { useCharacterForm } from "@/lib/hooks/characters";
import { useRaces } from "@/lib/hooks/races";
import { sumEquippedArtifactFlatBonuses } from "@/lib/utils/artifacts/sum-equipped-artifact-flat-bonuses";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { Character } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";

export function CharacterViewEnhanced({
  campaignId,
  characterId,
  allowPlayerEdit,
}: {
  campaignId: string;
  characterId: string;
  allowPlayerEdit: boolean;
}) {
  const { members } = useCampaignMembers(campaignId);

  const { data: races = [] } = useRaces(campaignId);

  const [characterLoaded, setCharacterLoaded] = useState(false);

  const [equipped, setEquipped] = useState<EquippedItems>({});

  const [savingTree, setSavingTree] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);

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
  } = useCharacterForm({
    onSubmit: async () => {},
  });

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

  useEffect(() => {
    let cancelled = false;

    const fetchCharacter = async () => {
      try {
        const character: Character = await getCharacter(
          campaignId,
          characterId,
        );

        if (cancelled) return;

        setFormData(characterToFormData(character));
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

  const artifactSetsRows = artifactSets as ArtifactSetRow[];

  const artifactOptions = artifacts.map(
    (a: { id: string; name: string; slot: string; icon?: string | null }) => ({
      id: a.id,
      name: a.name,
      slot: a.slot ?? "item",
      icon: a.icon ?? null,
    }),
  );

  const artifactsDetail = artifacts as ArtifactListItem[];

  const equippedArtifactBonuses = useMemo(
    () => sumEquippedArtifactFlatBonuses(equipped, artifactsDetail),
    [equipped, artifactsDetail],
  );

  const artifactAbilityBonuses: CharacterAbilityArtifactBonuses = useMemo(
    () => ({
      strength: equippedArtifactBonuses.strength,
      dexterity: equippedArtifactBonuses.dexterity,
      constitution: equippedArtifactBonuses.constitution,
      intelligence: equippedArtifactBonuses.intelligence,
      wisdom: equippedArtifactBonuses.wisdom,
      charisma: equippedArtifactBonuses.charisma,
    }),
    [equippedArtifactBonuses],
  );

  const artifactCombatBonuses: CharacterCombatArtifactBonuses = useMemo(
    () => ({
      armorClass: equippedArtifactBonuses.armorClass,
      initiative: equippedArtifactBonuses.initiative,
      speed: equippedArtifactBonuses.speed,
      minTargets: equippedArtifactBonuses.minTargets,
      maxTargets: equippedArtifactBonuses.maxTargets,
      morale: equippedArtifactBonuses.morale,
      spellSlotBonusByLevel: equippedArtifactBonuses.spellSlotBonusByLevel,
    }),
    [equippedArtifactBonuses],
  );

  const handleSaveSkillTree = async () => {
    setSaveError(null);
    setSavingTree(true);
    try {
      await updateCharacter(campaignId, characterId, {
        skillTreeProgress: formData.skillTreeProgress ?? {},
      });
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSavingTree(false);
    }
  };

  if (!characterLoaded || !formData.basicInfo.name) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground animate-pulse">
                Завантаження персонажа...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPlayerView = !allowPlayerEdit;

  const hpMult = formData.scalingCoefficients?.hpMultiplier ?? 1;

  const heroHp = getHeroMaxHpBreakdown(
    basicInfo.level,
    abilityScores.strength,
    {
      hpMultiplier: hpMult,
    },
  );

  // Calculate ability modifiers for display
  const getModifier = (score: number) => Math.floor((score - 10) / 2);

  const abilityMods = {
    strength: getModifier(abilityScores.strength),
    dexterity: getModifier(abilityScores.dexterity),
    constitution: getModifier(abilityScores.constitution),
    intelligence: getModifier(abilityScores.intelligence),
    wisdom: getModifier(abilityScores.wisdom),
    charisma: getModifier(abilityScores.charisma),
  };

  return (
    <ReadOnlyProvider value={!allowPlayerEdit}>
      <div className="min-h-screen pb-8">
        {isPlayerView && (
          <CharacterViewPlayerHero
            basicInfo={basicInfo}
            combatStats={combatStats}
            heroHp={heroHp}
            abilityScores={abilityScores}
            abilityMods={abilityMods}
          />
        )}

        {/* Main Content */}
        <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6">
          {/* Edit Mode Header */}
          {allowPlayerEdit && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {formData.basicInfo.name}
              </h1>
              <Link href={`/campaigns/${campaignId}/character/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-manipulation"
                >
                  Редагувати повністю
                </Button>
              </Link>
            </div>
          )}

          {/* Error Display */}
          {(error || saveError) && (
            <Card className="mb-6 border-destructive/50 bg-destructive/10">
              <CardContent className="py-4">
                <p className="text-sm text-destructive">
                  <strong>Помилка:</strong> {error ?? saveError}
                </p>
              </CardContent>
            </Card>
          )}

          <CharacterViewEnhancedAccordion
            campaignId={campaignId}
            characterId={characterId}
            isPlayerView={isPlayerView}
            artifactAbilityBonuses={artifactAbilityBonuses}
            artifactCombatBonuses={artifactCombatBonuses}
            artifactSets={artifactSetsRows}
            formData={formData}
            onSkillTreeProgressChange={(next) =>
              setFormData((prev) => ({
                ...prev,
                skillTreeProgress: next as typeof prev.skillTreeProgress,
              }))
            }
            basicInfo={basicInfo as Record<string, unknown>}
            abilityScores={abilityScores as Record<string, unknown>}
            combatStats={combatStats as Record<string, unknown>}
            skills={skills as Record<string, unknown>}
            abilities={abilities as Record<string, unknown>}
            spellcasting={{
              knownSpells: spellcasting.knownSpells,
              spellSlots: spellcasting.spellSlots ?? {},
            }}
            equipped={equipped}
            artifactOptions={artifactOptions}
            members={members}
            races={races}
            onSaveSkillTree={handleSaveSkillTree}
            savingTree={savingTree}
          />
        </div>
      </div>
    </ReadOnlyProvider>
  );
}
