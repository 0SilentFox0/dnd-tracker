"use client";

import { noopSkillHandlers } from "../constants";

import { CharacterSkillsSection } from "@/components/characters/skills/CharacterSkillsSection";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface SkillsAccordionProps {
  skills: Record<string, unknown>;
}

export function SkillsAccordion({ skills }: SkillsAccordionProps) {
  return (
    <AccordionItem value="item-4" className="rounded-xl border bg-card/75">
      <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
        4. Навички та збереження
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-1">
        <CharacterSkillsSection
          skills={
            {
              ...skills,
              handlers: noopSkillHandlers,
            } as unknown as Parameters<
              typeof CharacterSkillsSection
            >[0]["skills"]
          }
        />
      </AccordionContent>
    </AccordionItem>
  );
}
