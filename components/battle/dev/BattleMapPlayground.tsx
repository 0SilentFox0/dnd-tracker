"use client";

import "@/components/battle/hud/battle-hud.css";
import { BattleMap } from "@/components/battle/map/BattleMap";
import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useBattleMapPlayground } from "@/lib/hooks/battle/useBattleMapPlayground";
import { cn } from "@/lib/utils";
import { remainingMovement } from "@/lib/utils/battle/grid";

const FIELD = "h-8 w-full rounded-md border border-hud-rule bg-black/30 px-2 text-sm";

const BUTTON = "h-9 rounded-md border border-hud-rule px-3 text-sm hover:bg-white/10";

function clampSize(value: string, fallback: number): number {
  const n = Math.round(Number(value));

  return Number.isFinite(n) ? Math.min(40, Math.max(4, n)) : fallback;
}

export function BattleMapPlayground() {
  const { map, setMap, margin, setMargin, participants, active, mode, view, actions, log, controls } = useBattleMapPlayground();

  const attack = active.battleData.attacks[0];

  const modeTabs = (
    <HudChipTabs
      ariaLabel="Mode"
      items={[
        { key: "move", label: "Move", active: mode === "move", onSelect: () => controls.setMode("move") },
        { key: "attack", label: "Attack", active: mode === "attack", onSelect: () => controls.setMode("attack") },
        { key: "template", label: "Template", active: mode === "template", onSelect: () => controls.setMode("template") },
      ]}
    />
  );

  return (
    <TooltipProvider>
    <div className="battle-hud below-header flex flex-col overflow-hidden p-3 sm:p-4">
      <h1 className="mb-2 shrink-0 text-lg font-semibold">Battle map playground</h1>
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2 lg:hidden">
        {modeTabs}
        <button type="button" className={cn(BUTTON, "h-8")} onClick={controls.nextTurn}>
          Next turn
        </button>
        <button type="button" className={cn(BUTTON, "h-8")} onClick={controls.reset}>
          Reset
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-[300px_1fr]">
        <div className="hidden min-h-0 flex-col gap-3 overflow-y-auto lg:flex">
          <HudPanel className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Grid opacity: {map.opacity.toFixed(2)}
              <input type="range" min={0} max={1} step={0.05} value={map.opacity} onChange={(e) => setMap({ ...map, opacity: Number(e.target.value) })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                Columns
                <input className={FIELD} type="number" min={4} max={40} value={map.cols} onChange={(e) => setMap({ ...map, cols: clampSize(e.target.value, map.cols) })} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Rows
                <input className={FIELD} type="number" min={4} max={40} value={map.rows} onChange={(e) => setMap({ ...map, rows: clampSize(e.target.value, map.rows) })} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Margins (cells)
              <input className={FIELD} type="number" min={0} max={5} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
            </label>
            {modeTabs}
            <div className="flex gap-2">
              <button type="button" className={BUTTON} onClick={controls.nextTurn}>
                Next turn
              </button>
              <button type="button" className={BUTTON} onClick={controls.reset}>
                Reset
              </button>
            </div>
          </HudPanel>
          <HudPanel className="text-sm">
            <div className="font-semibold">{active.basicInfo.name}</div>
            <div className="text-hud-muted">
              HP {active.combatStats.currentHp}/{active.combatStats.maxHp} · Movement left: {remainingMovement(active)} cells
            </div>
            {attack && (
              <div className="text-hud-muted">
                {attack.name} · {attack.type === "melee" ? "melee" : "ranged"}
                {attack.range ? ` · ${attack.range}` : ""}
              </div>
            )}
          </HudPanel>
          <HudPanel className="text-sm">
            <div className="mb-1 font-semibold">Log</div>
            {log.length === 0 ? <div className="text-hud-muted">Empty</div> : log.map((line, i) => <div key={`${i}-${line}`}>{line}</div>)}
          </HudPanel>
        </div>
        <div className="h-full min-h-0 min-w-0">
          <BattleMap map={map} participants={participants} view={view} actions={actions} />
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
