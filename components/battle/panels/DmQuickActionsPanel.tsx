"use client";

import { useState } from "react";
import { ChevronLeft, ScrollText, Trophy, UserPlus } from "lucide-react";

import { BattleLogPanel } from "./BattleLogPanel";
import { DmParticipantRow } from "./DmParticipantRow";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

const PANEL_WIDTH = 320;

export interface DmQuickActionsPanelProps {
  battle: BattleScene;
  isDM: boolean;
  onOpenLog: () => void;
  onAddParticipant: () => void;
  onIncreaseHp: (participant: BattleParticipant) => void;
  onRemoveFromBattle: (participant: BattleParticipant) => void;
  onCompleteBattle: (result?: "victory" | "defeat") => void;
  onTakeControl: (participant: BattleParticipant | null) => void;
  dmControlledParticipantId: string | null;
  /** Лог бою в сайдбарі: показувати вміст логу тут */
  logPanelOpen?: boolean;
  setLogPanelOpen?: (open: boolean) => void;
  onRollback?: (actionIndex: number) => void;
}

export function DmQuickActionsPanel({
  battle,
  isDM,
  onOpenLog,
  onAddParticipant,
  onIncreaseHp,
  onRemoveFromBattle,
  onCompleteBattle,
  onTakeControl,
  dmControlledParticipantId,
  logPanelOpen,
  setLogPanelOpen,
  onRollback,
}: DmQuickActionsPanelProps) {
  const [open, setOpen] = useState(false);

  if (!isDM || battle.status === "prepared") return null;

  const participants = (battle.initiativeOrder ?? []) as BattleParticipant[];

  const closePanel = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50 w-10 h-24 flex items-center justify-center",
          "bg-white/10 hover:bg-white/20 border border-white/20 border-r-0 rounded-l-xl",
          "transition-all duration-200",
          open && "opacity-0 pointer-events-none",
        )}
        aria-label="Відкрити швидкі дії DM"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>

      <div
        className={cn(
          "fixed top-0 bottom-0 z-50 flex flex-col",
          "bg-slate-900/98 backdrop-blur-xl border-l border-white/10 shadow-2xl",
          "transition-transform duration-300 ease-out",
        )}
        style={{
          width: PANEL_WIDTH,
          right: open ? 0 : -PANEL_WIDTH,
        }}
      >
        <div className="shrink-0 flex items-center justify-between gap-2 p-3 border-b border-white/10">
          <span className="font-bold text-white uppercase tracking-wider text-sm">
            Швидкі дії DM
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            onClick={closePanel}
            aria-label="Закрити"
          >
            <ChevronLeft className="h-5 w-5 rotate-180" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              onOpenLog();
            }}
          >
            <ScrollText className="h-4 w-4" />
            {logPanelOpen ? "Лог битви відкрито нижче" : "Відкрити лог битви"}
          </Button>

          {logPanelOpen && setLogPanelOpen && (
            <BattleLogPanel
              battle={battle}
              isDM={isDM}
              onRollback={onRollback}
              open={true}
              onOpenChange={setLogPanelOpen}
              embedInSidebar
            />
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              onAddParticipant();
              closePanel();
            }}
          >
            <UserPlus className="h-4 w-4" />
            Додати героя / юніта
          </Button>

          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-2 px-1">
              Учасники бою
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {participants.length === 0 ? (
                <p className="text-xs text-white/40 italic py-2">
                  Нікого на полі
                </p>
              ) : (
                participants.map((p) => (
                  <DmParticipantRow
                    key={p.basicInfo.id}
                    participant={p}
                    dmControlledParticipantId={dmControlledParticipantId}
                    onIncreaseHp={onIncreaseHp}
                    onTakeControl={onTakeControl}
                    onRemove={onRemoveFromBattle}
                    onActionDone={closePanel}
                  />
                ))
              )}
            </div>
          </div>

          {battle.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
              onClick={() => {
                onCompleteBattle();
                closePanel();
              }}
            >
              <Trophy className="h-4 w-4" />
              Завершити бій
            </Button>
          )}
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
          aria-label="Закрити"
          onClick={closePanel}
        />
      )}
    </>
  );
}
