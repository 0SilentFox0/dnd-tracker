"use client";

import type { CSSProperties } from "react";

import { ShowWaiting } from "@/components/show/stage/ShowWaiting";
import { WorldMapView } from "@/components/world/WorldMapView";
import { useMediaQuery, useReducedMotion } from "@/lib/hooks/common";
import { DESKTOP_QUERY } from "@/lib/hooks/common/useIsMobile";
import { useShowWorld, useWorldDive } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";
import type { ShowWorld } from "@/types/show";

export function ShowWorldStage({ campaignId, world, isDM }: { campaignId: string; world: ShowWorld; isDM: boolean }) {
  const scene = useShowWorld(campaignId, world, isDM);

  const reduced = useReducedMotion();

  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const detail = scene.props?.detail;

  const dive = useWorldDive(detail, reduced);

  const shown = scene.props && dive.shown ? { ...scene.props, detail: dive.shown } : undefined;

  if (!shown || scene.status === "missing") {
    return (
      <div className="absolute inset-0 z-10 bg-black">
        <ShowWaiting message={scene.status === "missing" ? "Карта недоступна" : "Завантажуємо карту…"} />
      </div>
    );
  }

  const current = shown.detail.map.id === scene.mapId;

  return (
    <div className="absolute inset-0 z-10 bg-black">
      <div
        data-phase={dive.phase}
        className={cn("atlas-dive-scene", dive.phase === "dive" && "atlas-dive", dive.phase === "reveal" && "atlas-reveal")}
        style={dive.origin ? ({ "--dive-x": `${dive.origin.x * 100}%`, "--dive-y": `${dive.origin.y * 100}%` } as CSSProperties) : undefined}
      >
        <WorldMapView
          key={shown.detail.map.id}
          detail={shown.detail}
          heroes={shown.heroes}
          fog={shown.fog}
          focus={current ? scene.focus : undefined}
          selectedId={current ? scene.selectedId : undefined}
          compact={!isDesktop}
          className="rounded-none border-0"
        />
      </div>
      {isDM && <p className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded bg-black/70 px-3 py-1 text-sm text-hud-bone">Гравці бачать карту зі своїм туманом</p>}
    </div>
  );
}
