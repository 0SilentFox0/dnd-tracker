"use client";

import { noopAbilitiesSetters } from "../constants";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { CharacterSkillTreeView } from "@/components/characters/abilities/CharacterSkillTreeView";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { SkillTreeProgress } from "@/lib/hooks/useCharacterView";

export interface AbilitiesAccordionProps {
  campaignId: string;
  basicInfo: Record<string, unknown>;
  abilities: Record<string, unknown>;
  formData: { skillTreeProgress?: SkillTreeProgress };
  isPlayerView: boolean;
  lastSavedSkillTreeProgress: SkillTreeProgress;
  onSkillTreeProgressChange: (next: SkillTreeProgress) => void;
  onResetSkillTree: () => void;
  savingTree: boolean;
  handleSaveSkillTree: () => Promise<void>;
}

export function AbilitiesAccordion({
  campaignId,
  basicInfo,
  abilities,
  formData,
  isPlayerView,
  lastSavedSkillTreeProgress,
  onSkillTreeProgressChange,
  onResetSkillTree,
  savingTree,
  handleSaveSkillTree,
}: AbilitiesAccordionProps) {
  return (
    <AccordionItem value="item-5" className="rounded-xl border bg-card/75">
      <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
        5. Уміння
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-1">
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
          savedSkillTreeProgress={
            isPlayerView ? lastSavedSkillTreeProgress : undefined
          }
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
          {!isPlayerView && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetSkillTree}
              className="touch-manipulation"
            >
              Скинути дерево прокачки
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
