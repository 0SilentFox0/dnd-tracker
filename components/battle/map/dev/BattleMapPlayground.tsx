"use client";

import { BattleMap } from "../BattleMap";

import "@/components/battle/hud/battle-hud.css";
import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { useBattleMapPlayground } from "@/lib/hooks/battle";
import { remainingMovement } from "@/lib/utils/battle/grid";

const FIELD = "h-8 w-full rounded-md border border-hud-rule bg-black/30 px-2 text-sm";

const BUTTON = "h-9 rounded-md border border-hud-rule px-3 text-sm hover:bg-white/10";

function clampSize(value: string, fallback: number): number {
  const n = Math.round(Number(value));

  return Number.isFinite(n) ? Math.min(40, Math.max(4, n)) : fallback;
}

export function BattleMapPlayground() {
  const { map, setMap, participants, active, mode, view, actions, log, controls } = useBattleMapPlayground();

  const attack = active.battleData.attacks[0];

  return (
    <div className="battle-hud min-h-screen p-3 sm:p-6">
      <h1 className="mb-4 text-xl font-semibold">Карта бою — пісочниця</h1>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-3">
          <HudPanel className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Прозорість сітки: {map.opacity.toFixed(2)}
              <input type="range" min={0} max={1} step={0.05} value={map.opacity} onChange={(e) => setMap({ ...map, opacity: Number(e.target.value) })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                Колонки
                <input className={FIELD} type="number" min={4} max={40} value={map.cols} onChange={(e) => setMap({ ...map, cols: clampSize(e.target.value, map.cols) })} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Рядки
                <input className={FIELD} type="number" min={4} max={40} value={map.rows} onChange={(e) => setMap({ ...map, rows: clampSize(e.target.value, map.rows) })} />
              </label>
            </div>
            <HudChipTabs
              ariaLabel="Режим"
              items={[
                { key: "move", label: "Рух", active: mode === "move", onSelect: () => controls.setMode("move") },
                { key: "attack", label: "Атака", active: mode === "attack", onSelect: () => controls.setMode("attack") },
              ]}
            />
            <div className="flex gap-2">
              <button type="button" className={BUTTON} onClick={controls.nextTurn}>
                Наступний хід
              </button>
              <button type="button" className={BUTTON} onClick={controls.reset}>
                Скинути
              </button>
            </div>
          </HudPanel>
          <HudPanel className="text-sm">
            <div className="font-semibold">{active.basicInfo.name}</div>
            <div className="text-hud-muted">
              HP {active.combatStats.currentHp}/{active.combatStats.maxHp} · Залишок руху: {remainingMovement(active)} кл.
            </div>
            {attack && (
              <div className="text-hud-muted">
                {attack.name} · {attack.type === "melee" ? "ближня" : "дальня"}
                {attack.range ? ` · ${attack.range}` : ""}
              </div>
            )}
          </HudPanel>
          <HudPanel className="text-sm">
            <div className="mb-1 font-semibold">Лог</div>
            {log.length === 0 ? <div className="text-hud-muted">Порожньо</div> : log.map((line, i) => <div key={`${i}-${line}`}>{line}</div>)}
          </HudPanel>
        </div>
        <BattleMap map={map} participants={participants} view={view} actions={actions} className="w-full" />
      </div>
    </div>
  );
}
