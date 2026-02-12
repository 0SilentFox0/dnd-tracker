"use client";

import { Sparkles } from "lucide-react";

import { SkillReferenceCard } from "./SkillReferenceCard";
import { SpellReferenceCard } from "./SpellReferenceCard";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { SkillForReference, SpellForReference } from "@/lib/types/info-reference";

interface ReferenceSectionAccordionProps {
  campaignId: string;
  isDM: boolean;
  showSkills: boolean;
  showSpells: boolean;
  skillsEmpty: boolean;
  spellsEmpty: boolean;
  nothingFound: boolean;
  filteredSkills: SkillForReference[];
  filteredSpells: SpellForReference[];
}

export function ReferenceSectionAccordion({
  campaignId,
  isDM,
  showSkills,
  showSpells,
  skillsEmpty,
  spellsEmpty,
  nothingFound,
  filteredSkills,
  filteredSpells,
}: ReferenceSectionAccordionProps) {
  const hasContent =
    (!nothingFound && showSkills && !skillsEmpty) ||
    (showSpells && !spellsEmpty);

  if (!hasContent) return null;

  const defaultSections =
    showSkills && showSpells
      ? ["skills", "spells"]
      : showSkills
        ? ["skills"]
        : ["spells"];

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultSections}
      className="space-y-2"
    >
      {showSkills && !skillsEmpty && (
        <AccordionItem
          value="skills"
          className="rounded-lg border bg-card overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-4 hover:no-underline data-[state=open]:border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 shrink-0" />
              <span className="font-semibold">Скіли</span>
              <Badge variant="secondary" className="ml-1">
                {filteredSkills.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <p className="text-muted-foreground text-sm mb-4">
              Як діють скіли та як вони виглядають у грі. Опис вигляду може
              редагувати лише DM.
            </p>
            <Accordion type="multiple" className="grid grid-cols-2 gap-4">
              {filteredSkills.map((skill) => (
                <SkillReferenceCard
                  key={skill.id}
                  campaignId={campaignId}
                  skill={skill}
                  isDM={isDM}
                />
              ))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      )}
      {showSpells && !spellsEmpty && (
        <AccordionItem
          value="spells"
          className="rounded-lg border bg-card overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-4 hover:no-underline data-[state=open]:border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 shrink-0" />
              <span className="font-semibold">Заклинання</span>
              <Badge variant="secondary" className="ml-1">
                {filteredSpells.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2">
            <p className="text-muted-foreground text-sm mb-4">
              Як діють заклинання та як вони виглядають. Опис вигляду може
              редагувати лише DM.
            </p>
            <Accordion type="multiple" className="grid grid-cols-2 gap-4">
              {filteredSpells.map((spell) => (
                <SpellReferenceCard
                  key={spell.id}
                  campaignId={campaignId}
                  spell={spell}
                  isDM={isDM}
                />
              ))}
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
