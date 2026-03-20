"use client";

import { useMemo } from "react";

import {
  CharacterHeroBlock,
  CharacterViewAccordion,
  CharacterViewSingleCard,
} from "./components/character-view";

import type { CharacterAbilityArtifactBonuses } from "@/components/characters/stats/CharacterAbilityScores";
import type { CharacterCombatArtifactBonuses } from "@/components/characters/stats/CharacterCombatParams";
import { Card, CardContent } from "@/components/ui/card";
import { ReadOnlyProvider } from "@/components/ui/read-only-context";
import { getHeroMaxHpBreakdown } from "@/lib/constants/hero-scaling";
import { useCampaignMembers } from "@/lib/hooks/campaigns";
import { useCharacterView } from "@/lib/hooks/characters";
import { useRaces } from "@/lib/hooks/races";
import { sumEquippedArtifactFlatBonuses } from "@/lib/utils/artifacts/sum-equipped-artifact-flat-bonuses";

export function CharacterViewClient({
  campaignId,
  characterId,
  allowPlayerEdit,
  isDM,
}: {
  campaignId: string;
  characterId: string;
  allowPlayerEdit: boolean;
  isDM?: boolean;
}) {
  const { members } = useCampaignMembers(campaignId);

  const { data: races = [] } = useRaces(campaignId);

  const {
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
    artifacts,
    artifactsDetail,
    artifactSets,
    damagePreview,
    schoolsByCount,
    lastSavedSkillTreeProgress,
    savingTree,
    handleSaveSkillTree,
  } = useCharacterView(campaignId, characterId);

  const isPlayerView = isDM !== undefined ? !isDM : !allowPlayerEdit;

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

  const hpMult = formData.scalingCoefficients?.hpMultiplier ?? 1;

  const heroHp = getHeroMaxHpBreakdown(
    basicInfo.level,
    abilityScores.strength,
    { hpMultiplier: hpMult },
  );

  if (!characterLoaded || !formData.basicInfo.name) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Завантаження...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ReadOnlyProvider value={isPlayerView}>
      <div className="min-h-screen pb-8 container mx-auto max-w-3xl md:px-4 py-4 sm:px-6 sm:py-6 md:max-w-4xl">
        {isPlayerView && (
          <CharacterHeroBlock
            basicInfo={basicInfo}
            combatStats={combatStats}
            heroHp={heroHp}
            damagePreview={damagePreview ?? undefined}
            spellcasting={spellcasting}
            schoolsByCount={schoolsByCount}
          />
        )}

        {isPlayerView ? (
          <CharacterViewSingleCard
            campaignId={campaignId}
            characterId={characterId}
            basicInfo={basicInfo}
            abilityScores={abilityScores}
            combatStats={combatStats}
            abilities={abilities}
            spellcasting={spellcasting}
            formData={formData}
            equipped={equipped}
            artifactAbilityBonuses={artifactAbilityBonuses}
            artifactCombatBonuses={artifactCombatBonuses}
            artifactSets={artifactSets}
            artifactOptions={artifacts}
            members={members}
            races={races}
            isPlayerView={isPlayerView}
            lastSavedSkillTreeProgress={lastSavedSkillTreeProgress}
            onSkillTreeProgressChange={(next) =>
              setFormData((prev) => ({
                ...prev,
                skillTreeProgress: next,
              }))
            }
            onResetSkillTree={() => {}}
            savingTree={savingTree}
            handleSaveSkillTree={handleSaveSkillTree}
            error={error}
            saveError={saveError}
          />
        ) : (
          <CharacterViewAccordion
            campaignId={campaignId}
            characterId={characterId}
            basicInfo={basicInfo}
            abilityScores={abilityScores}
            combatStats={combatStats}
            skills={skills}
            abilities={abilities}
            spellcasting={spellcasting}
            formData={formData}
            equipped={equipped}
            artifactAbilityBonuses={artifactAbilityBonuses}
            artifactCombatBonuses={artifactCombatBonuses}
            artifactSets={artifactSets}
            artifactOptions={artifacts}
            members={members}
            races={races}
            isPlayerView={isPlayerView}
            lastSavedSkillTreeProgress={lastSavedSkillTreeProgress}
            onSkillTreeProgressChange={(next) =>
              setFormData((prev) => ({
                ...prev,
                skillTreeProgress: next,
              }))
            }
            onResetSkillTree={() => {
              const hasProgress =
                formData.skillTreeProgress &&
                Object.keys(formData.skillTreeProgress).length > 0;

              if (
                !hasProgress ||
                confirm(
                  "Скинути всі прокачані уміння цього персонажа? Натисніть «Зберегти дерево скілів» щоб зберегти зміни.",
                )
              ) {
                setFormData((prev) => ({
                  ...prev,
                  skillTreeProgress: {},
                }));
              }
            }}
            savingTree={savingTree}
            handleSaveSkillTree={handleSaveSkillTree}
            error={error}
            saveError={saveError}
          />
        )}
      </div>
    </ReadOnlyProvider>
  );
}
