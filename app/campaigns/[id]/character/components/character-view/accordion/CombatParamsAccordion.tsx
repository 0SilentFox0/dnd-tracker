"use client";

import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";
import { CharacterDamagePreview } from "@/components/characters/stats/CharacterDamagePreview";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { noopCombatSetters } from "../constants";

export interface CombatParamsAccordionProps {
  campaignId: string;
  characterId: string;
  basicInfo: Record<string, unknown>;
  abilityScores: Record<string, unknown>;
  combatStats: Record<string, unknown>;
  scalingCoefficients?: {
    hpMultiplier?: number;
    meleeMultiplier?: number;
    rangedMultiplier?: number;
  };
}

export function CombatParamsAccordion({
  campaignId,
  characterId,
  basicInfo,
  abilityScores,
  combatStats,
  scalingCoefficients = {},
}: CombatParamsAccordionProps) {
  return (
    <AccordionItem value="item-3" className="rounded-xl border bg-card/75">
      <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
        3. Бойові параметри
      </AccordionTrigger>
      <AccordionContent className="space-y-6 px-4 pb-4 pt-1">
        <CharacterHpPreview
          level={(basicInfo.level as number) ?? 1}
          strength={(abilityScores?.strength as number) ?? 10}
          coefficient={scalingCoefficients.hpMultiplier ?? 1}
          isDm={false}
        />
        <CharacterDamagePreview
          campaignId={campaignId}
          characterId={characterId}
          meleeCoefficient={scalingCoefficients.meleeMultiplier ?? 1}
          rangedCoefficient={scalingCoefficients.rangedMultiplier ?? 1}
          isDm={false}
        />
        <CharacterCombatParams
          combatStats={
            {
              ...combatStats,
              setters: noopCombatSetters,
            } as unknown as Parameters<
              typeof CharacterCombatParams
            >[0]["combatStats"]
          }
        />
      </AccordionContent>
    </AccordionItem>
  );
}
