"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Settings2 } from "lucide-react";

import { AwaitingDmBanner } from "./AwaitingDmBanner";
import { BattleOverBanner } from "./BattleOverBanner";
import { BattleTopBar } from "./BattleTopBar";
import { ConnectionBanner } from "./ConnectionBanner";
import { LastActionTicker } from "./LastActionTicker";

import { BattleLog } from "@/components/battle/log/BattleLog";
import { InitiativeTrack } from "@/components/battle/participants/InitiativeTrack";
import { MyHeroPanel } from "@/components/battle/participants/MyHeroPanel";
import { ParticipantDetails } from "@/components/battle/participants/ParticipantDetails";
import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { MyTurnControls } from "@/components/battle/turn/MyTurnControls";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { BattleStatus,ParticipantSide } from "@/lib/constants/battle";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

const DmPanel = dynamic(() => import("@/components/battle/dm/DmPanel").then((m) => m.DmPanel), { ssr: false });

export function MobileBattleLayout() {
  const { battle, awaiting, isDM, current, hero, isMyTurn, allies, enemies, selectedId, select, log, openLog, closeLog } = useBattleScene();

  const [tab, setTab] = useState<ParticipantSide>(ParticipantSide.ENEMY);

  const [dmOpen, setDmOpen] = useState(false);

  const openLatestLog = useCallback(() => openLog(), [openLog]);

  const selected = battle.initiativeOrder.find((p) => p.basicInfo.id === selectedId) ?? null;

  const tabBtn = (side: ParticipantSide, label: string, n: number) => (
    <button role="tab" aria-selected={tab === side} type="button" onClick={() => setTab(side)} className={cn("hud-sc flex flex-1 items-center justify-center gap-2 text-[15px] tracking-[.08em]", tab === side ? "text-[var(--ink)] shadow-[inset_0_-2px_0_var(--enemy)]" : "text-[var(--hud-muted)]")}>
      {label} {n}
    </button>
  );

  return (
    <div className="below-header flex flex-col overflow-hidden">
      <ConnectionBanner />
      <BattleTopBar />
      <InitiativeTrack />
      <LastActionTicker onOpenLog={openLatestLog} />
      {battle.status === BattleStatus.COMPLETED ? (
        <BattleOverBanner />
      ) : awaiting && !isDM ? (
        <AwaitingDmBanner />
      ) : isMyTurn ? (
        <div className="hud-sc mx-4 mt-2 flex h-10 items-center justify-center gap-3 border-y border-[var(--enemy)] bg-[var(--enemy)]/20 text-[17px] tracking-[.12em] text-[var(--ink)]">Твій хід</div>
      ) : (
        <div className="flex h-8 items-center gap-2 px-4 text-[15px] italic text-[#b8ab95]">ходить <b className="hud-sc not-italic text-[var(--ink)]">{current?.basicInfo.name}</b></div>
      )}
      <div className="mx-4 flex h-11 border-b border-white/[.18]">
        <div role="tablist" className="flex flex-1">
          {tabBtn(ParticipantSide.ALLY, "Союзники", allies.length)}
          {tabBtn(ParticipantSide.ENEMY, "Вороги", enemies.length)}
        </div>
        {isDM && battle.status !== BattleStatus.PREPARED && (
          <button type="button" onClick={() => setDmOpen(true)} aria-label="Відкрити швидкі дії DM" className="flex w-11 items-center justify-center text-[var(--gold)]">
            <Settings2 className="size-5" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ParticipantList side={tab} />
      </div>
      {hero && (
        <div className="border-t border-white/[.22] bg-black/70 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <MyHeroPanel hero={hero} compact={isMyTurn} />
          {isMyTurn && <MyTurnControls key={`${hero.basicInfo.id}-${battle.currentRound}-${hero.battleData.extraTurnActive ? "x" : "n"}`} hero={hero} />}
        </div>
      )}
      {isDM && <DmPanel panel={{ open: dmOpen, onOpenChange: setDmOpen }} />}
      <ResponsiveDialog open={!!selected} onOpenChange={(o) => !o && select(null)} title="Учасник" className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        {selected && <ParticipantDetails participant={selected} />}
      </ResponsiveDialog>
      <ResponsiveDialog open={log.open} onOpenChange={(o) => !o && closeLog()} title="Журнал" className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        <BattleLog key={log.focus ?? "latest"} />
      </ResponsiveDialog>
    </div>
  );
}
