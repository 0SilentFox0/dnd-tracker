"use client";

import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SkillTreeProgress } from "@/lib/hooks/characters";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { EquippedItems } from "@/types/inventory";

export interface ArtifactsAccordionProps {
  campaignId: string;
  basicInfo: Record<string, unknown>;
  spellcasting: {
    knownSpells: string[];
    spellSlots?: Record<string, { max: number; current: number }>;
  };
  skillTreeProgress: SkillTreeProgress;
  equipped: EquippedItems;
  artifactSets?: ArtifactSetRow[];
  artifactOptions: Array<{
    id: string;
    name: string;
    slot: string;
    icon?: string | null;
  }>;
}

export function ArtifactsAccordion({
  campaignId,
  basicInfo,
  spellcasting,
  skillTreeProgress,
  equipped,
  artifactSets,
  artifactOptions,
}: ArtifactsAccordionProps) {
  return (
    <AccordionItem value="item-6" className="rounded-xl border bg-card/75">
      <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
        6. Артефакти
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-1">
        <CharacterArtifactsSection
          knownSpellIds={spellcasting.knownSpells}
          campaignId={campaignId}
          characterRace={basicInfo.race as string}
          skillTreeProgress={skillTreeProgress}
          equipped={equipped}
          artifacts={artifactOptions}
          artifactSets={artifactSets}
          spellSlots={spellcasting.spellSlots}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
