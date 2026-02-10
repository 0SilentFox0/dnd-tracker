"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

interface InitiativeParticipantCardProps {
  participant: BattleParticipant;
  isActive: boolean;
  isNext: boolean;
  size?: "small" | "large";
}

export function InitiativeParticipantCard({
  participant,
  isActive,
  isNext,
  size = "small",
}: InitiativeParticipantCardProps) {
  const isLarge = size === "large";

  const avatarSize = isLarge ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12 sm:w-14 sm:h-14";

  const textSize = isLarge ? "text-xs sm:text-sm" : "text-[10px] sm:text-xs";

  const badgeSize = isLarge ? "text-[10px] sm:text-xs" : "text-[9px] sm:text-[10px]";

  const minWidth = isLarge ? "min-w-[80px] sm:min-w-[100px]" : "min-w-[60px] sm:min-w-[70px]";

  const maxWidth = isLarge ? "max-w-[80px] sm:max-w-[100px]" : "max-w-[60px] sm:max-w-[70px]";

  return (
    <div
      className={cn(
        "shrink-0 flex flex-col items-center gap-1 transition-all",
        minWidth,
        isNext && !isActive && "ring-2 ring-primary/50 rounded-lg p-1"
      )}
    >
      <div className="relative">
        <Avatar className={cn(avatarSize, "border", isActive ? "border-2 border-primary shadow-lg" : "border-border")}>
          <AvatarImage
            src={participant.basicInfo.avatar || undefined}
            referrerPolicy="no-referrer"
          />
          <AvatarFallback className={isLarge ? "text-lg sm:text-xl" : "text-sm"}>
            {participant.basicInfo.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isActive && (
          <Badge
            className="absolute -top-1 -right-1 bg-primary text-primary-foreground animate-pulse"
            variant="default"
          >
            ⚡
          </Badge>
        )}
      </div>
      <div className="text-center">
        <p className={cn("font-semibold truncate", textSize, maxWidth)}>
          {participant.basicInfo.name}
        </p>
        <Badge
          variant={participant.basicInfo.side === "ally" ? "default" : "destructive"}
          className={cn(badgeSize, "mt-0.5")}
        >
          {participant.abilities.initiative}
        </Badge>
      </div>
      {participant.combatStats.status !== "active" && (
        <Badge variant="outline" className={cn("text-[9px]", isLarge && "text-[10px]")}>
          {participant.combatStats.status === "unconscious" ? "💤" : "💀"}
        </Badge>
      )}
    </div>
  );
}
