"use client";

import dynamic from "next/dynamic";

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

import { useBattleScene } from "@/lib/hooks/battle";

const DmPanel = dynamic(() => import("./DmPanel").then((m) => m.DmPanel), { ssr: false });

const H3 = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <h3 className="hud-sc flex h-8 items-center gap-2 border-b border-white/[.14] text-[15px] font-bold tracking-[.1em] text-[#a89c88]">
    <i className="size-2 rounded-full" style={{ background: color }} />
    {children}
  </h3>
);

export function DesktopBattleLayout({ onComplete }: { onComplete: () => void }) {
  const { battle, hero, isMyTurn, isDM, allies, enemies, selectedId, select, log } = useBattleScene();

  const selected = battle.initiativeOrder.find((p) => p.basicInfo.id === selectedId) ?? null;

  return (
    <div className="below-header flex flex-col overflow-hidden">
      <ConnectionBanner />
      <BattleTopBar onComplete={onComplete} />
      {battle.status === "completed" && <BattleOverBanner />}
      <div className="flex h-20 items-center border-y border-white/[.08]">
        <div className="min-w-0 flex-1"><InitiativeTrack /></div>
        <div className="w-[420px] shrink-0"><LastActionTicker /></div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_280px]">
        <aside className="flex flex-col gap-3 overflow-y-auto border-r border-white/10 p-5">
          {hero && <MyHeroPanel hero={hero} />}
          {isMyTurn && hero && <MyTurnControls key={`${hero.basicInfo.id}-${battle.currentRound}-${hero.battleData.extraTurnActive ? "x" : "n"}`} hero={hero} />}
          {!isMyTurn && !isDM && battle.status === "active" && <div className="flex h-11 items-center justify-center border border-dashed border-white/[.18] text-sm italic text-[var(--hud-muted)]">Дії стануть доступні у твій хід</div>}
          {isDM && <DmPanel />}
        </aside>
        <main className="grid min-h-0 grid-cols-2 gap-6 overflow-y-auto px-6 py-4">
          <div className="min-w-0"><H3 color="var(--ally)">Союзники · {allies.length}</H3><ParticipantList side="ally" className="px-0" /></div>
          <div className="min-w-0"><H3 color="var(--enemy)">Вороги · {enemies.length}</H3><ParticipantList side="enemy" className="px-0" /></div>
        </main>
        <aside className="flex min-h-0 flex-col overflow-y-auto border-l border-white/10 px-5 py-4">
          <h3 className="hud-sc flex h-8 items-center justify-between border-b border-white/[.14] text-[15px] font-bold tracking-[.1em] text-[#a89c88]">
            {selected ? "Учасник" : "Журнал"}
            {selected && <button type="button" onClick={() => select(null)} className="font-sans text-[13px] font-normal tracking-normal text-[var(--hud-muted)]">← журнал</button>}
          </h3>
          {selected ? <div className="pt-3"><ParticipantDetails participant={selected} /></div> : <BattleLog key={log.focus ?? "latest"} />}
        </aside>
      </div>
    </div>
  );
}
