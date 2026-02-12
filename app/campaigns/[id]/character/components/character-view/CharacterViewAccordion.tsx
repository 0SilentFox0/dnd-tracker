"use client";

import {
  AbilitiesAccordion,
  AbilityScoresAccordion,
  ArtifactsAccordion,
  BasicInfoAccordion,
  CombatParamsAccordion,
  SkillsAccordion,
} from "./accordion";

import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import type { SkillTreeProgress } from "@/lib/hooks/useCharacterView";
import type { CampaignMember } from "@/types/campaigns";
import type { EquippedItems } from "@/types/inventory";
import type { Race } from "@/types/races";

export interface CharacterViewAccordionProps {
  campaignId: string;
  characterId: string;
  basicInfo: Record<string, unknown>;
  abilityScores: Record<string, unknown>;
  combatStats: Record<string, unknown>;
  skills: Record<string, unknown>;
  abilities: Record<string, unknown>;
  spellcasting: { knownSpells: string[] };
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

export function CharacterViewAccordion({
  campaignId,
  characterId,
  basicInfo,
  abilityScores,
  combatStats,
  skills,
  abilities,
  spellcasting,
  formData,
  equipped,
  artifactOptions,
  members,
  races,
  isPlayerView,
  lastSavedSkillTreeProgress,
  onSkillTreeProgressChange,
  onResetSkillTree,
  savingTree,
  handleSaveSkillTree,
  error,
  saveError,
}: CharacterViewAccordionProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="w-full overflow-x-auto pt-4 sm:pt-6">
        {(error || saveError) && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <strong>Помилка:</strong> {error ?? saveError}
          </div>
        )}

        <Accordion
          type="single"
          defaultValue="item-1"
          collapsible
          className="space-y-2 sm:space-y-3"
        >
          <BasicInfoAccordion
            basicInfo={basicInfo}
            members={members}
            races={races}
            isPlayerView={isPlayerView}
          />
          <AbilityScoresAccordion abilityScores={abilityScores} />
          <CombatParamsAccordion
            campaignId={campaignId}
            characterId={characterId}
            basicInfo={basicInfo}
            abilityScores={abilityScores}
            combatStats={combatStats}
            scalingCoefficients={formData.scalingCoefficients}
          />
          <SkillsAccordion skills={skills} />
          <AbilitiesAccordion
            campaignId={campaignId}
            basicInfo={basicInfo}
            abilities={abilities}
            formData={formData}
            isPlayerView={isPlayerView}
            lastSavedSkillTreeProgress={lastSavedSkillTreeProgress}
            onSkillTreeProgressChange={onSkillTreeProgressChange}
            onResetSkillTree={onResetSkillTree}
            savingTree={savingTree}
            handleSaveSkillTree={handleSaveSkillTree}
          />
          <ArtifactsAccordion
            campaignId={campaignId}
            basicInfo={basicInfo}
            spellcasting={spellcasting}
            skillTreeProgress={formData.skillTreeProgress ?? {}}
            equipped={equipped}
            artifactOptions={artifactOptions}
          />
        </Accordion>
      </CardContent>
    </Card>
  );
}
