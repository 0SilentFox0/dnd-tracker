"use client";

import NextImage from "next/image";
import { HelpCircle, TrendingDown, TrendingUp } from "lucide-react";

import type { GroupedHeroEffect } from "./groupEffects";

import { ParticipantStats } from "@/components/battle/ParticipantStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const MAX_HERO_EFFECTS = 5;

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

  const { combatStats } = participant;

  const participantId = participant.basicInfo.id;

  const regularSlice = regularEffects.slice(
    0,
    Math.max(0, MAX_HERO_EFFECTS - displayedHeroEffects.length),
  );

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {combatStats.tempHp > 0 && (
        <Badge
          variant="outline"
          className="text-[9px] border-yellow-500/50 text-yellow-500 bg-yellow-500/5"
        >
          🛡️ {combatStats.tempHp} заст.
        </Badge>
      )}

      {combatStats.status === "unconscious" && (
        <Badge className="text-[9px] bg-indigo-500 text-white border-none shadow-[0_0_10px_rgba(99,102,241,0.3)] animate-pulse">
          💤 Непритомний
        </Badge>
      )}

      {displayedHeroEffects.slice(0, MAX_HERO_EFFECTS).map((source, idx) => {
        const tooltip = [
          source.sourceName,
          ...source.effectNames,
          ...Array.from(new Set(source.durations)),
        ].join(" · ");

        const ringClass = source.hasBuff
          ? "ring-emerald-500/60"
          : source.hasDebuff
            ? "ring-red-500/60"
            : "ring-white/20";

        return (
          <Avatar
            key={`effect-source-${participantId}-${source.sourceName}-${idx}`}
            title={tooltip}
            className={cn(
              "h-6 w-6 cursor-help ring-2 ring-offset-1 ring-offset-background/60",
              ringClass,
            )}
          >
            <AvatarImage
              src={source.sourceAvatar || undefined}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="text-[9px]">
              {source.sourceName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
      })}

      {regularSlice.map((effect, idx) => (
        <EffectBadge
          key={`effect-${participantId}-${idx}`}
          effect={effect}
        />
      ))}

      <ParticipantStats
        participant={participant}
        className="w-full mt-1 pt-2 border-t border-white/5"
      />
    </div>
  );
}

function EffectBadge({ effect }: { effect: ActiveEffect }) {
  const isBuff = effect.type === "buff";

  const isDebuff = effect.type === "debuff";

  const durationText =
    effect.duration != null ? `${effect.duration} раундів` : "";

  const tooltip = [effect.name, durationText].filter(Boolean).join(" · ");

  const Icon = isBuff ? TrendingUp : isDebuff ? TrendingDown : HelpCircle;

  return (
    <Badge
      variant="outline"
      title={tooltip}
      className={cn(
        "text-[9px] cursor-help gap-0.5 border p-0 rounded ",
        isDebuff && "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
        isBuff && "border-red-500/50 text-red-400 bg-red-500/10",
        !isBuff && !isDebuff && "border-white/20 text-white/70 bg-white/5",
      )}
    >
      {effect.icon ? (
        <NextImage
          width={32}
          height={32}
          src={effect.icon}
          alt={effect.name}
          className={cn("rounded object-cover shrink-0 border-2")}
        />
      ) : (
        <>
          <Icon className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate max-w-[80px]">{effect.name}</span>
        </>
      )}
    </Badge>
  );
}
