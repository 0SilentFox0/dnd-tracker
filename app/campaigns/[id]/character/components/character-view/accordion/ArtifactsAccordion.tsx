"use client";

import { CharacterArtifactsSection } from "@/components/characters/artifacts/CharacterArtifactsSection";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ArtifactSetRow } from "@/types/artifact-sets";
import type { EquippedItems } from "@/types/inventory";

export interface ArtifactsAccordionProps {
  campaignId: string;
  characterId: string;
  spellcasting: {
    knownSpells: string[];
    spellSlots?: Record<string, { max: number; current: number }>;
  };
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
  characterId,
  spellcasting,
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
          progressionCharacterId={characterId}
          equipped={equipped}
          artifacts={artifactOptions}
          artifactSets={artifactSets}
          spellSlots={spellcasting.spellSlots}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
