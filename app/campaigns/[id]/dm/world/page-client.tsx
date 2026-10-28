"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Map as MapIcon } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { NewWorldMapDialog } from "@/components/world/editor/NewWorldMapDialog";
import { WorldBreadcrumbs } from "@/components/world/editor/WorldBreadcrumbs";
import { WorldEditorContext, type WorldEditorCtx } from "@/components/world/editor/WorldEditorContext";
import { WorldMapSettings } from "@/components/world/editor/WorldMapSettings";
import { WorldMarkerPanel } from "@/components/world/editor/WorldMarkerPanel";
import { WorldSidePanel } from "@/components/world/editor/WorldSidePanel";
import { WorldToolbar, WorldToolHint } from "@/components/world/editor/WorldToolbar";
import { CompassRose } from "@/components/world/marker-icons";
import { WorldMapView } from "@/components/world/WorldMapView";
import { useMediaQuery } from "@/lib/hooks/common";
import { DESKTOP_QUERY } from "@/lib/hooks/common/useIsMobile";
import { useMapDrawing, useRemoveMarker, useWorldEditor, useWorldMap, useWorldMaps } from "@/lib/hooks/world";
import { polygonCentroid } from "@/lib/utils/world/geometry";
import type { CreateWorldMarkerData, MapPoint, Polygon } from "@/types/world";

const ENTRY_COMPASS = { width: "3.2%", aspectRatio: "1", transform: "translate(-50%, -50%)" } as const;

const MAP_HEIGHT = "h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:h-[calc(100dvh-var(--app-header-h,89px)-12rem)]";

export function WorldEditorPageClient({ campaignId, campaignName, mapId }: { campaignId: string; campaignName: string; mapId: string | null }) {
  const router = useRouter();

  const pathname = usePathname();

  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const maps = useWorldMaps(campaignId);

  const detail = useWorldMap(campaignId, mapId);

  const editor = useWorldEditor(campaignId, mapId);

  const [selectedId, select] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);

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

  useRemoveMarker({ marker: detail.data?.markers.find((m) => m.id === selectedId), editor, select, hotkey: tool === "select" });

  const closePanel = useCallback(() => {
    select(null);
    setSettingsOpen(false);
  }, []);

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
      setSettingsOpen(false);
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

  const emptyView = (
    <>
      <HudPageHeader title="Карта світу" subtitle={campaignName} />
      <EmptyState
        icon={MapIcon}
        title="Завантажте карту континенту"
        description="З неї почнеться подорож: на ній ставляться міста, зони й входи у вкладені карти."
        action={<Button onClick={() => setCreating(true)}>Завантажити карту</Button>}
      />
    </>
  );

  return (
    <WorldEditorContext.Provider value={ctx}>
      <HudPage>
        <QueryState query={maps} empty={emptyView}>
          {() =>
            mapId ? (
              <QueryState query={detail}>
                {(d) => {
                  const marker = selectedId ? d.markers.find((m) => m.id === selectedId) : undefined;

                  const panel = marker ? <WorldMarkerPanel /> : <WorldMapSettings key={d.map.id} />;

                  const sheetOpen = !isDesktop && tool === "select" && (!!marker || settingsOpen);

                  return (
                    <>
                      <HudPageHeader
                        title="Карта світу"
                        subtitle={<WorldBreadcrumbs mapId={d.map.id} />}
                        actions={<span className="hidden text-sm text-hud-muted md:inline">{campaignName}</span>}
                        className="max-md:p-2 max-md:[&_h1]:sr-only"
                      />
                      <div className="mb-2">
                        <WorldToolbar drawing={drawing} onSettings={() => setSettingsOpen(true)} />
                      </div>
                      <div className={`relative ${MAP_HEIGHT}`}>
                        <WorldMapView
                          key={d.map.id}
                          detail={d}
                          selectedId={selectedId}
                          draft={drawing.draft}
                          tool={tool}
                          compact={!isDesktop}
                          hint={<WorldToolHint tool={tool} vertices={drawing.draft.length} />}
                          handlers={{
                            ...drawing.handlers,
                            onMapClick: (p) => (tool === "select" ? select(null) : drawing.handlers.onMapClick(p)),
                            onMarkerClick: (id) => (tool === "select" ? select(id) : undefined),
                            onMarkerDrag: tool === "select" || tool === "point" ? (id, p) => void editor.marker.update.mutateOk({ id, data: { x: p.x, y: p.y } }) : undefined,
                          }}
                          overlay={<CompassRose className="atlas-compass pointer-events-none absolute" style={{ ...ENTRY_COMPASS, left: `${d.map.entryX * 100}%`, top: `${d.map.entryY * 100}%` }} />}
                        />
                        {isDesktop ? (
                          <WorldSidePanel open={tool === "select" && (!!marker || settingsOpen)} onClose={closePanel}>
                            {panel}
                          </WorldSidePanel>
                        ) : null}
                      </div>
                      {isDesktop ? null : (
                        <ResponsiveDialog
                          hud
                          open={sheetOpen}
                          onOpenChange={(open) => {
                            if (!open) closePanel();
                          }}
                          title={marker?.name ?? d.map.name}
                          description={marker ? "Параметри маркера" : "Параметри карти"}
                        >
                          {panel}
                        </ResponsiveDialog>
                      )}
                    </>
                  );
                }}
              </QueryState>
            ) : (
              emptyView
            )
          }
        </QueryState>
        <NewWorldMapDialog open={creating} onOpenChange={setCreating} />
      </HudPage>
    </WorldEditorContext.Provider>
  );
}
