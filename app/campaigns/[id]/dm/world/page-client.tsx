"use client";

import { useTranslations } from "next-intl";
import { Map as MapIcon } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { HeroEyesSelect } from "@/components/world/editor/HeroEyesSelect";
import { NewWorldMapDialog } from "@/components/world/editor/NewWorldMapDialog";
import { WorldBreadcrumbs } from "@/components/world/editor/WorldBreadcrumbs";
import { WorldEditorContext } from "@/components/world/editor/WorldEditorContext";
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
import { type TravelMoved, useWorldEditorPage } from "@/lib/hooks/world";
import { viewToMapProps } from "@/lib/utils/world/view-props";

const ENTRY_COMPASS = { width: "3.2%", aspectRatio: "1", transform: "translate(-50%, -50%)" } as const;

const FRAME_HEIGHT = "lg:flex lg:h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:flex-col";

const MAP_HEIGHT = "h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:h-auto lg:min-h-0 lg:flex-1";

export function WorldEditorPageClient({ campaignId, campaignName, mapId, initialSelectedId }: { campaignId: string; campaignName: string; mapId: string | null; initialSelectedId?: string }) {
  const t = useTranslations("world");

  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const page = useWorldEditorPage({ campaignId, mapId, initialSelectedId });

  const { ctx, maps, detail, roster, eyes, drawing, moveTarget, editor, selectedId, select, tool, setTool, creating, setCreating, settingsOpen, setSettingsOpen, closePanel, openMap, changeEyes } = page;

  const emptyView = (
    <>
      <HudPageHeader title={t("title")} subtitle={campaignName} />
      <EmptyState
        icon={MapIcon}
        title={t("editor.emptyTitle")}
        description={t("editor.emptyDescription")}
        action={<Button onClick={() => setCreating(true)}>{t("editor.upload")}</Button>}
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
                        title={t("title")}
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
                                      hint={<p role="status" className="pointer-events-none rounded-md border border-[var(--gold)]/60 bg-black/80 px-3 py-1.5 text-xs text-hud-ink">{t("eyes.player")}</p>}
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
                                    else if (tool === "move" && !detail.isPlaceholderData) moveTarget.pickMarker(id);
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
                          description={marker ? t("editor.markerParams") : t("editor.mapParams")}
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
