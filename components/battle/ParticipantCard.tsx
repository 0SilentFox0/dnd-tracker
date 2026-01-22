"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { BattleParticipant } from "@/types/battle";
import { cn } from "@/lib/utils";

interface ParticipantCardProps {
  participant: BattleParticipant;
  isCurrentTurn: boolean;
  isDM: boolean;
  canSeeEnemyHp: boolean; // DM mode або спеціальний скіл
  onSelect?: () => void;
  className?: string;
}

export function ParticipantCard({
  participant,
  isCurrentTurn,
  isDM,
  canSeeEnemyHp,
  onSelect,
  className,
}: ParticipantCardProps) {
  const isEnemy = participant.side === "enemy";
  const showHp = isDM || !isEnemy || canSeeEnemyHp;
  const hpPercent = (participant.currentHp / participant.maxHp) * 100;

  return (
    <div
      className={cn(
        "relative border rounded-lg p-3 sm:p-4 transition-all cursor-pointer hover:shadow-md",
        isCurrentTurn && "ring-2 ring-primary shadow-lg",
        isEnemy ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" : "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20",
        className
      )}
      onClick={onSelect}
    >
      {/* Індикатор активного ходу */}
      {isCurrentTurn && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg animate-pulse z-20 flex justify-center items-center min-w-8 min-h-8">
          <span className="text-xs">⭐</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 border-2 border-border">
          <AvatarImage src={participant.avatar} />
          <AvatarFallback>
            {participant.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm sm:text-base truncate">{participant.name}</h3>
            <Badge
              variant={isEnemy ? "destructive" : "default"}
              className="text-[10px] sm:text-xs shrink-0"
            >
              {isEnemy ? "Ворог" : "Союзник"}
            </Badge>
          </div>

          {/* HP Bar */}
          <div className="space-y-1">
            {showHp ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">HP</span>
                  <span className="font-semibold">
                    {participant.currentHp}/{participant.maxHp}
                  </span>
                </div>
                <Progress value={hpPercent} className="h-2" />
                <div className="text-[10px] text-muted-foreground text-right">
                  {Math.round(hpPercent)}%
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">HP</span>
                  <span className="text-muted-foreground">???</span>
                </div>
                <Progress value={hpPercent} className="h-2" />
              </>
            )}
          </div>

          {/* Temp HP */}
          {participant.tempHp > 0 && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Temp HP: {participant.tempHp}
            </div>
          )}

          {/* Статус */}
          {participant.status !== "active" && (
            <Badge variant="outline" className="mt-1 text-[10px]">
              {participant.status === "unconscious" ? "💤 Непритомний" : "💀 Мертвий"}
            </Badge>
          )}

          {/* Активні ефекти */}
          {participant.activeEffects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {participant.activeEffects.slice(0, 3).map((effect, idx) => (
                <Badge key={idx} variant="outline" className="text-[9px]">
                  {effect.name} ({effect.duration})
                </Badge>
              ))}
              {participant.activeEffects.length > 3 && (
                <Badge variant="outline" className="text-[9px]">
                  +{participant.activeEffects.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* AC (тільки для союзників або DM) */}
          {(isDM || !isEnemy) && (
            <div className="text-xs text-muted-foreground mt-1">
              AC: {participant.armorClass}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
