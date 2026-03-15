"use client";

import {
  noopAbilitiesSetters,
  noopAbilitySetters,
  noopCombatSetters,
} from "./constants";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterSkillTreeView } from "@/components/characters/abilities/CharacterSkillTreeView";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterDamageCalculator } from "@/components/characters/stats/CharacterDamageCalculator";
import { CharacterDamagePreview } from "@/components/characters/stats/CharacterDamagePreview";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SkillTreeProgress } from "@/lib/hooks/useCharacterView";
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
    skillTreeProgress?: SkillTreeProgress;
    scalingCoefficients?: {
      hpMultiplier?: number;
      meleeMultiplier?: number;
      rangedMultiplier?: number;
    };
  };
  equipped: EquippedItems;
  artifactOptions: Array<{
    id: string;
    name: string;
    slot: string;
    icon?: string | null;
  }>;
  members: CampaignMember[];
  races: Race[];
  isPlayerView: boolean;
  lastSavedSkillTreeProgress: SkillTreeProgress;
  onSkillTreeProgressChange: (next: SkillTreeProgress) => void;
  onResetSkillTree: () => void;
  savingTree: boolean;
  handleSaveSkillTree: () => Promise<void>;
  error: string | null;
  saveError: string | null;
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
  artifactOptions,
  lastSavedSkillTreeProgress,
  onSkillTreeProgressChange,
  savingTree,
  handleSaveSkillTree,
  error,
  saveError,
}: CharacterViewSingleCardProps) {
  const scalingCoefficients = formData.scalingCoefficients ?? {};

  return (
    <Card className="overflow-hidden">
      <CardContent className="w-full overflow-x-auto pt-4 sm:pt-6">
        {(error || saveError) && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <strong>Помилка:</strong> {error ?? saveError}
          </div>
        )}

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              Основні характеристики
            </h2>
            <CharacterAbilityScores
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
            <CharacterSkillTreeView
              campaignId={campaignId}
              characterRace={(basicInfo.race as string) ?? ""}
              characterLevel={(basicInfo.level as number) ?? 1}
              skillTreeProgress={formData.skillTreeProgress ?? {}}
              savedSkillTreeProgress={lastSavedSkillTreeProgress}
              onSkillTreeProgressChange={onSkillTreeProgressChange}
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleSaveSkillTree}
                disabled={savingTree}
                className="touch-manipulation"
              >
                {savingTree ? "Збереження…" : "Зберегти дерево скілів"}
              </Button>
            </div>
          </section>

          <CharacterDamageCalculator
            campaignId={campaignId}
            characterId={characterId}
            level={(basicInfo.level as number) ?? 1}
            scalingCoefficients={formData.scalingCoefficients}
            skillTreeProgress={formData.skillTreeProgress ?? {}}
            knownSpellIds={spellcasting.knownSpells}
          />

          <section>
            <h2 className="mb-3 text-lg font-semibold">Артефакти</h2>
            <CharacterArtifactsSection
              knownSpellIds={spellcasting.knownSpells}
              campaignId={campaignId}
              characterRace={basicInfo.race as string}
              skillTreeProgress={formData.skillTreeProgress ?? {}}
              equipped={equipped}
              artifacts={artifactOptions}
              spellSlots={spellcasting.spellSlots}
            />
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
