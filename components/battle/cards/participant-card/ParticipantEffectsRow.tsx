"use client";

import type { GroupedHeroEffect } from "./groupEffects";
import { ParticipantBattleEffectsStrip } from "./ParticipantBattleEffectsStrip";

import { ParticipantStats } from "@/components/battle/ParticipantStats";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

interface ParticipantEffectsRowProps {
  participant: BattleParticipant;
  canSeeStats: boolean;
  displayedHeroEffects: GroupedHeroEffect[];
  regularEffects: ActiveEffect[];
}

export function ParticipantEffectsRow({
  participant,
  canSeeStats,
  displayedHeroEffects,
  regularEffects,
}: ParticipantEffectsRowProps) {
  if (!canSeeStats) return null;

  return (
    <div className="mt-2">
      <ParticipantBattleEffectsStrip
        participant={participant}
        displayedHeroEffects={displayedHeroEffects}
        regularEffects={regularEffects}
      />
      <ParticipantStats
        participant={participant}
        className="w-full mt-1 pt-2 border-t border-white/5"
      />
    </div>
  );
}
