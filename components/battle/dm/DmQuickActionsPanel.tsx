"use client";

import { type ReactNode, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronsDown, ChevronsUp, Dices, type LucideIcon, RefreshCw, ScrollText, Sparkles, Trophy, UserPlus } from "lucide-react";

import { ConditionsDialog } from "./ConditionsDialog";
import { DmBattleLog } from "./DmBattleLog";
import { DmParticipantRow } from "./DmParticipantRow";
import { LegendaryActionDialog } from "./LegendaryActionDialog";

import { HUD_SURFACE } from "@/components/hud";
import { BattleStatus } from "@/lib/constants/battle";
import { type BattlePageDialogs, useBattleScene, useDmParticipantActions } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { isLiveScalable } from "@/lib/utils/battle/balance/live-scale";
import type { BattleParticipant } from "@/types/battle";

const PANEL_WIDTH = 320;

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  closeAfter?: () => void;
  tone?: string;
  title?: string;
  disabled?: boolean;
}

function QuickAction({ icon: Icon, label, onClick, closeAfter, tone = "text-[var(--gold)]", title, disabled }: QuickActionProps) {
  return (
    <button
      type="button"
      className="hud-sc flex h-10 w-full items-center gap-2.5 border border-white/25 bg-black/55 px-3 text-left text-[15px] text-[var(--ink)] transition-colors hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/[.06]"
      title={title}
      disabled={disabled}
      onClick={() => {
        onClick();
        closeAfter?.();
      }}
    >
      <Icon className={cn("size-4 shrink-0", tone)} />
      {label}
    </button>
  );
}

function PanelSection({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className="pt-2">
      <h4 className="hud-sc flex h-7 items-center border-b border-white/[.14] text-[13px] tracking-[.08em] text-[var(--hud-muted)]">{title}</h4>
      <div className={className}>{children}</div>
    </section>
  );
}

export interface DmQuickActionsPanelProps {
  dialogs: BattlePageDialogs;
  onOpenCastSpell: () => void;
  /** Controlled mode (mobile): the panel is opened from outside, no side tab */
  panel?: { open: boolean; onOpenChange: (open: boolean) => void };
}

export function DmQuickActionsPanel({ dialogs, onOpenCastSpell, panel }: DmQuickActionsPanelProps) {
  const t = useTranslations("battleDm");

  const { battle, viewer, dmControl, actions } = useBattleScene();

  const [ownOpen, setOwnOpen] = useState(false);

  const open = panel ? panel.open : ownOpen;

  const setOpen = panel ? panel.onOpenChange : setOwnOpen;

  const closePanel = () => setOpen(false);

  const { row, refreshSources, randomUnits, conditions, legendary } = useDmParticipantActions({ onChangeHp: dialogs.hp.show, onDone: closePanel });

  if (!viewer.isDM || battle.status === BattleStatus.PREPARED) return null;

  const participants = (battle.initiativeOrder ?? []) as BattleParticipant[];

  const isActive = battle.status === BattleStatus.ACTIVE;

  const canScale = isActive && participants.some(isLiveScalable);

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
        aria-label={t("panel.open")}
      >
        <ChevronLeft className="size-6" />
      </button>}

      <div
        inert={!open}
        className={cn(
          HUD_SURFACE,
          "fixed bottom-0 right-0 top-0 z-50 flex max-w-full flex-col",
          "border-l border-hud-line bg-[#14100c]/[.97] shadow-[-12px_0_40px_rgba(0,0,0,.7)]",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ width: PANEL_WIDTH }}
      >
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-hud-rule px-4">
          <span className="hud-sc text-[15px] font-bold tracking-[.1em] text-[var(--gold)]">
            {t("panel.title")}
          </span>
          <button
            type="button"
            className="flex size-8 items-center justify-center text-[var(--hud-muted)] hover:text-[var(--ink)]"
            onClick={closePanel}
            aria-label={t("panel.close")}
          >
            <ChevronLeft className="size-5 rotate-180" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          <QuickAction icon={ScrollText} label={dialogs.log.open ? t("panel.logOpen") : t("panel.openLog")} onClick={dialogs.log.show} />

          {dialogs.log.open && <DmBattleLog onClose={() => dialogs.log.setOpen(false)} />}

          <QuickAction icon={UserPlus} label={t("panel.addParticipant")} onClick={dialogs.addParticipant.show} closeAfter={closePanel} />

          <QuickAction icon={Sparkles} tone="text-[#8fd0e8]" label={t("panel.castSpell")} onClick={onOpenCastSpell} closeAfter={closePanel} />

          {isActive && (
            <QuickAction icon={RefreshCw} label={t("panel.refreshSources")} disabled={refreshSources.isPending} onClick={refreshSources.run} />
          )}

          {isActive && (
            <QuickAction
              icon={Dices}
              label={t("panel.randomUnits")}
              disabled={!randomUnits.can || randomUnits.isPending}
              title={t("panel.randomUnitsHint")}
              onClick={randomUnits.run}
            />
          )}

          {canScale && (
            <PanelSection title={t("panel.enemyUnits")} className="grid grid-cols-2 gap-2 pt-2">
              <QuickAction icon={ChevronsUp} tone="text-hud-danger" label={t("panel.buff")} title={t("panel.buffHint")} onClick={() => actions.scaleUnits.mutate({ direction: "buff" })} />
              <QuickAction icon={ChevronsDown} tone="text-hud-good" label={t("panel.debuff")} title={t("panel.debuffHint")} onClick={() => actions.scaleUnits.mutate({ direction: "debuff" })} />
            </PanelSection>
          )}

          <PanelSection title={t("panel.participants")}>
            {participants.length === 0 ? (
              <p className="py-2 text-sm italic text-[var(--hud-muted)]">{t("panel.nobody")}</p>
            ) : (
              participants.map((p) => <DmParticipantRow key={p.basicInfo.id} participant={p} controlled={dmControl.id === p.basicInfo.id} actions={row} />)
            )}
          </PanelSection>

          {isActive && (
            <button
              type="button"
              className="metal-gold metal-fill hud-sc flex h-11 w-full items-center justify-center gap-2 text-[15px] font-bold tracking-[.08em]"
              onClick={() => {
                actions.complete.mutate({});
                closePanel();
              }}
            >
              <Trophy className="size-4" />
              {t("completeBattle")}
            </button>
          )}
        </div>
      </div>

      <ConditionsDialog participant={conditions.target} onClose={conditions.close} onSubmit={conditions.submit} isPending={conditions.isPending} />
      <LegendaryActionDialog participant={legendary.target} onClose={legendary.close} />

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px]"
          aria-label={t("panel.close")}
          onClick={closePanel}
        />
      )}
    </>
  );
}
