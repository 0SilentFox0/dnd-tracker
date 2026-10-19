"use client";

import { useState } from "react";
import { ChevronLeft, ChevronsDown, ChevronsUp, Dices, RefreshCw, ScrollText, Sparkles, Trophy, UserPlus } from "lucide-react";

import { type DmParticipantActions, DmParticipantRow } from "./DmParticipantRow";

import { BattleLogPanel } from "@/components/battle/log/BattleLogPanel";
import { HUD_SURFACE } from "@/components/hud";
import { BattleStatus } from "@/lib/constants/battle";
import { type BattlePageDialogs, useBattleScene, useUnitControlPanel } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import { isLiveScalable } from "@/lib/utils/battle/balance/live-scale";
import type { BattleParticipant } from "@/types/battle";

const PANEL_WIDTH = 320;

const ACTION = "hud-sc flex h-10 w-full items-center gap-2.5 border border-white/25 bg-black/55 px-3 text-left text-[15px] text-[var(--ink)] transition-colors hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/[.06]";

export interface DmQuickActionsPanelProps {
  dialogs: BattlePageDialogs;
  /** Відкрити діалог накладання заклинання (будь-яке заклинання на будь-кого) */
  onOpenCastSpell: () => void;
  /** Керований режим (мобільний): панель відкривається ззовні, бічної вкладки немає */
  panel?: { open: boolean; onOpenChange: (open: boolean) => void };
}

export function DmQuickActionsPanel({ dialogs, onOpenCastSpell, panel }: DmQuickActionsPanelProps) {
  const { battle, viewer, dmControl, actions } = useBattleScene();

  const [ownOpen, setOwnOpen] = useState(false);

  const confirm = useConfirm();

  const unitControl = useUnitControlPanel();

  const open = panel ? panel.open : ownOpen;

  const setOpen = panel ? panel.onOpenChange : setOwnOpen;

  if (!viewer.isDM || battle.status === BattleStatus.PREPARED) return null;

  const participants = (battle.initiativeOrder ?? []) as BattleParticipant[];

  const closePanel = () => setOpen(false);

  const refreshSources = async () => {
    const ok = await confirm({
      title: "Оновити з бібліотеки?",
      description: "Здібності, атаки, закляття і слоти учасників оновляться з бази кампанії. HP, ефекти й використані ліміти залишаться.",
      confirmLabel: "Оновити",
    });

    if (ok) actions.refreshSources.mutate({});
  };

  const rowActions: DmParticipantActions = {
    onChangeHp: dialogs.hp.show,
    onTakeControl: (p) => dmControl.set(p?.basicInfo.id ?? null),
    onRemove: (p) => actions.updateParticipant.mutate({ participantId: p.basicInfo.id, data: { removeFromBattle: true } }),
    onKill: battle.status === BattleStatus.ACTIVE ? (p) => actions.updateParticipant.mutate({ participantId: p.basicInfo.id, data: { kill: true } }) : undefined,
    onDone: closePanel,
    unitControl: unitControl.row,
  };

  const canScale = battle.status === BattleStatus.ACTIVE && participants.some(isLiveScalable);

  return (
    <>
      {!panel && <button
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
      </button>}

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
          <button type="button" className={ACTION} onClick={dialogs.log.show}>
            <ScrollText className="size-4 shrink-0 text-[var(--gold)]" />
            {dialogs.log.open ? "Лог битви відкрито нижче" : "Відкрити лог битви"}
          </button>

          {dialogs.log.open && (
            <BattleLogPanel
              battle={battle}
              isDM={viewer.isDM}
              onRollback={(actionIndex) => actions.rollback.mutate({ actionIndex })}
              open={true}
              onOpenChange={dialogs.log.setOpen}
              embedInSidebar
            />
          )}

          <button
            type="button"
            className={ACTION}
            onClick={() => {
              dialogs.addParticipant.show();
              closePanel();
            }}
          >
            <UserPlus className="size-4 shrink-0 text-[var(--gold)]" />
            Додати героя / юніта
          </button>

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

          {battle.status === BattleStatus.ACTIVE && (
            <button type="button" className={ACTION} disabled={actions.refreshSources.isPending} onClick={refreshSources}>
              <RefreshCw className="size-4 shrink-0 text-[var(--gold)]" />
              Оновити з бібліотеки
            </button>
          )}

          {battle.status === BattleStatus.ACTIVE && (
            <button type="button" className={ACTION} disabled={!unitControl.random.can || unitControl.random.isPending} title="Вільні союзні юніти (під ДМ) розподіляються між гравцями" onClick={unitControl.random.run}>
              <Dices className="size-4 shrink-0 text-[var(--gold)]" />
              Роздати юнітів випадково
            </button>
          )}

          {canScale && (
            <section className="pt-2">
              <h4 className="hud-sc flex h-7 items-center border-b border-white/[.14] text-[13px] tracking-[.08em] text-[var(--hud-muted)]">
                Ворожі юніти (лише цей бій)
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button type="button" className={ACTION} title="HP і шкода ×1.1, стакається" onClick={() => actions.scaleUnits.mutate({ direction: "buff" })}>
                  <ChevronsUp className="size-4 shrink-0 text-hud-danger" />
                  Підсилити
                </button>
                <button type="button" className={ACTION} title="HP і шкода ÷1.1, стакається" onClick={() => actions.scaleUnits.mutate({ direction: "debuff" })}>
                  <ChevronsDown className="size-4 shrink-0 text-hud-good" />
                  Послабити
                </button>
              </div>
            </section>
          )}

          <section className="pt-2">
            <h4 className="hud-sc flex h-7 items-center border-b border-white/[.14] text-[13px] tracking-[.08em] text-[var(--hud-muted)]">
              Учасники бою
            </h4>
            <div>
              {participants.length === 0 ? (
                <p className="py-2 text-sm italic text-[var(--hud-muted)]">
                  Нікого на полі
                </p>
              ) : (
                participants.map((p) => (
                  <DmParticipantRow
                    key={p.basicInfo.id}
                    participant={p}
                    controlled={dmControl.id === p.basicInfo.id}
                    actions={rowActions}
                  />
                ))
              )}
            </div>
          </section>

          {battle.status === BattleStatus.ACTIVE && (
            <button
              type="button"
              className="metal-gold metal-fill hud-sc flex h-11 w-full items-center justify-center gap-2 text-[15px] font-bold tracking-[.08em]"
              onClick={() => {
                actions.complete.mutate({});
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
