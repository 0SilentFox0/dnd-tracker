'use client';

import { useTranslations } from 'next-intl';
import { Map as MapIcon } from 'lucide-react';

import { EmptyState, QueryState } from '@/components/common/states';
import { HudToggleChip } from '@/components/hud';
import {
    HudChipTabs,
    HudPage,
    HudPageHeader,
    HudPanel,
} from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Disclosure } from '@/components/ui/disclosure';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { WorldMapView } from '@/components/world/map/WorldMapView';
import { MapTree } from '@/components/world/nav/MapTree';
import { PlaceSearchBar } from '@/components/world/nav/PlaceSearchBar';
import { WorldCrumbs } from '@/components/world/nav/WorldCrumbs';
import { WorldNotesPanel } from '@/components/world/notes/WorldNotesPanel';
import { PlayerMarkerBubble } from '@/components/world/play/PlayerMarkerBubble';
import { TravelLog } from '@/components/world/travel/TravelLog';
import { useMediaQuery } from '@/lib/hooks/common';
import { DESKTOP_QUERY } from '@/lib/hooks/common';
import { usePusherShowSync } from '@/lib/hooks/show';
import { useWorldPlay } from '@/lib/hooks/world';
import { viewToMapProps } from '@/lib/utils/world/view-props';

const MAP_HEIGHT =
    'h-[calc(100dvh-var(--app-header-h,89px)-9rem)] min-h-[20rem]';

