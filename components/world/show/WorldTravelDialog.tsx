"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { QueryState } from "@/components/common/states";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { TargetMark } from "@/components/world/travel/TargetMark";
import { TravelPanel } from "@/components/world/travel/TravelPanel";
import { WorldCrumbs } from "@/components/world/WorldCrumbs";
import { WorldMapView } from "@/components/world/WorldMapView";
import { useMediaQuery } from "@/lib/hooks/common";
import { DESKTOP_QUERY } from "@/lib/hooks/common/useIsMobile";
import { type TravelMoved, useMoveTarget, useWorldHeroes, useWorldMap, useWorldMaps } from "@/lib/hooks/world";
import type { WorldMarker } from "@/types/world";

const NO_MARKERS: WorldMarker[] = [];

interface WorldTravelDialogProps {
  campaignId: string;
  mapId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  onMoved?(e: TravelMoved): void;
}

export function WorldTravelDialog({ campaignId, mapId, open, onOpenChange, onMoved }: WorldTravelDialogProps) {
  const t = useTranslations("world.travel");

  return (
    <ResponsiveDialog hud size="lg" className="sm:max-w-4xl" open={open} onOpenChange={onOpenChange} title={t("dialogTitle")} description={t("dialogDescription")}>
      {open && <TravelBody campaignId={campaignId} mapId={mapId} onMoved={onMoved} />}
    </ResponsiveDialog>
  );
}

function TravelBody({ campaignId, mapId, onMoved }: { campaignId: string; mapId: string; onMoved?(e: TravelMoved): void }) {
  const [viewId, setViewId] = useState(mapId);

  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const maps = useWorldMaps(campaignId);

  const detail = useWorldMap(campaignId, viewId);

  const roster = useWorldHeroes(campaignId);

  const markers = detail.data?.markers ?? NO_MARKERS;

  const target = useMoveTarget(markers);

  const open = (id: string) => {
    target.reset();
    setViewId(id);
  };

  const moved = (e: TravelMoved) => {
    if (e.kind !== "travel") open(e.destMapId);

    onMoved?.(e);
  };

  return (
    <div className="flex flex-col gap-3">
      {maps.data && <WorldCrumbs maps={maps.data} mapId={viewId} onOpen={open} />}
      <div className="h-[50dvh] min-h-[16rem]">
        <QueryState query={detail}>
          {(d) => (
            <WorldMapView
              key={d.map.id}
              detail={d}
              heroes={d.heroes}
              tool="move"
              compact={!isDesktop}
              handlers={{ onMapClick: target.pickPoint, onMarkerClick: target.pickMarker }}
              overlay={target.point ? <TargetMark point={target.point} /> : null}
            />
          )}
        </QueryState>
      </div>
      <TravelPanel
        campaignId={campaignId}
        mapId={viewId}
        heroes={roster.heroes}
        onMapIds={(detail.data?.heroes ?? []).map((h) => h.id)}
        target={target.point}
        selectedMarker={target.marker}
        onPickTarget={() => undefined}
        onMoved={moved}
      />
    </div>
  );
}
