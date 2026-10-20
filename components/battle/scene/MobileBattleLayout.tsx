"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Settings2 } from "lucide-react";

import { AwaitingDmBanner } from "./AwaitingDmBanner";
import { BattleOverBanner } from "./BattleOverBanner";
import { BattleTopBar } from "./BattleTopBar";
import { ConnectionBanner } from "./ConnectionBanner";
import { LastActionTicker } from "./LastActionTicker";
import { MapStripRow, MapStripSlotContext } from "./MapStrip";

import { BattleAudioDock } from "@/components/battle/audio/BattleAudioDock";
import { BattleLog } from "@/components/battle/log/BattleLog";
import { BattleMapPanel } from "@/components/battle/map/BattleMapPanel";
import { InitiativeTrack } from "@/components/battle/participants/InitiativeTrack";
import { MyHeroPanel } from "@/components/battle/participants/MyHeroPanel";
import { ParticipantDetails } from "@/components/battle/participants/ParticipantDetails";
import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { ReserveSheetButton } from "@/components/battle/participants/ReservePanel";
import { MyTurnControls } from "@/components/battle/turn/MyTurnControls";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { BattleStatus, ParticipantSide } from "@/lib/constants/battle";
import { MAP_TAB, type MobileBattleTab, useBattleScene, useMobileBattleTabs, useSelectedParticipant } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { myTurnKey } from "@/lib/utils/battle/view";

const ActionResultCard = dynamic(() => import("@/components/battle/overlays/ActionResultCard").then((m) => m.ActionResultCard), { ssr: false });

const DmPanel = dynamic(() => import("@/components/battle/dm/DmPanel").then((m) => m.DmPanel), { ssr: false });

export function MobileBattleLayout() {
  const { battle, awaiting, viewer: { isDM }, turn: { current, isMyTurn }, roster: { hero, allies, enemies }, select, log, intents } = useBattleScene();

  const hasMap = !!battle.map;

  const { tab, set: setTab, expand, expandTick } = useMobileBattleTabs({ hasMap, mapAim: !!(intents.mapAim || intents.mapPick) });

  const mapTab = tab === MAP_TAB;

  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  const [dmOpen, setDmOpen] = useState(false);

  const { show: showLog, close: closeLog } = log;

  const openLatestLog = useCallback(() => showLog(), [showLog]);

  const selected = useSelectedParticipant();

  const tabBtn = (side: MobileBattleTab, label: string, n?: number) => (
    <button role="tab" aria-selected={tab === side} type="button" onClick={() => setTab(side)} className={cn("hud-sc flex flex-1 items-center justify-center gap-2 text-[15px] tracking-[.08em]", tab === side ? "text-[var(--ink)] shadow-[inset_0_-2px_0_var(--enemy)]" : "text-[var(--hud-muted)]")}>
      {label} {n}
    </button>
  );

  const completed = battle.status === BattleStatus.COMPLETED;

  const turnKey = hero && isMyTurn ? myTurnKey(hero, battle.currentRound) : null;

  const waitingFor = <span className="italic text-[#b8ab95]">ходить <b className="hud-sc not-italic text-[var(--ink)]">{current?.basicInfo.name}</b></span>;

  return (
    <MapStripSlotContext value={slot}>
    <div className="below-header flex flex-col overflow-hidden">
      <ConnectionBanner />
      {!mapTab && (
        <>
          <BattleTopBar />
          <InitiativeTrack />
          <LastActionTicker onOpenLog={openLatestLog} />
          {completed ? (
            <BattleOverBanner />
          ) : awaiting ? (
            <AwaitingDmBanner />
          ) : isMyTurn ? (
            <div className="hud-sc mx-4 mt-2 flex h-10 items-center justify-center gap-3 border-y border-[var(--enemy)] bg-[var(--enemy)]/20 text-[17px] tracking-[.12em] text-[var(--ink)]">Твій хід</div>
          ) : (
            <div className="flex h-8 items-center px-4 text-[15px]">{waitingFor}</div>
          )}
        </>
      )}
      <div className="mx-4 flex h-11 border-b border-white/[.18]">
        <div role="tablist" className="flex flex-1">
          {hasMap && tabBtn(MAP_TAB, "Карта")}
          {tabBtn(ParticipantSide.ALLY, "Союзники", allies.length)}
          {tabBtn(ParticipantSide.ENEMY, "Вороги", enemies.length)}
        </div>
        {mapTab && <ReserveSheetButton />}
        {isDM && battle.status !== BattleStatus.PREPARED && (
          <button type="button" onClick={() => setDmOpen(true)} aria-label="Відкрити швидкі дії DM" className="flex w-11 items-center justify-center text-[var(--gold)]">
            <Settings2 className="size-5" />
          </button>
        )}
      </div>
      {/* док — шар над картою/списком: панель не може вилізти за верх області, а на будь-якій вкладці лишається змонтованою (звук іде) */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {mapTab ? (
          <div className="min-h-0 flex-1"><BattleMapPanel phone /></div>
        ) : (
          <div data-participant-scroll className="relative z-0 min-h-0 flex-1 overflow-y-auto">
            <ParticipantList side={tab} />
          </div>
        )}
        <BattleAudioDock placement="strip" collapseOn={turnKey} collapseTick={expandTick} />
      </div>
      {/* обгортка й MyTurnControls на тих самих місцях на всіх вкладках: перемонтування вбило б відкритий майстер і наведення */}
      {(hero || mapTab) && (
        <div className={cn("border-t border-white/[.22] bg-black/70 px-4", mapTab ? "pb-[max(8px,env(safe-area-inset-bottom))] pt-1" : "pb-[max(12px,env(safe-area-inset-bottom))] pt-3")}>
          {mapTab && <div ref={setSlot} data-map-strip-slot />}
          {hero && !mapTab && <MyHeroPanel hero={hero} compact={isMyTurn} />}
          {hero && isMyTurn && <MyTurnControls key={turnKey} hero={hero} strip={mapTab ? { onExpand: expand } : undefined} />}
          {mapTab && !(hero && isMyTurn) && !intents.mapAim && !intents.mapPick && (
            <MapStripRow onExpand={expand}>
              {completed ? <span className="hud-sc">Бій завершено</span> : awaiting ? <span className="hud-sc">{isDM ? "Бій чекає вашого рішення" : "Очікуємо рішення ДМ"}</span> : waitingFor}
            </MapStripRow>
          )}
        </div>
      )}
      <ActionResultCard />
      {isDM && <DmPanel panel={{ open: dmOpen, onOpenChange: setDmOpen }} />}
      <ResponsiveDialog open={!!selected} onOpenChange={(o) => !o && select(null)} title="Учасник" className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        {selected && <ParticipantDetails participant={selected} />}
      </ResponsiveDialog>
      <ResponsiveDialog open={log.open} onOpenChange={(o) => !o && closeLog()} title="Журнал" className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
        <BattleLog key={log.focus ?? "latest"} />
      </ResponsiveDialog>
    </div>
    </MapStripSlotContext>
  );
}
