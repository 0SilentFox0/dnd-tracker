"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Footprints, Map as MapIcon, Presentation } from "lucide-react";

import { SHOW_TONE, ShowButton } from "@/components/show/stage/show-ui";
import { WorldTravelDialog } from "@/components/world/show/WorldTravelDialog";
import { WorldMapLink } from "@/components/world/WorldMapLink";
import type { ShowControl } from "@/lib/hooks/show";
import { type TravelMoved, useWorldMap, useWorldMaps } from "@/lib/hooks/world";
import { cn } from "@/lib/utils";
import { mapPath } from "@/lib/utils/world/tree";
import type { ShowState } from "@/types/show";

const SELECT = "h-7 min-w-0 max-w-48 rounded bg-transparent pr-1 text-xs opacity-75 hover:opacity-100 [&>*]:bg-neutral-900 [&>*]:text-neutral-100";

interface Pick {
  base: string | undefined;
  id: string;
}

export function ShowWorldControls({ campaignId, show, control }: { campaignId: string; show: ShowState | null; control: ShowControl }) {
  const t = useTranslations("world.show");

  const { data: maps } = useWorldMaps(campaignId);

  const shownMapId = show?.world?.mapId;

  const [mapPick, setMapPick] = useState<Pick | null>(null);

  const [focusPick, setFocusPick] = useState<(Pick & { mapId: string }) | null>(null);

  const [travelOpen, setTravelOpen] = useState(false);

  const root = maps?.find((m) => !m.parentMapId);

  const mapId = (mapPick?.base === shownMapId ? mapPick?.id : undefined) ?? shownMapId ?? root?.id ?? null;

  const { data: detail } = useWorldMap(campaignId, mapId);

  if (!maps || maps.length === 0) return <WorldLink campaignId={campaignId} />;

  const focusId = focusPick && focusPick.mapId === mapId && focusPick.base === shownMapId ? focusPick.id : shownMapId === mapId ? show?.world?.focusMarkerId : undefined;

  const rows = maps
    .map((m) => ({ map: m, path: mapPath(maps, m.id) }))
    .sort((a, b) => a.path.map((p) => p.name).join("\0").localeCompare(b.path.map((p) => p.name).join("\0")));

  const showing = !!mapId && shownMapId === mapId;

  const send = (focusMarkerId?: string) => mapId && void control.send({ action: "world", mapId, focusMarkerId });

  const pickFocus = (id: string) => {
    setFocusPick({ base: shownMapId, mapId: mapId as string, id });

    if (showing) send(id || undefined);
  };

  const followTravel = (e: TravelMoved) => {
    if (e.kind !== "travel" && shownMapId === e.fromMapId) void control.send({ action: "world", mapId: e.destMapId });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ShowButton aria-label={t("present")} title={t("present")} disabled={control.pending || !mapId} aria-pressed={showing} onClick={() => send(focusId || undefined)}>
        <MapIcon className="size-4" />
        <span className="text-xs">{t("present")}</span>
      </ShowButton>
      <select aria-label={t("map")} value={mapId ?? ""} onChange={(e) => setMapPick({ base: shownMapId, id: e.target.value })} className={SELECT}>
        {rows.map(({ map, path }) => (
          <option key={map.id} value={map.id}>
            {"  ".repeat(path.length - 1)}
            {map.name}
          </option>
        ))}
      </select>
      <select aria-label={t("focus")} value={focusId ?? ""} onChange={(e) => pickFocus(e.target.value)} className={SELECT} disabled={control.pending}>
        <option value="">{t("noFocus")}</option>
        {detail?.markers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      {show?.world && (
        <ShowButton aria-label={t("toSlides")} title={t("toSlidesTitle")} disabled={control.pending} onClick={() => void control.send({ action: "worldOff" })}>
          <Presentation className="size-4" />
          <span className="text-xs">{t("toSlides")}</span>
        </ShowButton>
      )}
      <ShowButton aria-label={t("travel")} title={t("travelTitle")} disabled={!mapId} onClick={() => setTravelOpen(true)}>
        <Footprints className="size-4" />
        <span className="text-xs">{t("travel")}</span>
      </ShowButton>
      {mapId && <WorldTravelDialog campaignId={campaignId} mapId={mapId} open={travelOpen} onOpenChange={setTravelOpen} onMoved={followTravel} />}
      <WorldLink campaignId={campaignId} />
    </div>
  );
}

function WorldLink({ campaignId }: { campaignId: string }) {
  return (
    <div className={cn("ml-auto flex justify-end", SHOW_TONE.muted)}>
      <WorldMapLink campaignId={campaignId} variant="button" newTab />
    </div>
  );
}
