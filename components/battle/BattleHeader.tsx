"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PusherConnectionState } from "@/lib/hooks/battle/usePusherBattleSync";
import { cn } from "@/lib/utils";
import type { BattleScene } from "@/types/api";

interface BattleHeaderProps {
  battle: BattleScene;
  onNextTurn: () => void;
  onReset: () => void;
  onCompleteBattle?: (result?: "victory" | "defeat") => void;
  isDM: boolean;
  /** Стан з'єднання Pusher для індикатора (опційно) */
  connectionState?: PusherConnectionState;
  /** Блокує кнопку "Наступний хід" — запобігає спаму при повільному API */
  isNextTurnPending?: boolean;
}

export function BattleHeader({
  battle,
  onNextTurn,
  onReset,
  onCompleteBattle,
  isDM,
  connectionState = null,
  isNextTurnPending = false,
}: BattleHeaderProps) {
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const currentParticipant = battle.initiativeOrder?.[battle.currentTurnIndex];

  const currentTurnName = currentParticipant?.basicInfo?.name;

  return (
    <div className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl z-40 shadow-2xl">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        {battle.status === "active" && currentTurnName && (
          <div className="text-sm sm:text-base font-bold text-primary mb-2">
            Хід: {currentTurnName}
          </div>
        )}
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
              {connectionState != null && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-medium",
                    connectionState === "connected" && "text-emerald-400/90",
                    (connectionState === "disconnected" ||
                      connectionState === "unavailable") &&
                      "text-amber-400/90",
                    connectionState === "connecting" && "text-white/60",
                  )}
                  title={
                    connectionState === "connected"
                      ? "Онлайн"
                      : connectionState === "connecting"
                        ? "Підключення..."
                        : "Офлайн — оновлення після відновлення"
                  }
                >
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      connectionState === "connected" &&
                        "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
                      (connectionState === "disconnected" ||
                        connectionState === "unavailable") &&
                        "bg-amber-400 animate-pulse",
                      connectionState === "connecting" &&
                        "bg-white/50 animate-pulse",
                    )}
                  />
                  {connectionState === "connected"
                    ? "Онлайн"
                    : connectionState === "connecting"
                      ? "Підключення..."
                      : "Офлайн"}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {isDM && battle.status === "active" && onCompleteBattle && (
              <Button
                onClick={() => setCompleteDialogOpen(true)}
                variant="outline"
                className="rounded-full px-2 md:px-6 font-bold uppercase tracking-wider border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-300"
                size="sm"
              >
                <Trophy className="h-4 w-4 mr-1.5" />
                Завершити бій
              </Button>
            )}
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
                disabled={isNextTurnPending}
                className="rounded-full px-2 md:px-8 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:pointer-events-none disabled:transform-none"
                size="sm"
              >
                {isNextTurnPending ? "Завантаження…" : "Наступний хід"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
      >
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Завершити бій?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Оберіть результат завершення або визначте автоматично за умовами
              перемоги.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border-slate-600 text-slate-300">
              Скасувати
            </AlertDialogCancel>
            <Button
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
              onClick={() => {
                onCompleteBattle?.("defeat");
                setCompleteDialogOpen(false);
              }}
            >
              Поразка
            </Button>
            <Button
              variant="outline"
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
              onClick={() => {
                onCompleteBattle?.();
                setCompleteDialogOpen(false);
              }}
            >
              Авто
            </Button>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                onCompleteBattle?.("victory");
                setCompleteDialogOpen(false);
              }}
            >
              Перемога
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
