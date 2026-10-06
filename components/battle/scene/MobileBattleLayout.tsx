"use client";

import { useState } from "react";

import { BattleLog } from "./BattleLog";
import { BattleOverBanner } from "./BattleOverBanner";
import { BattleTopBar } from "./BattleTopBar";
import { ConnectionBanner } from "./ConnectionBanner";
import { InitiativeTrack } from "./InitiativeTrack";
import { LastActionTicker } from "./LastActionTicker";
import { MyHeroPanel } from "./MyHeroPanel";
import { MyTurnControls } from "./MyTurnControls";
import { ParticipantDetails } from "./ParticipantDetails";
import { ParticipantList } from "./ParticipantList";

import { HUD_SURFACE } from "@/components/battle/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useBattleScene, useBelowHeaderHeight } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

export function MobileBattleLayout() {
  const { battle, current, hero, isMyTurn, allies, enemies, selectedId, select, log, openLog, closeLog } = useBattleScene();

  const [tab, setTab] = useState<"ally" | "enemy">("enemy");

  const height = useBelowHeaderHeight();

  const selected = battle.initiativeOrder.find((p) => p.basicInfo.id === selectedId) ?? null;

  const tabBtn = (side: "ally" | "enemy", label: string, n: number) => (
    <button role="tab" aria-selected={tab === side} type="button" onClick={() => setTab(side)} className={cn("hud-sc flex flex-1 items-center justify-center gap-2 text-[15px] tracking-[.08em]", tab === side ? "text-[var(--ink)] shadow-[inset_0_-2px_0_var(--enemy)]" : "text-[var(--muted)]")}>
      {label} {n}
    </button>
  );

  return (
    <div className="flex flex-col overflow-hidden" style={{ height }}>
      <ConnectionBanner />
      <BattleTopBar />
      <InitiativeTrack />
      <LastActionTicker onOpenLog={() => openLog()} />
      {battle.status === "completed" ? (
        <BattleOverBanner />
      ) : isMyTurn ? (
        <div className="hud-sc mx-4 mt-2 flex h-10 items-center justify-center gap-3 border-y border-[var(--enemy)] bg-[var(--enemy)]/20 text-[17px] tracking-[.12em] text-[var(--ink)]">Твій хід</div>
      ) : (
        <div className="flex h-8 items-center gap-2 px-4 text-[15px] italic text-[#b8ab95]">ходить <b className="hud-sc not-italic text-[var(--ink)]">{current?.basicInfo.name}</b></div>
      )}
      <div role="tablist" className="mx-4 flex h-11 border-b border-white/[.18]">
        {tabBtn("ally", "Союзники", allies.length)}
        {tabBtn("enemy", "Вороги", enemies.length)}
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
      <ResponsiveDialog open={!!selected} onOpenChange={(o) => !o && select(null)} title="Учасник" className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        {selected && <ParticipantDetails participant={selected} />}
      </ResponsiveDialog>
      <ResponsiveDialog open={log.open} onOpenChange={(o) => !o && closeLog()} title="Журнал" className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        <BattleLog key={log.focus ?? "latest"} />
      </ResponsiveDialog>
    </div>
  );
}
