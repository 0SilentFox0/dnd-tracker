"use client";

import { Crosshair, DoorOpen, LogIn, Route } from "lucide-react";

import { QueryState } from "@/components/common/states";
import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { type RosterHero, useTravelPanel } from "@/lib/hooks/world";
import type { MapPoint, TravelRest, WorldMarker } from "@/types/world";

const RESTS: { value: TravelRest; label: string }[] = [
  { value: "none", label: "Без відпочинку" },
  { value: "short", label: "Короткий" },
  { value: "long", label: "Довгий" },
];

const REST_LABEL: Record<TravelRest, string> = { none: "", short: "короткий відпочинок", long: "довгий відпочинок" };

export interface TravelPanelProps {
  campaignId: string;
  mapId: string;
  heroes: RosterHero[];
  target: MapPoint | null;
  selectedMarker: WorldMarker | null;
  onPickTarget(): void;
}

export function TravelPanel({ campaignId, mapId, heroes, target, selectedMarker, onPickTarget }: TravelPanelProps) {
  const panel = useTravelPanel({ campaignId, mapId, heroes, target, selectedMarker });

  return (
    <HudPanel as="div" className="flex flex-col gap-3">
      <div>
        <h2 className="mb-1 text-sm font-medium text-hud-ink">Герої</h2>
        <HudChipTabs
          ariaLabel="Герої"
          items={[
            { key: "all", label: "Усі", active: panel.allSelected, onSelect: panel.selectAll },
            ...heroes.map((h) => ({ key: h.id, label: h.name, active: panel.selected.includes(h.id), onSelect: () => panel.toggle(h.id) })),
          ]}
        />
      </div>

      <fieldset className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-hud-ink">
        <legend className="mb-1 text-sm font-medium">Відпочинок</legend>
        {RESTS.map((r) => (
          <label key={r.value} className="flex items-center gap-1.5">
            <input type="radio" name="travel-rest" value={r.value} checked={panel.rest === r.value} onChange={() => panel.setRest(r.value)} />
            {r.label}
          </label>
        ))}
      </fieldset>

      <p className="text-xs text-hud-muted">
        {target ? "Ціль обрано на карті." : "Клікніть по карті, щоб обрати ціль."}
        {selectedMarker ? ` Маркер: ${selectedMarker.name}.` : ""}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!panel.canMove} onClick={panel.move}>
          <Route className="size-4" aria-hidden />
          Перемістити
        </Button>
        <Button type="button" variant="outline" onClick={onPickTarget}>
          <Crosshair className="size-4" aria-hidden />
          Обрати ціль
        </Button>
        {panel.canEnter ? (
          <Button type="button" variant="outline" disabled={!panel.canAct} onClick={panel.enterMarker}>
            <LogIn className="size-4" aria-hidden />
            Зайти
          </Button>
        ) : null}
        {panel.canExit ? (
          <Button type="button" variant="outline" disabled={!panel.canAct} onClick={panel.exitMap}>
            <DoorOpen className="size-4" aria-hidden />
            Вийти
          </Button>
        ) : null}
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium text-hud-ink">Журнал</h2>
        <QueryState query={panel.log} empty={<p className="text-xs text-hud-muted">Подорожей ще не було.</p>}>
          {(entries) => (
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto text-xs text-hud-muted">
              {entries.map((e) => (
                <li key={e.id}>
                  <span className="text-hud-ink">{e.heroes.map((h) => h.name).join(", ")}</span> → {e.toMarkerName ?? e.mapName}
                  {e.rest !== "none" ? `, ${REST_LABEL[e.rest]}` : ""}
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </div>
    </HudPanel>
  );
}
