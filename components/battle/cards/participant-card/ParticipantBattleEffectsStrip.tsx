"use client";

import NextImage from "next/image";
import { HelpCircle, TrendingDown, TrendingUp } from "lucide-react";

import type { GroupedHeroEffect } from "./groupEffects";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const MAX_HERO_EFFECTS = 5;

export interface ParticipantBattleEffectsStripProps {
  participant: BattleParticipant;
  displayedHeroEffects: GroupedHeroEffect[];
  regularEffects: ActiveEffect[];
  className?: string;
  /** Tailwind для ring-offset під фон (HUD vs картка) */
  ringOffsetClassName?: string;
}

/**
 * Іконки ефектів (темп HP, сети, згруповані джерела, решта) — той самий вигляд, що на картці учасника.
 */
export function ParticipantBattleEffectsStrip({
  participant,
  displayedHeroEffects,
  regularEffects,
  className,
  ringOffsetClassName = "ring-offset-background/60",
}: ParticipantBattleEffectsStripProps) {
  const { combatStats } = participant;

  const participantId = participant.basicInfo.id;

  const regularSlice = regularEffects.slice(
    0,
    Math.max(0, MAX_HERO_EFFECTS - displayedHeroEffects.length),
  );

  const setHudMarkers = participant.battleData.artifactSetHudMarkers ?? [];

  const ringOffset = cn("ring-offset-1", ringOffsetClassName);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
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

      {setHudMarkers.map((m) => (
        <Avatar
          key={`set-hud-${participantId}-${m.setId}`}
          title={`Повний сет: ${m.name}`}
          className={cn(
            "h-6 w-6 cursor-help ring-2 ring-amber-500/75",
            ringOffset,
          )}
        >
          <AvatarImage
            src={m.icon?.trim() || undefined}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback className="bg-amber-950/80 text-[9px] text-amber-100">
            {m.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}

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
              "h-6 w-6 cursor-help ring-2",
              ringOffset,
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
        <StripEffectBadge
          key={`effect-${participantId}-${idx}`}
          effect={effect}
        />
      ))}
    </div>
  );
}

function StripEffectBadge({ effect }: { effect: ActiveEffect }) {
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
