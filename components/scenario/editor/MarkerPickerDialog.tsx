"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, MapPin } from "lucide-react";

import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { WorldMapLink } from "@/components/world/WorldMapLink";
import { DESKTOP_QUERY, useMediaQuery, useSearch } from "@/lib/hooks/common";
import { useWorldMap, useWorldMaps } from "@/lib/hooks/world";
import { mapPath } from "@/lib/utils/world/tree";
import type { ScenarioMarkerRef } from "@/types/scenario";
import type { WorldMapSummary, WorldMarker } from "@/types/world";

interface Props {
  campaignId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  onPick(ref: ScenarioMarkerRef): void;
}

const markerFields = (m: WorldMarker) => [m.name];

const depthOf = (maps: WorldMapSummary[], id: string) => mapPath(maps, id).length - 1;

function treeOrder(maps: WorldMapSummary[]): WorldMapSummary[] {
  const ids = new Set(maps.map((m) => m.id));

  const out: WorldMapSummary[] = [];

  const walk = (parent: string | null) => {
    for (const m of maps) {
      if ((m.parentMapId && ids.has(m.parentMapId) ? m.parentMapId : null) === parent && !out.includes(m)) {
        out.push(m);
        walk(m.id);
      }
    }
  };

  walk(null);

  return out;
}

function MarkerList({ campaignId, mapId, onPick }: { campaignId: string; mapId: string; onPick(markerId: string): void }) {
  const t = useTranslations("scenario.markerPicker");

  const { data, isLoading, isError, error, refetch } = useWorldMap(campaignId, mapId);

  const search = useSearch(data?.markers ?? [], markerFields);

  if (isLoading) return <LoadingState />;

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (!data?.markers.length) return <EmptyState icon={MapPin} title={t("noMarkers")} />;

  return (
    <div className="flex flex-col gap-2">
      <SearchInput value={search.query.value} onChange={search.query.set} label={t("search")} />
      {search.items.length === 0 ? (
        <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />
      ) : (
        search.items.map((m) => (
          <Button key={m.id} type="button" variant="outline" className="justify-start" onClick={() => onPick(m.id)}>
            <MapPin className="size-4" aria-hidden /> {m.name}
          </Button>
        ))
      )}
    </div>
  );
}

export function MarkerPickerDialog({ campaignId, open, onOpenChange, onPick }: Props) {
  const t = useTranslations("scenario.markerPicker");

  const isWide = useMediaQuery(DESKTOP_QUERY);

  const { data: maps = [], isLoading, isError, error, refetch } = useWorldMaps(campaignId);

  const [mapId, setMapId] = useState<string | null>(null);

  const ordered = useMemo(() => treeOrder(maps), [maps]);

  const pick = (markerId: string) => {
    if (!mapId) return;

    onPick({ mapId, markerId });
    onOpenChange(false);
  };

  const tree = (
    <div className="flex flex-col gap-1">
      {ordered.map((m) => (
        <Button key={m.id} type="button" variant={m.id === mapId ? "secondary" : "ghost"} className="justify-start" style={{ paddingLeft: 12 + depthOf(maps, m.id) * 14 }} onClick={() => setMapId(m.id)}>
          {m.name}
        </Button>
      ))}
    </div>
  );

  let body;

  if (isLoading) body = <LoadingState />;
  else if (isError) body = <ErrorState error={error} onRetry={() => void refetch()} />;
  else if (maps.length === 0) body = <EmptyState icon={MapPin} title={t("noMaps")} action={<WorldMapLink campaignId={campaignId} variant="button" newTab />} />;
  else if (isWide)
    body = (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        {tree}
        {mapId ? <MarkerList campaignId={campaignId} mapId={mapId} onPick={pick} /> : <EmptyState title={t("pickMap")} />}
      </div>
    );
  else if (!mapId) body = tree;
  else
    body = (
      <div className="flex flex-col gap-2">
        <Button type="button" variant="ghost" className="self-start" onClick={() => setMapId(null)}>
          <ChevronLeft className="size-4" aria-hidden /> {t("toMaps")}
        </Button>
        <MarkerList campaignId={campaignId} mapId={mapId} onPick={pick} />
      </div>
    );

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={t("title")}>
      {body}
    </ResponsiveDialog>
  );
}
