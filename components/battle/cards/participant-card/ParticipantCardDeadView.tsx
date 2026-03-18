"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skull } from "lucide-react";
import type { BattleParticipant } from "@/types/battle";

interface ParticipantCardDeadViewProps {
  participant: BattleParticipant;
  currentRound?: number;
}

export function ParticipantCardDeadView({
  participant,
  currentRound,
}: ParticipantCardDeadViewProps) {
  return (
    <div className="relative flex items-center gap-4 py-2 animate-in fade-in zoom-in duration-700">
      <Avatar className="w-16 h-16 grayscale opacity-40 border-2 border-red-900/50 shadow-inner">
        <AvatarImage
          src={participant.basicInfo.avatar || undefined}
          referrerPolicy="no-referrer"
        />
        <AvatarFallback className="bg-red-950/40 text-red-500/50">
          {participant.basicInfo.name.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-black italic uppercase text-red-500/60 line-through tracking-tighter text-xl">
            {participant.basicInfo.name}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-red-600/80">
            <Skull className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              Загинув у бою
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[9px] border-red-900/50 text-red-950 bg-red-500/10"
          >
            Раунд {currentRound ?? "?"}
          </Badge>
        </div>
      </div>

      <div className="absolute inset-0 bg-red-950/10 pointer-events-none" />
    </div>
  );
}
