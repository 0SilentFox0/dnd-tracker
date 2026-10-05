"use client";

import {
  noopAbilitiesSetters,
  noopAbilitySetters,
  noopCombatSetters,
} from "./constants";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import type { CharacterAbilityArtifactBonuses } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import type { CharacterCombatArtifactBonuses } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterDamageCalculator } from "@/components/characters/stats/CharacterDamageCalculator";
import { CharacterDamagePreview } from "@/components/characters/stats/CharacterDamagePreview";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import { ProgressionPanel } from "@/components/skill-tree/progression";
import { Card, CardContent } from "@/components/ui/card";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { CampaignMember } from "@/types/campaigns";
import type { EquippedItems } from "@/types/inventory";
import type { Race } from "@/types/races";

export interface CharacterViewSingleCardProps {
  campaignId: string;
  characterId: string;
  basicInfo: Record<string, unknown>;
  abilityScores: Record<string, unknown>;
  combatStats: Record<string, unknown>;
  abilities: Record<string, unknown>;
  spellcasting: {
    knownSpells: string[];
    spellSlots?: Record<string, { max: number; current: number }>;
  };
  formData: {
    scalingCoefficients?: {
      hpMultiplier?: number;
      meleeMultiplier?: number;
      rangedMultiplier?: number;
    };
  };
  equipped: EquippedItems;
  artifactAbilityBonuses?: CharacterAbilityArtifactBonuses;
  artifactCombatBonuses?: CharacterCombatArtifactBonuses;
  artifactSets?: ArtifactSetRow[];
  artifactOptions: Array<{
    id: string;
    name: string;
    slot: string;
    icon?: string | null;
  }>;
  members: CampaignMember[];
  races: Race[];
  isPlayerView: boolean;
  canManage: boolean;
  error: string | null;
}

export function CharacterViewSingleCard({
  campaignId,
  characterId,
  basicInfo,
  abilityScores,
  combatStats,
  abilities,
  spellcasting,
  formData,
  equipped,
  artifactAbilityBonuses,
  artifactCombatBonuses,
  artifactSets,
  artifactOptions,
  canManage,
  error,
}: CharacterViewSingleCardProps) {
  const scalingCoefficients = formData.scalingCoefficients ?? {};

  return (
    <Card className="overflow-hidden">
      <CardContent className="w-full overflow-x-auto pt-4 sm:pt-6">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <strong>Помилка:</strong> {error}
          </div>
        )}

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Основні характеристики
            </h2>
            <CharacterAbilityScores
              artifactBonuses={artifactAbilityBonuses}
              abilityScores={
                {
                  ...abilityScores,
                  setters: noopAbilitySetters,
                } as unknown as Parameters<
                  typeof CharacterAbilityScores
                >[0]["abilityScores"]
              }
            />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Бойові параметри</h2>
            <div className="space-y-6">
              <CharacterHpPreview
                level={(basicInfo.level as number) ?? 1}
                strength={(abilityScores?.strength as number) ?? 10}
                coefficient={scalingCoefficients.hpMultiplier ?? 1}
                isDm={false}
              />
              <CharacterDamagePreview
                campaignId={campaignId}
                characterId={characterId}
                meleeCoefficient={scalingCoefficients.meleeMultiplier ?? 1}
                rangedCoefficient={scalingCoefficients.rangedMultiplier ?? 1}
                isDm={false}
              />
              <CharacterCombatParams
                artifactBonuses={artifactCombatBonuses}
                combatStats={
                  {
                    ...combatStats,
                    setters: noopCombatSetters,
                  } as unknown as Parameters<
                    typeof CharacterCombatParams
                  >[0]["combatStats"]
                }
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Уміння</h2>
            <CharacterAbilitiesSection
              campaignId={campaignId}
              abilities={
                {
                  ...abilities,
                  setters: noopAbilitiesSetters,
                } as unknown as Parameters<
                  typeof CharacterAbilitiesSection
                >[0]["abilities"]
              }
            />
            <ProgressionPanel campaignId={campaignId} characterId={characterId} canManage={canManage} />
          </section>

          <CharacterDamageCalculator
            campaignId={campaignId}
            characterId={characterId}
            level={(basicInfo.level as number) ?? 1}
            scalingCoefficients={formData.scalingCoefficients}
            knownSpellIds={spellcasting.knownSpells}
          />

          <section>
            <h2 className="mb-3 text-lg font-semibold">Артефакти</h2>
            <CharacterArtifactsSection
              knownSpellIds={spellcasting.knownSpells}
              campaignId={campaignId}
              progressionCharacterId={characterId}
              equipped={equipped}
              artifacts={artifactOptions}
              artifactSets={artifactSets}
              spellSlots={spellcasting.spellSlots}
            />
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
