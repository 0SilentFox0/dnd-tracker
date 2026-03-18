"use client";

import { Heart, TrendingDown, TrendingUp } from "lucide-react";

import { ParticipantStats } from "@/components/battle/ParticipantStats";
import { EffectsRow } from "@/components/battle/views/ui/EffectsRow";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";
import type { ActiveEffect } from "@/types/battle";

interface PlayerTurnHudProps {
  participant: BattleParticipant;
  buffs: ActiveEffect[];
  debuffs: ActiveEffect[];
  conditions: ActiveEffect[];
}

export function PlayerTurnHud({
  participant,
  buffs,
  debuffs,
  conditions,
}: PlayerTurnHudProps) {
  const { currentHp, maxHp } = participant.combatStats;

  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

  return (
    <div className="shrink-0 bg-black/50 backdrop-blur-md border-b border-white/10 px-3 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0" title="Здоров'я">
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
        <EffectsRow
          effects={buffs}
          variant="buff"
          icon={<TrendingUp className="h-3.5 w-3 shrink-0 text-green-400/80" />}
        />
        <EffectsRow
          effects={debuffs}
          variant="debuff"
          icon={
            <TrendingDown className="h-3.5 w-3 shrink-0 text-red-400/80" />
          }
        />
        <EffectsRow effects={conditions} variant="condition" />
      </div>
      <div className="flex justify-center">
        <ParticipantStats participant={participant} className="text-white/90" />
      </div>
    </div>
  );
}
