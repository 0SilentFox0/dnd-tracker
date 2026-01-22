"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BattleScene } from "@/types/api";

interface BattleHeaderProps {
  battle: BattleScene;
  onNextTurn: () => void;
}

export function BattleHeader({ battle, onNextTurn }: BattleHeaderProps) {
  return (
    <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm z-40">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{battle.name}</h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Badge variant={battle.status === "active" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                {battle.status === "active" ? "Активний" : battle.status === "prepared" ? "Підготовлено" : "Завершено"}
              </Badge>
              <span>Раунд {battle.currentRound}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={onNextTurn} 
              className="whitespace-nowrap text-xs sm:text-sm"
              size="sm"
            >
              Наступний хід
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
