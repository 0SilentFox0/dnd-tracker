"use client";

import {
  Book,
  Crown,
  Scroll,
  Sparkles,
  Star,
  Sword,
} from "lucide-react";

import {
  noopAbilitiesSetters,
  noopAbilitySetters,
  noopBasicInfoSetters,
  noopCombatSetters,
  noopSkillHandlers,
} from "./constants";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterSkillTreeView } from "@/components/characters/abilities/CharacterSkillTreeView";
import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import type { CharacterAbilityArtifactBonuses } from "@/components/characters/stats/CharacterAbilityScores";
import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import type { CharacterCombatArtifactBonuses } from "@/components/characters/stats/CharacterCombatParams";
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
import type { SkillTreeProgress } from "@/lib/hooks/characters";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { CampaignMember } from "@/types/campaigns";
import type { EquippedItems } from "@/types/inventory";
import type { Race } from "@/types/races";

const accordionItemClass =
  "rounded-xl border border-primary/20 bg-gradient-to-br from-card to-card/80 shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-primary/40";

const triggerClass = "min-h-[48px] px-4 py-3 text-left font-semibold hover:no-underline group";

export interface CharacterViewEnhancedAccordionProps {
  campaignId: string;
  characterId: string;
  isPlayerView: boolean;
  formData: {
    basicInfo: { name: string; race?: string; level: number };
    scalingCoefficients?: { hpMultiplier?: number; meleeMultiplier?: number; rangedMultiplier?: number };
    skillTreeProgress?: Record<string, unknown>;
    spellcasting: { knownSpells?: string[]; spellSlots?: Record<string, { max: number; current: number }> };
  };
  onSkillTreeProgressChange: (next: Record<string, unknown>) => void;
  basicInfo: Record<string, unknown>;
  abilityScores: Record<string, unknown>;
  combatStats: Record<string, unknown>;
  skills: Record<string, unknown>;
  abilities: Record<string, unknown>;
  spellcasting: { knownSpells: string[]; spellSlots?: Record<string, { max: number; current: number }> };
  equipped: Record<string, unknown>;
  artifactAbilityBonuses?: CharacterAbilityArtifactBonuses;
  artifactCombatBonuses?: CharacterCombatArtifactBonuses;
  artifactSets?: ArtifactSetRow[];
  artifactOptions: Array<{ id: string; name: string; slot: string; icon?: string | null }>;
  members: CampaignMember[];
  races: Array<{ id: string; name: string }>;
  onSaveSkillTree: () => Promise<void>;
  savingTree: boolean;
}

export function CharacterViewEnhancedAccordion({
  campaignId,
  characterId,
  isPlayerView,
  formData,
  onSkillTreeProgressChange,
  basicInfo,
  abilityScores,
  combatStats,
  skills,
  abilities,
  spellcasting,
  equipped,
  artifactAbilityBonuses,
  artifactCombatBonuses,
  artifactSets,
  artifactOptions,
  members,
  races,
  onSaveSkillTree,
  savingTree,
}: CharacterViewEnhancedAccordionProps) {
  return (
    <Accordion
      type="single"
      defaultValue={isPlayerView ? "item-5" : "item-1"}
      collapsible
      className="space-y-3"
    >
      <AccordionItem value="item-1" className={accordionItemClass}>
        <AccordionTrigger className={triggerClass}>
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span>Загальна інформація</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <CharacterBasicInfo
            basicInfo={{ ...basicInfo, setters: noopBasicInfoSetters } as never}
            campaignMembers={members}
            races={races as Race[]}
            isPlayerView={isPlayerView}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-2" className={accordionItemClass}>
        <AccordionTrigger className={triggerClass}>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span>Основні характеристики</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <CharacterAbilityScores
            artifactBonuses={artifactAbilityBonuses}
            abilityScores={{ ...abilityScores, setters: noopAbilitySetters } as never}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3" className={accordionItemClass}>
        <AccordionTrigger className={triggerClass}>
          <div className="flex items-center gap-2">
            <Sword className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span>Бойові параметри</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-6 px-4 pb-4 pt-2">
          <CharacterHpPreview
            level={(basicInfo.level as number) ?? 1}
            strength={(abilityScores.strength as number) ?? 10}
            coefficient={formData.scalingCoefficients?.hpMultiplier ?? 1}
            isDm={false}
          />
          <CharacterDamagePreview
            campaignId={campaignId}
            characterId={characterId}
            meleeCoefficient={formData.scalingCoefficients?.meleeMultiplier ?? 1}
            rangedCoefficient={formData.scalingCoefficients?.rangedMultiplier ?? 1}
            isDm={false}
          />
          <CharacterCombatParams
            artifactBonuses={artifactCombatBonuses}
            combatStats={{ ...combatStats, setters: noopCombatSetters } as never}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-4" className={accordionItemClass}>
        <AccordionTrigger className={triggerClass}>
          <div className="flex items-center gap-2">
            <Scroll className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span>Навички та збереження</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <CharacterSkillsSection
            skills={{ ...skills, handlers: noopSkillHandlers } as never}
          />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-5" className={accordionItemClass}>
        <AccordionTrigger className={triggerClass}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span>Уміння</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <CharacterAbilitiesSection
            campaignId={campaignId}
            abilities={{ ...abilities, setters: noopAbilitiesSetters } as never}
          />
          <CharacterSkillTreeView
            campaignId={campaignId}
            characterRace={(basicInfo.race as string) ?? ""}
            characterLevel={(basicInfo.level as number) ?? 1}
            skillTreeProgress={(formData.skillTreeProgress ?? {}) as SkillTreeProgress}
            onSkillTreeProgressChange={onSkillTreeProgressChange}
          />
          <div className="mt-4">
            <Button
              type="button"
              onClick={onSaveSkillTree}
              disabled={savingTree}
              className="touch-manipulation w-full sm:w-auto"
            >
              {savingTree ? "Збереження…" : "Зберегти дерево скілів"}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-6" className={accordionItemClass}>
        <AccordionTrigger className={triggerClass}>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            <span>Артефакти</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <CharacterArtifactsSection
            knownSpellIds={spellcasting.knownSpells}
            campaignId={campaignId}
            characterRace={(basicInfo.race as string) ?? ""}
            skillTreeProgress={(formData.skillTreeProgress ?? {}) as SkillTreeProgress}
            equipped={equipped as EquippedItems}
            artifacts={artifactOptions}
            artifactSets={artifactSets}
            spellSlots={formData.spellcasting.spellSlots}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
