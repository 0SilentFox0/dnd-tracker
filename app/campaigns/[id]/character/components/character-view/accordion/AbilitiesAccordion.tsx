"use client";

import { noopAbilitiesSetters } from "../constants";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { ProgressionPanel } from "@/components/skill-tree/progression";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface AbilitiesAccordionProps {
  campaignId: string;
  characterId: string;
  abilities: Record<string, unknown>;
  canManage: boolean;
}

export function AbilitiesAccordion({ campaignId, characterId, abilities, canManage }: AbilitiesAccordionProps) {
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
        <div className="mt-4">
          <ProgressionPanel campaignId={campaignId} characterId={characterId} canManage={canManage} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
