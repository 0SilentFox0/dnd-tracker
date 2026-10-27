"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Map as MapIcon } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { NewWorldMapDialog } from "@/components/world/editor/NewWorldMapDialog";
import { WorldBreadcrumbs } from "@/components/world/editor/WorldBreadcrumbs";
import { WorldEditorContext, type WorldEditorCtx } from "@/components/world/editor/WorldEditorContext";
import { WorldMapSettings } from "@/components/world/editor/WorldMapSettings";
import { WorldMarkerPanel } from "@/components/world/editor/WorldMarkerPanel";
import { WorldToolbar } from "@/components/world/editor/WorldToolbar";
import { WorldMapView } from "@/components/world/WorldMapView";
import { useMapDrawing, useWorldEditor, useWorldMap, useWorldMaps } from "@/lib/hooks/world";
import { polygonCentroid } from "@/lib/utils/world/geometry";
import type { CreateWorldMarkerData, MapPoint, Polygon } from "@/types/world";

const ENTRY_DOT = { width: "1.6%", aspectRatio: "1", transform: "translate(-50%, -50%)" } as const;

export function WorldEditorPageClient({ campaignId, campaignName, mapId }: { campaignId: string; campaignName: string; mapId: string | null }) {
  const router = useRouter();

  const pathname = usePathname();

  const maps = useWorldMaps(campaignId);

  const detail = useWorldMap(campaignId, mapId);

  const editor = useWorldEditor(campaignId, mapId);

  const [selectedId, select] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  const [redrawId, setRedrawId] = useState<string | null>(null);

  const createMarker = async (data: Omit<CreateWorldMarkerData, "mapId">) => {
    if (!mapId) return;

    try {
      select((await editor.marker.create.mutateAsync({ mapId, ...data })).id);
    } catch {
      // create's errorText already notified
    }
  };

  const drawing = useMapDrawing({
    onPoint: (p) => void createMarker({ kind: "point", x: p.x, y: p.y, name: "Нова точка", icon: "landmark" }),
    onZone: (polygon: Polygon) => {
      if (redrawId) {
        void editor.marker.update.mutateOk({ id: redrawId, data: { polygon } });
        setRedrawId(null);
        drawing.setTool("select");

        return;
      }

      const c = polygonCentroid(polygon);

      void createMarker({ kind: "zone", x: c.x, y: c.y, polygon, name: "Нова зона" });
    },
    onEntry: (p: MapPoint) => {
      if (mapId) void editor.map.update.mutateOk({ id: mapId, data: { entryX: p.x, entryY: p.y } });
    },
  });

  const { tool, setTool } = drawing;

  const redraw = useCallback(
    (id: string | null) => {
      setRedrawId(id);
      setTool(id ? "zone" : "select");
    },
    [setTool],
  );

  const openMap = useCallback(
    (id: string | null) => {
      select(null);
      setRedrawId(null);
      setTool("select");
      router.replace(id ? `${pathname}?map=${id}` : pathname);
    },
    [router, pathname, setTool],
  );

  const ctx: WorldEditorCtx = useMemo(
    () => ({ campaignId, detail: detail.data ?? null, maps: maps.data ?? [], editor, selectedId, select, openMap, tool, setTool, redrawId, redraw }),
    [campaignId, detail.data, maps.data, editor, selectedId, openMap, tool, setTool, redrawId, redraw],
  );

  const empty = (
    <EmptyState
      icon={MapIcon}
      title="Завантажте карту континенту"
      description="З неї почнеться подорож: на ній ставляться міста, зони й входи у вкладені карти."
      action={<Button onClick={() => setCreating(true)}>Завантажити карту</Button>}
    />
  );

  return (
    <WorldEditorContext.Provider value={ctx}>
      <HudPage>
        <QueryState query={maps} empty={empty}>
          {() =>
            mapId ? (
              <QueryState query={detail}>
                {(d) => (
                  <>
                    <HudPageHeader title={d.map.name} subtitle={<WorldBreadcrumbs mapId={d.map.id} />} actions={<span className="text-sm text-hud-muted">{campaignName}</span>} />
                    <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
                      <div className="flex flex-col gap-2">
                        <WorldToolbar drawing={drawing} />
                        <div className="h-[60dvh] lg:h-[calc(100dvh-14rem)]">
                        <WorldMapView
                          detail={d}
                          selectedId={selectedId}
                          draft={drawing.draft}
                          handlers={{ ...drawing.handlers, onMapClick: (p) => (tool === "select" ? select(null) : drawing.handlers.onMapClick(p)), onMarkerClick: (id) => (tool === "select" || tool === "zone" ? select(id) : undefined) }}
                          overlay={<span className="pointer-events-none absolute rounded-full border-2 border-[var(--gold)] bg-[var(--gold)]/40" style={{ ...ENTRY_DOT, left: `${d.map.entryX * 100}%`, top: `${d.map.entryY * 100}%` }} />}
                        />
                        </div>
                      </div>
                      <HudPanel>
                        {selectedId && d.markers.some((m) => m.id === selectedId) ? <WorldMarkerPanel /> : <WorldMapSettings key={d.map.id} />}
                      </HudPanel>
                    </div>
                  </>
                )}
              </QueryState>
            ) : (
              empty
            )
          }
        </QueryState>
        <NewWorldMapDialog open={creating} onOpenChange={setCreating} />
      </HudPage>
    </WorldEditorContext.Provider>
  );
}
