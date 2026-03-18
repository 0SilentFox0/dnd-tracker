"use client";

import { useMemo } from "react";

import {
  groupEffectsBySource,
  ParticipantCardDeadView,
  ParticipantEffectsRow,
  ParticipantHpBar,
} from "@/components/battle/cards/participant-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ParticipantSide } from "@/lib/constants/battle";
import { useDamageFlash } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

interface ParticipantCardProps {
  battle?: BattleScene;
  participant: BattleParticipant;
  isCurrentTurn: boolean;
  isDM: boolean;
  canSeeEnemyHp: boolean;
  onSelect?: () => void;
  className?: string;
}

export function ParticipantCard({
  battle,
  participant,
  isCurrentTurn,
  isDM,
  canSeeEnemyHp,
  onSelect,
  className,
}: ParticipantCardProps) {
  const isEnemy = participant.basicInfo.side === ParticipantSide.ENEMY;

  const showHp = isDM || !isEnemy || canSeeEnemyHp;

  const canSeeStats = isDM || !isEnemy || canSeeEnemyHp;

  const isDead = participant.combatStats.status === "dead";

  const { showDamage, damageAmount } = useDamageFlash(
    participant.combatStats.currentHp,
  );

  const { groupedHeroEffects, regularEffects } = useMemo(() => {
    const order = (battle?.initiativeOrder ?? []) as BattleParticipant[];

    return groupEffectsBySource(participant.battleData.activeEffects, order);
  }, [battle?.initiativeOrder, participant.battleData.activeEffects]);

  const { currentHp, maxHp } = participant.combatStats;

  return (
    <div
      className={cn(
        "relative border rounded-xl p-3 sm:p-4 transition-all cursor-pointer glass-card group",
        isCurrentTurn && "z-10",
        isDead
          ? "dead-state"
          : isEnemy
            ? "border-red-500/30 bg-red-300/10"
            : "border-blue-500/30 bg-blue-500/5",
        className,
      )}
      onClick={onSelect}
    >
      {isCurrentTurn && !isDead && (
        <div className="absolute inset-0 bg-primary/10 animate-pulse-glow pointer-events-none" />
      )}

      {showDamage && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center font-black text-4xl z-50 pointer-events-none animate-in fade-out slide-out-to-top-12 duration-1000 drop-shadow-2xl",
            damageAmount < 0 ? "text-red-500" : "text-green-500",
          )}
        >
          {damageAmount > 0 ? `+${damageAmount}` : damageAmount}
        </div>
      )}

      {isCurrentTurn && !isDead && (
        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg z-20 flex justify-center items-center min-w-8 min-h-8 animate-[float_2s_infinite]">
          <span className="text-sm">⚔️</span>
        </div>
      )}

      {isDead ? (
        <ParticipantCardDeadView
          participant={participant}
          currentRound={battle?.currentRound}
        />
      ) : (
        <div className="flex items-start gap-3 relative z-10">
          <Avatar className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 border-2 border-border shadow-sm">
            <AvatarImage
              src={participant.basicInfo.avatar || undefined}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback>
              {participant.basicInfo.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate mb-1">
              {participant.basicInfo.name}
            </h3>

            <ParticipantHpBar
              currentHp={currentHp}
              maxHp={maxHp}
              showHp={showHp}
            />

            <ParticipantEffectsRow
              participant={participant}
              canSeeStats={canSeeStats}
              displayedHeroEffects={groupedHeroEffects}
              regularEffects={regularEffects}
            />
          </div>
        </div>
      )}
    </div>
  );
}
