"use client";

import { noopAbilitySetters } from "../constants";

import { CharacterAbilityScores } from "@/components/characters/stats/CharacterAbilityScores";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface AbilityScoresAccordionProps {
  abilityScores: Record<string, unknown>;
}

export function AbilityScoresAccordion({
  abilityScores,
}: AbilityScoresAccordionProps) {
  return (
    <AccordionItem value="item-2" className="rounded-xl border bg-card/75">
      <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
        2. Основні характеристики
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-1">
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
      </AccordionContent>
    </AccordionItem>
  );
}
