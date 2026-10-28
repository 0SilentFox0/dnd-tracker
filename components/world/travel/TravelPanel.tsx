"use client";

import { Crosshair, DoorOpen, LogIn, Moon, Route } from "lucide-react";

import { TravelLog } from "./TravelLog";

import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { type RosterHero, type TravelMoved, useTravelPanel } from "@/lib/hooks/world";
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
  onMoved?(e: TravelMoved): void;
}

export function TravelPanel({ campaignId, mapId, heroes, onMapIds, target, selectedMarker, onPickTarget, onMoved }: TravelPanelProps) {
  const panel = useTravelPanel({ campaignId, mapId, heroes, onMapIds, target, selectedMarker, onMoved });

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

      <div>
        <h2 className="mb-1 text-sm font-medium text-hud-ink">Відпочинок</h2>
        <HudChipTabs ariaLabel="Відпочинок" items={RESTS.map((r) => ({ key: r.value, label: r.label, active: panel.rest === r.value, onSelect: () => panel.setRest(r.value) }))} />
      </div>

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
        <Button type="button" variant="outline" disabled={!panel.canRest} onClick={panel.restNow}>
          <Moon className="size-4" aria-hidden />
          Відпочити
        </Button>
        {panel.nested ? (
          <Button type="button" variant="outline" disabled={!panel.canExit} onClick={panel.exitMap}>
            <DoorOpen className="size-4" aria-hidden />
            Вийти
          </Button>
        ) : null}
      </div>

      {panel.restOff ? <p className="text-xs text-hud-muted">Ресурси між боями вимкнені в правилах кампанії.</p> : null}

      <div>
        <h2 className="mb-1 text-sm font-medium text-hud-ink">Журнал</h2>
        <TravelLog campaignId={campaignId} />
      </div>
    </HudPanel>
  );
}
