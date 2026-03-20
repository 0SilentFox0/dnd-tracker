"use client";

import { useMemo } from "react";
import { Heart } from "lucide-react";

import {
  groupEffectsBySource,
  ParticipantBattleEffectsStrip,
} from "@/components/battle/cards/participant-card";
import { ParticipantStats } from "@/components/battle/ParticipantStats";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

interface PlayerTurnHudProps {
  participant: BattleParticipant;
  initiativeOrder: BattleParticipant[];
}

export function PlayerTurnHud({
  participant,
  initiativeOrder,
}: PlayerTurnHudProps) {
  const { currentHp, maxHp } = participant.combatStats;

  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

  const { groupedHeroEffects, regularEffects } = useMemo(
    () =>
      groupEffectsBySource(
        participant.battleData?.activeEffects ?? [],
        initiativeOrder,
      ),
    [participant.battleData?.activeEffects, initiativeOrder],
  );

  const hasEffectStrip =
    (participant.battleData?.activeEffects?.length ?? 0) > 0 ||
    (participant.combatStats.tempHp > 0) ||
    participant.combatStats.status === "unconscious" ||
    (participant.battleData.artifactSetHudMarkers?.length ?? 0) > 0;

  return (
    <div className="shrink-0 bg-black/50 backdrop-blur-md border-b border-white/10 py-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 px-3">
        <div
          className="flex items-center gap-2 shrink-0 min-w-0"
          title="Здоров'я"
        >
          <Heart className="h-4 w-4 shrink-0 text-red-400/90" />
          <span className="tabular-nums font-bold text-white">
            {currentHp}/{maxHp}
          </span>
          <div className="h-1.5 w-16 rounded-full bg-white/20 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                hpPercent <= 25
                  ? "bg-red-500"
                  : hpPercent <= 50
                    ? "bg-amber-500"
                    : "bg-green-500",
              )}
              style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
            />
          </div>
        </div>

        {hasEffectStrip && (
          <ParticipantBattleEffectsStrip
            participant={participant}
            displayedHeroEffects={groupedHeroEffects}
            regularEffects={regularEffects}
            className="flex flex-wrap items-center gap-2 flex-1 min-w-0"
            ringOffsetClassName="ring-offset-black/80"
          />
        )}
      </div>

      <div className="flex justify-center px-3 pt-2 border-t border-white/5 mt-2">
        <ParticipantStats participant={participant} className="text-white/90" />
      </div>
    </div>
  );
}
