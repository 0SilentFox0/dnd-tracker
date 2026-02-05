"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BattleScene } from "@/types/api";

interface BattleHeaderProps {
  battle: BattleScene;
  onNextTurn: () => void;
  onReset: () => void;
  isDM: boolean;
}

export function BattleHeader({
  battle,
  onNextTurn,
  onReset,
  isDM,
}: BattleHeaderProps) {
  return (
    <div className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl z-40 shadow-2xl">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl sm:text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">
              {battle.name}
            </h1>
            <div className="flex items-center gap-3 text-xs sm:text-sm mt-1">
              <Badge
                variant={battle.status === "active" ? "default" : "secondary"}
                className={cn(
                  "rounded-full px-3 py-0.5 font-bold uppercase tracking-wider",
                  battle.status === "active"
                    ? "bg-green-500 hover:bg-green-600 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    : "",
                )}
              >
                {battle.status === "active"
                  ? "● Бойова Фаза"
                  : battle.status === "prepared"
                    ? "Підготовка"
                    : "Завершено"}
              </Badge>
              <span className="text-white/60 font-medium">
                РАУНД{" "}
                <span className="text-white font-bold ml-1">
                  {battle.currentRound}
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isDM && (
              <Button
                onClick={onReset}
                variant="outline"
                className="rounded-full px-2 md:px-6 font-bold uppercase tracking-wider border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300"
                size="sm"
              >
                Скинути бій
              </Button>
            )}
            {battle.status === "active" && (
              <Button
                onClick={onNextTurn}
                className="rounded-full px-2 md:px-8 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95"
                size="sm"
              >
                Наступний хід
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
