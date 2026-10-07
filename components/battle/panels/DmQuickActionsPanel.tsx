"use client";

import { useState } from "react";
import { ChevronLeft, ScrollText, Sparkles, Trophy, UserPlus } from "lucide-react";

import { BattleLogPanel } from "./BattleLogPanel";
import { DmParticipantRow } from "./DmParticipantRow";

import { HUD_SURFACE } from "@/components/hud";
import { cn } from "@/lib/utils";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

const PANEL_WIDTH = 320;

const ACTION = "hud-sc flex h-10 w-full items-center gap-2.5 border border-white/25 bg-black/55 px-3 text-left text-[15px] text-[var(--ink)] transition-colors hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/[.06]";

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
  /** Відкрити діалог накладання заклинання (будь-яке заклинання на будь-кого) */
  onOpenCastSpell?: () => void;
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
  onOpenCastSpell,
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
          "fixed right-0 top-1/2 z-50 flex h-24 w-10 -translate-y-1/2 items-center justify-center",
          "border border-r-0 border-hud-line bg-[#14100c]/90 text-[var(--gold)] shadow-[0_0_18px_rgba(0,0,0,.6)] hover:border-[var(--gold)]/60",
          "transition-all duration-200",
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Відкрити швидкі дії DM"
      >
        <ChevronLeft className="size-6" />
      </button>

      <div
        className={cn(
          HUD_SURFACE,
          "fixed bottom-0 top-0 z-50 flex max-w-full flex-col",
          "border-l border-hud-line bg-[#14100c]/[.97] shadow-[-12px_0_40px_rgba(0,0,0,.7)]",
          "transition-transform duration-300 ease-out",
        )}
        style={{
          width: PANEL_WIDTH,
          right: open ? 0 : -PANEL_WIDTH,
        }}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-hud-rule px-4">
          <span className="hud-sc text-[15px] font-bold tracking-[.1em] text-[var(--gold)]">
            Швидкі дії DM
          </span>
          <button
            type="button"
            className="flex size-8 items-center justify-center text-[var(--hud-muted)] hover:text-[var(--ink)]"
            onClick={closePanel}
            aria-label="Закрити"
          >
            <ChevronLeft className="size-5 rotate-180" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <button type="button" className={ACTION} onClick={() => onOpenLog()}>
            <ScrollText className="size-4 shrink-0 text-[var(--gold)]" />
            {logPanelOpen ? "Лог битви відкрито нижче" : "Відкрити лог битви"}
          </button>

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

          <button
            type="button"
            className={ACTION}
            onClick={() => {
              onAddParticipant();
              closePanel();
            }}
          >
            <UserPlus className="size-4 shrink-0 text-[var(--gold)]" />
            Додати героя / юніта
          </button>

          {onOpenCastSpell && (
            <button
              type="button"
              className={ACTION}
              onClick={() => {
                onOpenCastSpell();
                closePanel();
              }}
            >
              <Sparkles className="size-4 shrink-0 text-[#8fd0e8]" />
              Накласти заклинання
            </button>
          )}

          <section className="pt-2">
            <h4 className="hud-sc flex h-7 items-center border-b border-white/[.14] text-[13px] tracking-[.08em] text-[var(--hud-muted)]">
              Учасники бою
            </h4>
            <div className="max-h-48 overflow-y-auto">
              {participants.length === 0 ? (
                <p className="py-2 text-sm italic text-[var(--hud-muted)]">
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
          </section>

          {battle.status === "active" && (
            <button
              type="button"
              className="metal-gold metal-fill hud-sc flex h-11 w-full items-center justify-center gap-2 text-[15px] font-bold tracking-[.08em]"
              onClick={() => {
                onCompleteBattle();
                closePanel();
              }}
            >
              <Trophy className="size-4" />
              Завершити бій
            </button>
          )}
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px]"
          aria-label="Закрити"
          onClick={closePanel}
        />
      )}
    </>
  );
}
