"use client";

import { useTranslations } from "next-intl";
import { Crosshair, DoorOpen, LogIn, Moon, Route } from "lucide-react";

import { TravelLog } from "./TravelLog";

import { HudChipTabs, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { type RosterHero, type TravelMoved, useTravelPanel } from "@/lib/hooks/world";
import type { MapPoint, TravelRest, WorldMarker } from "@/types/world";

const RESTS: TravelRest[] = ["none", "short", "long"];

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
  const t = useTranslations("world.travel");

  const panel = useTravelPanel({ campaignId, mapId, heroes, onMapIds, target, selectedMarker, onMoved });

  return (
    <HudPanel as="div" className="flex flex-col gap-3">
      <div>
        <h2 className="mb-1 text-sm font-medium text-hud-ink">{t("heroes")}</h2>
        <HudChipTabs
          ariaLabel={t("heroes")}
          items={[
            { key: "all", label: t("all"), active: panel.allSelected, onSelect: panel.selectAll },
            ...heroes.map((h) => ({ key: h.id, label: h.name, active: panel.selected.includes(h.id), onSelect: () => panel.toggle(h.id) })),
          ]}
        />
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium text-hud-ink">{t("restTitle")}</h2>
        <HudChipTabs ariaLabel={t("restTitle")} items={RESTS.map((r) => ({ key: r, label: t(`rest.${r}`), active: panel.rest === r, onSelect: () => panel.setRest(r) }))} />
      </div>

      <p className="text-xs text-hud-muted">
        {target ? t("targetPicked") : t("targetHint")}
        {selectedMarker ? ` ${t("marker", { name: selectedMarker.name })}` : ""}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!panel.canMove} onClick={panel.move}>
          <Route className="size-4" aria-hidden />
          {t("move")}
        </Button>
        <Button type="button" variant="outline" onClick={onPickTarget}>
          <Crosshair className="size-4" aria-hidden />
          {t("pickTarget")}
        </Button>
        {panel.canEnter ? (
          <Button type="button" variant="outline" disabled={!panel.canAct} onClick={panel.enterMarker}>
            <LogIn className="size-4" aria-hidden />
            {t("enter")}
          </Button>
        ) : null}
        <Button type="button" variant="outline" disabled={!panel.canRest} onClick={panel.restNow}>
          <Moon className="size-4" aria-hidden />
          {t("restNow")}
        </Button>
        {panel.nested ? (
          <Button type="button" variant="outline" disabled={!panel.canExit} onClick={panel.exitMap}>
            <DoorOpen className="size-4" aria-hidden />
            {t("exit")}
          </Button>
        ) : null}
      </div>

      {panel.restOff ? <p className="text-xs text-hud-muted">{t("restOff")}</p> : null}

      <div>
        <h2 className="mb-1 text-sm font-medium text-hud-ink">{t("log")}</h2>
        <TravelLog campaignId={campaignId} />
      </div>
    </HudPanel>
  );
}
