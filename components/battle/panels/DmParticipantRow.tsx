"use client";

import { Heart, LogIn, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

interface DmParticipantRowProps {
  participant: BattleParticipant;
  dmControlledParticipantId: string | null;
  onIncreaseHp: (p: BattleParticipant) => void;
  onTakeControl: (p: BattleParticipant | null) => void;
  onRemove: (p: BattleParticipant) => void;
  onActionDone?: () => void;
}

export function DmParticipantRow({
  participant,
  dmControlledParticipantId,
  onIncreaseHp,
  onTakeControl,
  onRemove,
  onActionDone,
}: DmParticipantRowProps) {
  const close = () => onActionDone?.();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/5 p-2">
      <span
        className={cn(
          "flex-1 min-w-0 truncate text-sm font-medium",
          participant.basicInfo.side === "ally"
            ? "text-blue-300"
            : "text-red-300",
        )}
      >
        {participant.basicInfo.name}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-400 hover:bg-green-500/20"
          title="Збільшити HP"
          onClick={() => {
            onIncreaseHp(participant);
            close();
          }}
        >
          <Heart className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-400 hover:bg-amber-500/20"
          title={
            dmControlledParticipantId === participant.basicInfo.id
              ? "Відпустити керування"
              : "Взяти керування"
          }
          onClick={() => {
            onTakeControl(
              dmControlledParticipantId === participant.basicInfo.id
                ? null
                : participant,
            );
            close();
          }}
        >
          <LogIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-400 hover:bg-red-500/20"
          title="Видалити з бою"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.confirm(
                "Видалити " + participant.basicInfo.name + " з бою?",
              )
            ) {
              onRemove(participant);
              close();
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
