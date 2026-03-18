"use client";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterSkillTreeView } from "@/components/characters/abilities/CharacterSkillTreeView";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterDamagePreview } from "@/components/characters/stats/CharacterDamagePreview";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { useCharacterForm } from "@/lib/hooks/characters";
import type { CampaignMember } from "@/types/campaigns";
import type { CharacterFormData } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";
import type { Race } from "@/types/races";

type CharacterFormReturn = ReturnType<typeof useCharacterForm>;

export interface DmCharacterEditFormAccordionProps {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData | ((prev: CharacterFormData) => CharacterFormData)) => void;
  basicInfo: CharacterFormReturn["basicInfo"];
  abilityScores: CharacterFormReturn["abilityScores"];
  combatStats: CharacterFormReturn["combatStats"];
  skills: CharacterFormReturn["skills"];
  abilities: CharacterFormReturn["abilities"];
  spellcasting: CharacterFormReturn["spellcasting"];
  campaignId: string;
  characterId: string;
  equipped: EquippedItems;
  setEquipped: (eq: EquippedItems | ((prev: EquippedItems) => EquippedItems)) => void;
  artifacts: { id: string; name: string; slot: string; icon?: string | null }[];
  members: CampaignMember[];
  races: Race[];
}

export function DmCharacterEditFormAccordion({
  formData,
  setFormData,
  basicInfo,
  abilityScores,
  combatStats,
  skills,
  abilities,
  spellcasting,
  campaignId,
  characterId,
  equipped,
  setEquipped,
  artifacts,
  members,
  races,
}: DmCharacterEditFormAccordionProps) {
  return (
    <Accordion
      type="single"
      defaultValue="item-1"
      collapsible
      className="space-y-4"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger>1. Загальна інформація</AccordionTrigger>
        <AccordionContent>
          <CharacterBasicInfo
            basicInfo={basicInfo}
            campaignMembers={members}
            races={races}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2">
        <AccordionTrigger>2. Основні характеристики</AccordionTrigger>
        <AccordionContent>
          <CharacterAbilityScores abilityScores={abilityScores} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3">
        <AccordionTrigger>3. Бойові параметри</AccordionTrigger>
        <AccordionContent className="space-y-6">
          <CharacterHpPreview
            level={basicInfo.level}
            strength={abilityScores.strength}
            coefficient={formData.scalingCoefficients?.hpMultiplier ?? 1}
            onCoefficientChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                scalingCoefficients: {
                  ...prev.scalingCoefficients,
                  hpMultiplier: v,
                  meleeMultiplier: prev.scalingCoefficients?.meleeMultiplier ?? 1,
                  rangedMultiplier: prev.scalingCoefficients?.rangedMultiplier ?? 1,
                },
              }))
            }
            isDm
          />
          <CharacterDamagePreview
            campaignId={campaignId}
            characterId={characterId}
            meleeCoefficient={formData.scalingCoefficients?.meleeMultiplier ?? 1}
            rangedCoefficient={formData.scalingCoefficients?.rangedMultiplier ?? 1}
            onMeleeCoefficientChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                scalingCoefficients: {
                  ...prev.scalingCoefficients,
                  hpMultiplier: prev.scalingCoefficients?.hpMultiplier ?? 1,
                  meleeMultiplier: v,
                  rangedMultiplier: prev.scalingCoefficients?.rangedMultiplier ?? 1,
                },
              }))
            }
            onRangedCoefficientChange={(v) =>
              setFormData((prev) => ({
                ...prev,
                scalingCoefficients: {
                  ...prev.scalingCoefficients,
                  hpMultiplier: prev.scalingCoefficients?.hpMultiplier ?? 1,
                  meleeMultiplier: prev.scalingCoefficients?.meleeMultiplier ?? 1,
                  rangedMultiplier: v,
                },
              }))
            }
            isDm
          />
          <CharacterCombatParams combatStats={combatStats} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-4">
        <AccordionTrigger>4. Навички та Збереження</AccordionTrigger>
        <AccordionContent>
          <CharacterSkillsSection skills={skills} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-5">
        <AccordionTrigger>5. Уміння</AccordionTrigger>
        <AccordionContent>
          <CharacterAbilitiesSection
            campaignId={campaignId}
            abilities={abilities}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const hasProgress =
                  formData.skillTreeProgress &&
                  Object.keys(formData.skillTreeProgress).length > 0;

                if (
                  !hasProgress ||
                  confirm(
                    "Скинути всі прокачані уміння цього персонажа? Зміни збережаться після натискання «Зберегти зміни».",
                  )
                ) {
                  setFormData((prev) => ({
                    ...prev,
                    skillTreeProgress: {},
                  }));
                }
              }}
            >
              Скинути дерево прокачки
            </Button>
          </div>
          <CharacterSkillTreeView
            campaignId={campaignId}
            characterRace={basicInfo.race}
            characterLevel={basicInfo.level}
            skillTreeProgress={formData.skillTreeProgress ?? {}}
            onSkillTreeProgressChange={(next) =>
              setFormData((prev) => ({ ...prev, skillTreeProgress: next }))
            }
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-6">
        <AccordionTrigger>6. Артефакти</AccordionTrigger>
        <AccordionContent>
          <CharacterArtifactsSection
            knownSpellIds={spellcasting.knownSpells}
            campaignId={campaignId}
            characterRace={basicInfo.race}
            skillTreeProgress={formData.skillTreeProgress ?? {}}
            characterId={characterId}
            equipped={equipped}
            artifacts={artifacts.map((a) => ({
              id: a.id,
              name: a.name,
              slot: a.slot ?? "item",
              icon: a.icon ?? null,
            }))}
            onEquippedChange={setEquipped}
            spellSlots={formData.spellcasting.spellSlots}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
