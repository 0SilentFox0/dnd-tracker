"use client";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { CampaignMember } from "@/types/campaigns";
import type { Race } from "@/types/races";

import { noopBasicInfoSetters } from "../constants";

export interface BasicInfoAccordionProps {
  basicInfo: Record<string, unknown>;
  members: CampaignMember[];
  races: Race[];
  isPlayerView: boolean;
}

export function BasicInfoAccordion({
  basicInfo,
  members,
  races,
  isPlayerView,
}: BasicInfoAccordionProps) {
  return (
    <AccordionItem value="item-1" className="rounded-xl border bg-card/75">
      <AccordionTrigger className="min-h-[44px] px-4 py-3 text-left font-medium hover:no-underline [.border-b]:border-0">
        1. Загальна інформація
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-1">
        <CharacterBasicInfo
          basicInfo={
            { ...basicInfo, setters: noopBasicInfoSetters } as unknown as Parameters<
              typeof CharacterBasicInfo
            >[0]["basicInfo"]
          }
          campaignMembers={members}
          races={races}
          isPlayerView={isPlayerView}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
