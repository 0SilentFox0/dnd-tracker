"use client";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterDamagePreview } from "@/components/characters/stats/CharacterDamagePreview";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import { ProgressionPanel } from "@/components/skill-tree/progression";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { DmCharacterEditor } from "@/lib/hooks/characters";

export function DmCharacterEditFormAccordion({ editor }: { editor: DmCharacterEditor }) {
  const {
    form: { formData, setFormData, basicInfo, abilityScores, combatStats, skills, abilities, spellcasting },
    campaignId,
    characterId,
    equipped,
    setEquipped,
    artifacts,
    artifactSets,
    members,
    races,
  } = editor;

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
          <div className="mt-4">
            <ProgressionPanel campaignId={campaignId} characterId={characterId} canManage />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-6">
        <AccordionTrigger>6. Артефакти</AccordionTrigger>
        <AccordionContent>
          <CharacterArtifactsSection
            knownSpellIds={spellcasting.knownSpells}
            campaignId={campaignId}
            characterId={characterId}
            progressionCharacterId={characterId}
            equipped={equipped}
            artifacts={artifacts.map((a) => ({
              id: a.id,
              name: a.name,
              slot: a.slot ?? "item",
              icon: a.icon ?? null,
            }))}
            artifactSets={artifactSets}
            onEquippedChange={setEquipped}
            spellSlots={formData.spellcasting.spellSlots}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
