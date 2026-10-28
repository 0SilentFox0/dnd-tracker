"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Map as MapIcon } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { HeroEyesSelect } from "@/components/world/editor/HeroEyesSelect";
import { NewWorldMapDialog } from "@/components/world/editor/NewWorldMapDialog";
import { WorldBreadcrumbs } from "@/components/world/editor/WorldBreadcrumbs";
import { WorldEditorContext, type WorldEditorCtx } from "@/components/world/editor/WorldEditorContext";
import { WorldInspectorBar } from "@/components/world/editor/WorldInspectorBar";
import { WorldMapSettings } from "@/components/world/editor/WorldMapSettings";
import { WorldMarkerPanel } from "@/components/world/editor/WorldMarkerPanel";
import { WorldToolbar, WorldToolHint } from "@/components/world/editor/WorldToolbar";
import { CompassRose } from "@/components/world/marker-icons";
import { TargetMark } from "@/components/world/travel/TargetMark";
import { TravelPanel } from "@/components/world/travel/TravelPanel";
import { WorldMapView } from "@/components/world/WorldMapView";
import { useMediaQuery } from "@/lib/hooks/common";
import { DESKTOP_QUERY } from "@/lib/hooks/common/useIsMobile";
import { type TravelMoved, useHeroEyes, useMapDrawing, useMoveTarget, useRemoveMarker, useWorldEditor, useWorldHeroes, useWorldMap, useWorldMaps } from "@/lib/hooks/world";
import { polygonCentroid } from "@/lib/utils/world/geometry";
import { viewToMapProps } from "@/lib/utils/world/view-props";
import type { CreateWorldMarkerData, MapPoint, Polygon, WorldMarker } from "@/types/world";

const ENTRY_COMPASS = { width: "3.2%", aspectRatio: "1", transform: "translate(-50%, -50%)" } as const;

const NO_MARKERS: WorldMarker[] = [];

const FRAME_HEIGHT = "lg:flex lg:h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:flex-col";

const MAP_HEIGHT = "h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:h-auto lg:min-h-0 lg:flex-1";

export function WorldEditorPageClient({ campaignId, campaignName, mapId, initialSelectedId }: { campaignId: string; campaignName: string; mapId: string | null; initialSelectedId?: string }) {
  const router = useRouter();

  const pathname = usePathname();

  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const maps = useWorldMaps(campaignId);

  const detail = useWorldMap(campaignId, mapId, { keepPrevious: true });

  const editor = useWorldEditor(campaignId, mapId);

  const roster = useWorldHeroes(campaignId);

  const eyes = useHeroEyes(campaignId, mapId);

  const [selectedId, select] = useState<string | null>(initialSelectedId ?? null);

  const moveTarget = useMoveTarget(detail.data?.markers ?? NO_MARKERS);

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

  const { reset: resetTarget } = moveTarget;

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
    onMove: moveTarget.pickPoint,
  }, !eyes.asHeroId);

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
    (id: string | null, { keepTool = false }: { keepTool?: boolean } = {}) => {
      select(null);
      setSettingsOpen(false);
      setRedrawId(null);
      resetTarget();

      if (!keepTool) setTool("select");

      router.replace(id ? `${pathname}?map=${id}` : pathname);
    },
    [router, pathname, setTool, resetTarget],
  );

  const changeEyes = (heroId: string | null) => {
    eyes.setAsHeroId(heroId);
    select(null);
    setSettingsOpen(false);
    setTool("select");
  };

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
        <OnboardingHint id="dm.world" />
        <QueryState query={maps} empty={emptyView}>
          {() =>
            mapId ? (
              <QueryState query={detail}>
                {(d) => {
                  const marker = selectedId ? d.markers.find((m) => m.id === selectedId) : undefined;

                  const panel = marker ? <WorldMarkerPanel /> : <WorldMapSettings key={d.map.id} />;

                  const panelOpen = tool === "select" && (!!marker || settingsOpen);

                  const sheetOpen = !isDesktop && panelOpen;

                  return (
                    <>
                      <HudPageHeader
                        title="Карта світу"
                        subtitle={<WorldBreadcrumbs mapId={d.map.id} />}
                        actions={<span className="hidden text-sm text-hud-muted md:inline">{campaignName}</span>}
                        className="max-md:p-2 max-md:[&_h1]:sr-only"
                      />
                      <div className={FRAME_HEIGHT}>
                        <div className="mb-2 shrink-0">
                          <WorldToolbar drawing={drawing} readOnly={!!eyes.asHeroId} onSettings={() => setSettingsOpen(true)} inspector={isDesktop ? <WorldInspectorBar open={panelOpen} onClose={closePanel} /> : undefined}>
                            <HeroEyesSelect heroes={roster.heroes} value={eyes.asHeroId} onChange={changeEyes} />
                          </WorldToolbar>
                        </div>
                        <div className="flex min-h-0 flex-col gap-2 lg:flex-1 lg:flex-row">
                          <div className={`relative ${MAP_HEIGHT} lg:min-w-0`}>
                            {eyes.asHeroId ? (
                              <QueryState query={eyes.view}>
                                {(v) => {
                                  const p = viewToMapProps(v);

                                  return (
                                    <WorldMapView
                                      key={`${v.map.id}:${eyes.asHeroId}`}
                                      detail={p.detail}
                                      heroes={p.heroes}
                                      fog={p.fog}
                                      compact={!isDesktop}
                                      hint={<p role="status" className="pointer-events-none rounded-md border border-[var(--gold)]/60 bg-black/80 px-3 py-1.5 text-xs text-hud-ink">Вигляд гравця</p>}
                                    />
                                  );
                                }}
                              </QueryState>
                            ) : (
                              <WorldMapView
                                key={d.map.id}
                                detail={d}
                                heroes={d.heroes}
                                selectedId={selectedId}
                                draft={drawing.draft}
                                tool={tool}
                                compact={!isDesktop}
                                hint={<WorldToolHint tool={tool} vertices={drawing.draft.length} />}
                                handlers={{
                                  ...drawing.handlers,
                                  onMapClick: (p) => (tool === "select" ? select(null) : drawing.handlers.onMapClick(p)),
                                  onMarkerClick: (id) => {
                                    if (tool === "select") select(id);
                                    else if (tool === "move") moveTarget.pickMarker(id);
                                  },
                                  onMarkerDrag: tool === "select" || tool === "point" ? (id, p) => void editor.marker.update.mutateOk({ id, data: { x: p.x, y: p.y } }) : undefined,
                                }}
                                overlay={
                                  <>
                                    <CompassRose className="atlas-compass pointer-events-none absolute" style={{ ...ENTRY_COMPASS, left: `${d.map.entryX * 100}%`, top: `${d.map.entryY * 100}%` }} />
                                    {moveTarget.point ? <TargetMark point={moveTarget.point} /> : null}
                                  </>
                                }
                              />
                            )}
                          </div>
                          {tool === "move" && !eyes.asHeroId ? (
                            <div className="lg:w-80 lg:shrink-0 lg:overflow-y-auto">
                              <TravelPanel
                                campaignId={campaignId}
                                mapId={d.map.id}
                                heroes={roster.heroes}
                                onMapIds={(d.heroes ?? []).map((h) => h.id)}
                                target={moveTarget.point}
                                selectedMarker={moveTarget.marker}
                                onPickTarget={() => setTool("move")}
                                onMoved={(e: TravelMoved) => e.kind !== "travel" && openMap(e.destMapId, { keepTool: true })}
                              />
                            </div>
                          ) : null}
                        </div>
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
