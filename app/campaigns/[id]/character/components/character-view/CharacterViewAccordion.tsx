"use client";

import {
  AbilitiesAccordion,
  AbilityScoresAccordion,
  ArtifactsAccordion,
  BasicInfoAccordion,
  CombatParamsAccordion,
  SkillsAccordion,
} from "./accordion";

import type { CharacterAbilityArtifactBonuses } from "@/components/characters/stats/CharacterAbilityScores";
import type { CharacterCombatArtifactBonuses } from "@/components/characters/stats/CharacterCombatParams";
import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import type { ArtifactSetRow } from "@/types/artifact-sets";
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
  artifactAbilityBonuses,
  artifactCombatBonuses,
  artifactSets,
  artifactOptions,
  members,
  races,
  isPlayerView,
  canManage,
  error,
}: CharacterViewAccordionProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="w-full overflow-x-auto pt-4 sm:pt-6">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <strong>Помилка:</strong> {error}
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
          <AbilityScoresAccordion
            abilityScores={abilityScores}
            artifactBonuses={artifactAbilityBonuses}
          />
          <CombatParamsAccordion
            campaignId={campaignId}
            characterId={characterId}
            basicInfo={basicInfo}
            abilityScores={abilityScores}
            combatStats={combatStats}
            scalingCoefficients={formData.scalingCoefficients}
            artifactCombatBonuses={artifactCombatBonuses}
          />
          <SkillsAccordion skills={skills} />
          <AbilitiesAccordion campaignId={campaignId} characterId={characterId} abilities={abilities} canManage={canManage} />
          <ArtifactsAccordion
            campaignId={campaignId}
            characterId={characterId}
            spellcasting={spellcasting}
            equipped={equipped}
            artifactSets={artifactSets}
            artifactOptions={artifactOptions}
          />
        </Accordion>
      </CardContent>
    </Card>
  );
}
