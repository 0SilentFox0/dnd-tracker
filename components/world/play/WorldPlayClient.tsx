"use client";

import { useTranslations } from "next-intl";
import { Map as MapIcon } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudChipTabs, HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { Button } from "@/components/ui/button";
import { WorldNotesPanel } from "@/components/world/notes/WorldNotesPanel";
import { TravelLog } from "@/components/world/travel/TravelLog";
import { WorldCrumbs } from "@/components/world/WorldCrumbs";
import { WorldMapView } from "@/components/world/WorldMapView";
import { useMediaQuery } from "@/lib/hooks/common";
import { DESKTOP_QUERY } from "@/lib/hooks/common/useIsMobile";
import { usePusherShowSync } from "@/lib/hooks/show";
import { useWorldPlay } from "@/lib/hooks/world";
import { viewToMapProps } from "@/lib/utils/world/view-props";

const MAP_HEIGHT = "h-[calc(100dvh-var(--app-header-h,89px)-9rem)] min-h-[20rem]";

export function WorldPlayClient({ campaignId, campaignName, mapId }: { campaignId: string; campaignName: string; mapId: string | null }) {
  const play = useWorldPlay(campaignId, mapId);

  const t = useTranslations("world");

  usePusherShowSync(campaignId, !!mapId);

  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  if (!mapId) {
    return (
      <HudPage>
        <HudPageHeader title={t("title")} subtitle={campaignName} />
        <EmptyState icon={MapIcon} title={t("play.emptyTitle")} description={t("play.emptyDescription")} />
      </HudPage>
    );
  }

  return (
    <HudPage>
      <OnboardingHint id="player.world" />
      <QueryState query={play.view}>
        {(view) => {
          const props = viewToMapProps(view);

          const places = view.maps.filter((m) => m.id !== view.map.id);

          const marker = play.selectedMarker;

          const childOpen = marker?.childMapId ? view.maps.some((m) => m.id === marker.childMapId) : false;

          return (
            <>
              <HudPageHeader title={t("title")} subtitle={<WorldCrumbs maps={view.maps} mapId={view.map.id} onOpen={play.openMap} />} actions={<span className="hidden text-sm text-hud-muted md:inline">{campaignName}</span>} />
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className={MAP_HEIGHT}>
                  <WorldMapView
                    key={view.map.id}
                    detail={props.detail}
                    heroes={props.heroes}
                    fog={props.fog}
                    focus={play.focus}
                    selectedId={marker?.id}
                    compact={!isDesktop}
                    handlers={{ onMarkerClick: play.select, onMapClick: () => play.select(null) }}
                  />
                </div>
                <div className="flex flex-col gap-3 lg:max-h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:overflow-y-auto">
                  {play.myHeroes.length > 0 ? (
                    <HudPanel as="div">
                      <h2 className="mb-1 text-sm font-medium text-hud-ink">{t("play.myHeroes")}</h2>
                      <HudChipTabs ariaLabel={t("play.myHeroes")} items={play.myHeroes.map((h) => ({ key: h.id, label: h.name, active: false, onSelect: () => play.focusHero(h) }))} />
                    </HudPanel>
                  ) : null}
                  {marker ? (
                    <>
                      <WorldNotesPanel campaignId={campaignId} mapId={view.map.id} marker={marker} notes={view.notes} heroes={play.myHeroes} />
                      {childOpen && marker.childMapId ? (
                        <Button type="button" variant="outline" onClick={() => play.openMap(marker.childMapId as string)}>
                          {t("play.openMap")}
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <HudPanel as="div">
                      <p className="text-sm text-hud-muted">{t("play.pickMarker")}</p>
                    </HudPanel>
                  )}
                  {places.length > 0 ? (
                    <HudPanel as="div">
                      <h2 className="mb-1 text-sm font-medium text-hud-ink">{t("play.places")}</h2>
                      <ul className="flex flex-col gap-1">
                        {places.map((m) => (
                          <li key={m.id}>
                            <button type="button" className="text-sm text-hud-gold underline-offset-2 hover:text-hud-gold-bright hover:underline" onClick={() => play.openMap(m.id)}>
                              {m.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </HudPanel>
                  ) : null}
                  <HudPanel as="div">
                    <h2 className="mb-1 text-sm font-medium text-hud-ink">{t("travel.log")}</h2>
                    <TravelLog campaignId={campaignId} />
                  </HudPanel>
                </div>
              </div>
            </>
          );
        }}
      </QueryState>
    </HudPage>
  );
}