export function WorldPlayClient({
    campaignId,
    campaignName,
    mapId,
}: {
    campaignId: string;
    campaignName: string;
    mapId: string | null;
}) {
    const play = useWorldPlay(campaignId, mapId);

    const t = useTranslations('world');

    usePusherShowSync(campaignId, !!mapId);

    const isDesktop = useMediaQuery(DESKTOP_QUERY);

    if (!mapId) {
        return (
            <HudPage>
                <HudPageHeader title={t('title')} subtitle={campaignName} />
                <EmptyState
                    icon={MapIcon}
                    title={t('play.emptyTitle')}
                    description={t('play.emptyDescription')}
                />
            </HudPage>
        );
    }

    return (
        <HudPage>
            <OnboardingHint id="player.world" />
            <QueryState query={play.view}>
                {(view) => {
                    const props = viewToMapProps(view);

                    const marker = play.selectedMarker;

                    const mapTree = (
                        <MapTree
                            maps={view.maps}
                            activeId={view.map.id}
                            onOpen={play.openMap}
                        />
                    );

                    const journal = (
                        <>
                            {play.myHeroes.length > 0 ? (
                                <HudPanel as="div">
                                    <h2 className="mb-1 text-sm font-medium text-hud-ink">
                                        {t('play.myHeroes')}
                                    </h2>
                                    <HudChipTabs
                                        ariaLabel={t('play.myHeroes')}
                                        items={play.myHeroes.map((h) => ({
                                            key: h.id,
                                            label: h.name,
                                            active: false,
                                            onSelect: () => play.focusHero(h),
                                        }))}
                                    />
                                </HudPanel>
                            ) : null}
                            <HudPanel as="div" data-tour="world.journal">
                                <h2 className="mb-1 text-sm font-medium text-hud-ink">
                                    {t('travel.log')}
                                </h2>
                                <TravelLog campaignId={campaignId} />
                            </HudPanel>
                        </>
                    );

                    const notes = marker ? (
                        <WorldNotesPanel
                            campaignId={campaignId}
                            mapId={view.map.id}
                            marker={marker}
                            notes={view.notes}
                            heroes={play.myHeroes}
                        />
                    ) : null;

                    return (
                        <>
                            <HudPageHeader
                                title={t('title')}
                                subtitle={
                                    <span data-tour="world.crumbs">
                                        <WorldCrumbs
                                            maps={view.maps}
                                            mapId={view.map.id}
                                            onOpen={play.openMap}
                                        />
                                    </span>
                                }
                                actions={
                                    <span className="hidden text-sm text-hud-muted md:inline">
                                        {campaignName}
                                    </span>
                                }
                            />
                            {isDesktop ? null : (
                                <div className="flex gap-2">
                                    <HudToggleChip
                                        tall
                                        active={play.tree.open}
                                        onClick={() =>
                                            play.tree.set(!play.tree.open)
                                        }
                                    >
                                        {t('tree.toggle')}
                                    </HudToggleChip>
                                </div>
                            )}
                            <div className="grid gap-3 lg:grid-cols-[11rem_minmax(0,1fr)_20rem]">
                                {isDesktop ? (
                                    <aside
                                        data-tour="world.places"
                                        className="hud-surface overflow-y-auto rounded-md border border-hud-rule p-1 lg:max-h-[calc(100dvh-var(--app-header-h,89px)-9rem)]"
                                    >
                                        {mapTree}
                                    </aside>
                                ) : null}
                                <div className="flex min-w-0 flex-col gap-2">
                                    <PlaceSearchBar
                                        markers={view.markers}
                                        onPick={play.pickPlace}
                                    />
                                    <div
                                        className={MAP_HEIGHT}
                                        data-tour="world.map"
                                    >
                                        <WorldMapView
                                            key={view.map.id}
                                            detail={props.detail}
                                            heroes={props.heroes}
                                            fog={props.fog}
                                            focus={play.focus}
                                            selectedId={marker?.id}
                                            compact={!isDesktop}
                                            handlers={play.handlers}
                                            slots={{
                                                card:
                                                    marker &&
                                                    play.card.point &&
                                                    !(
                                                        isDesktop &&
                                                        play.details.open
                                                    )
                                                    ? {
                                                          point: play.card
                                                              .point,
                                                          content: (
                                                              <PlayerMarkerBubble
                                                                  key={
                                                                      marker.id
                                                                  }
                                                                  marker={
                                                                      marker
                                                                  }
                                                                  actions={{
                                                                      onMore: () =>
                                                                          play.details.set(
                                                                              true
                                                                          ),
                                                                      onOpenMap:
                                                                          play
                                                                              .card
                                                                              .canOpenChild
                                                                              ? () =>
                                                                                    play.openChild(
                                                                                        marker.id
                                                                                    )
                                                                              : undefined,
                                                                      onClose:
                                                                          () =>
                                                                              play.select(
                                                                                  null
                                                                              ),
                                                                  }}
                                                              />
                                                          ),
                                                      }
                                                    : undefined,
                                            }}
                                        />
                                    </div>
                                </div>
                                {isDesktop ? (
                                    <div className="flex flex-col gap-3 lg:max-h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:overflow-y-auto">
                                        {marker && play.details.open ? (
                                            notes
                                        ) : (
                                            <HudPanel as="div">
                                                <p className="text-sm text-hud-muted">
                                                    {t('play.pickMarker')}
                                                </p>
                                            </HudPanel>
                                        )}
                                        {journal}
                                    </div>
                                ) : (
                                    <Disclosure
                                        summary={t('play.journal')}
                                        className="hud-surface rounded-md border border-hud-rule p-2"
                                        contentClassName="mt-2 flex flex-col gap-3"
                                    >
                                        {journal}
                                    </Disclosure>
                                )}
                            </div>
                            {isDesktop ? null : (
                                <>
                                    <ResponsiveDialog
                                        hud
                                        open={!!marker && play.details.open}
                                        onOpenChange={play.details.set}
                                        title={marker?.name ?? ''}
                                    >
                                        {notes}
                                    </ResponsiveDialog>
                                    <ResponsiveDialog
                                        hud
                                        open={play.tree.open}
                                        onOpenChange={play.tree.set}
                                        title={t('tree.label')}
                                    >
                                        {mapTree}
                                    </ResponsiveDialog>
                                </>
                            )}
                        </>
                    );
                }}
            </QueryState>
        </HudPage>
    );
}
