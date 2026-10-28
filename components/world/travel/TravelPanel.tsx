"use client";

import { Crosshair, DoorOpen, LogIn, Route } from "lucide-react";

import { TravelLog } from "./TravelLog";

import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { type RosterHero, useTravelPanel } from "@/lib/hooks/world";
import type { MapPoint, TravelRest, WorldMarker } from "@/types/world";

const RESTS: { value: TravelRest; label: string }[] = [
  { value: "none", label: "Без відпочинку" },
  { value: "short", label: "Короткий" },
  { value: "long", label: "Довгий" },
];

export interface TravelPanelProps {
  campaignId: string;
  mapId: string;
  heroes: RosterHero[];
  onMapIds: string[];
  target: MapPoint | null;
  selectedMarker: WorldMarker | null;
  onPickTarget(): void;
}

export function TravelPanel({ campaignId, mapId, heroes, onMapIds, target, selectedMarker, onPickTarget }: TravelPanelProps) {
  const panel = useTravelPanel({ campaignId, mapId, heroes, onMapIds, target, selectedMarker });

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
        {panel.nested ? (
          <Button type="button" variant="outline" disabled={!panel.canExit} onClick={panel.exitMap}>
            <DoorOpen className="size-4" aria-hidden />
            Вийти
          </Button>
        ) : null}
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium text-hud-ink">Журнал</h2>
        <TravelLog campaignId={campaignId} />
      </div>
    </HudPanel>
  );
}
