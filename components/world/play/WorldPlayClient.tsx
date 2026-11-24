'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, Map as MapIcon } from 'lucide-react';

import { EmptyState, QueryState } from '@/components/common/states';
import { HudButton } from '@/components/hud';
import {
    HudChipTabs,
    HudPage,
    HudPageHeader,
    HudPanel,
} from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { WorldMapView } from '@/components/world/map/WorldMapView';
import { LayerLegend } from '@/components/world/nav/LayerLegend';
import { MapTree } from '@/components/world/nav/MapTree';
import { TrailBubble } from '@/components/world/nav/TrailBubble';
import { TrailLegend } from '@/components/world/nav/TrailLegend';
import { WorldCrumbs } from '@/components/world/nav/WorldCrumbs';
import { WorldFilterLegend } from '@/components/world/nav/WorldFilterLegend';
import {
    WorldJourneyHud,
    WorldMapLegend,
    WorldSceneHeading,
} from '@/components/world/nav/WorldJourneyHud';
import { WorldNotesPanel } from '@/components/world/notes/WorldNotesPanel';
import { PlayerMarkerBubble } from '@/components/world/play/PlayerMarkerBubble';
import { TravelLog } from '@/components/world/travel/TravelLog';
import { useMediaQuery } from '@/lib/hooks/common';
import { DESKTOP_QUERY } from '@/lib/hooks/common';
import { usePusherShowSync } from '@/lib/hooks/show';
import { useTrailView, useWorldPlay, useWorldTrail } from '@/lib/hooks/world';
import { applyLayerStyle } from '@/lib/utils/world/marker-style';
import { pickCard } from '@/lib/utils/world/pick-card';
import { viewToMapProps } from '@/lib/utils/world/view-props';

export function WorldPlayClient({
    campaignId,
    campaignName,
    mapId,
    markerId,
}: {
    campaignId: string;
    campaignName: string;
    mapId: string | null;
    markerId?: string;
}) {
    const play = useWorldPlay(campaignId, mapId, markerId);

    const [journalOpen, setJournalOpen] = useState(false);

    const t = useTranslations('world');

    const trail = useTrailView(
        useWorldTrail(campaignId, mapId).data,
        play.view.data
            ? play.view.data.map.width / play.view.data.map.height
            : 1
    );

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
        <HudPage className="world-game-page">
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

                    const bubble =
                        marker && !play.details.open ? (
                            <PlayerMarkerBubble
                                key={marker.id}
                                marker={
                                    applyLayerStyle(
                                        [marker],
                                        play.layers.items
                                    )[0]
                                }
                                embedded={!isDesktop}
                                actions={{
                                    onMore: play.openDetails,
                                    onOpenMap: play.card.canOpenChild
                                        ? () => play.openChild(marker.id)
                                        : undefined,
                                    onClose: () => play.select(null),
                                }}
                            />
                        ) : null;

                    const trailBubble = trail.selected ? (
                        <TrailBubble
                            selected={trail.selected}
                            embedded={!isDesktop}
                            onClose={trail.clear}
                        />
                    ) : null;

                    const notes = marker ? (
                        <WorldNotesPanel
                            campaignId={campaignId}
                            mapId={view.map.id}
                            marker={marker}
                            notes={view.notes}
                            heroes={play.myHeroes}
                        />
                    ) : null;

                    const crumbs = (
                        <span data-tour="world.crumbs">
                            <WorldCrumbs
                                maps={view.maps}
                                mapId={view.map.id}
                                onOpen={play.openMap}
                            />
                        </span>
                    );

                    return (
                        <>
                            <div className="world-game-play-grid">
                                <div className="world-game-play-column flex min-w-0 flex-col">
                                    <div
                                        className={
                                            play.fullscreen.full
                                                ? 'fixed inset-0 z-50 h-dvh bg-black'
                                                : 'world-game-viewport relative'
                                        }
                                        role={
                                            play.fullscreen.full
                                                ? 'region'
                                                : undefined
                                        }
                                        aria-label={
                                            play.fullscreen.full
                                                ? t('zoom.fullscreen')
                                                : undefined
                                        }
                                        data-tour="world.map"
                                    >
                                        {(play.layers.items.length > 0 ||
                                            trail.trails.length > 0) && (
                                            <WorldFilterLegend compact={!isDesktop}>
                                                <LayerLegend
                                                    layers={play.layers.items}
                                                    hidden={play.layers.hidden}
                                                    onToggle={
                                                        play.layers.toggle
                                                    }
                                                    showUnlayered={
                                                        play.layers
                                                            .showUnlayered
                                                    }
                                                />
                                                <TrailLegend
                                                    trails={trail.trails}
                                                    sessions={trail.sessions}
                                                    visible={trail.visible}
                                                    onToggle={trail.toggle}
                                                />
                                            </WorldFilterLegend>
                                        )}
                                        {(
                                            <>
                                                <WorldSceneHeading>
                                                    {crumbs}
                                                </WorldSceneHeading>
                                                <WorldJourneyHud
                                                    places={{
                                                        markers:
                                                            play.styledMarkers,
                                                        maps: view.maps,
                                                        hidden: play.layers
                                                            .hidden,
                                                        selectedId: marker?.id,
                                                    }}
                                                    actions={{
                                                        pickMarker:
                                                            play.pickPlace,
                                                        openMap: play.openMap,
                                                        openTree: () =>
                                                            play.tree.set(true),
                                                    }}
                                                    sections={
                                                        <HudButton
                                                            className="world-journey-icon"
                                                            aria-label={t(
                                                                'play.journal'
                                                            )}
                                                            title={t(
                                                                'play.journal'
                                                            )}
                                                            onClick={() =>
                                                                setJournalOpen(
                                                                    true
                                                                )
                                                            }
                                                        >
                                                            <BookOpen
                                                                aria-hidden
                                                                className="size-4 shrink-0"
                                                            />
                                                        </HudButton>
                                                    }
                                                />
                                                <WorldMapLegend
                                                    fog={view.fog}
                                                />
                                            </>
                                        )}
                                        <WorldMapView
                                            key={view.map.id}
                                            detail={props.detail}
                                            heroes={props.heroes}
                                            trails={{
                                                trails: trail.trails,
                                                sessions: trail.sessions,
                                                visible: trail.visible,
                                                selectedEntryId:
                                                    trail.selected?.entryId,
                                                onSelect: trail.select,
                                            }}
                                            fog={props.fog}
                                            layers={play.layers}
                                            focus={play.focus}
                                            className="rounded-none border-0"
                                            selectedId={marker?.id}
                                            compact={!isDesktop}
                                            handlers={play.handlers}
                                            slots={{
mode: 'own',
                                                fullscreen: {
                                                    full: play.fullscreen.full,
                                                    toggle: play.fullscreen
                                                        .toggle,
                                                },
                                                card: pickCard({
                                                    isDesktop,
                                                    trail:
                                                        trailBubble &&
                                                        trail.selected
                                                            ? {
                                                                  node: trail
                                                                      .selected
                                                                      .node,
                                                                  content:
                                                                      trailBubble,
                                                              }
                                                            : null,
                                                    marker: {
                                                        point: play.card.point,
                                                        content: bubble,
                                                    },
                                                }),
                                            }}
                                        />
                                    </div>
                                </div>
                                {isDesktop && marker && play.details.open ? (
                                    <aside className="world-glass world-game-side-panel world-game-details p-3">
                                        <HudButton
                                            className="min-h-11"
                                            onClick={() =>
                                                play.details.set(false)
                                            }
                                        >
                                            {t('editor.closePanel')}
                                        </HudButton>
                                        {notes}
                                    </aside>
                                ) : null}
                            </div>
                            <ResponsiveDialog
                                hud
                                open={journalOpen}
                                onOpenChange={setJournalOpen}
                                title={t('play.journal')}
                            >
                                <div className="flex flex-col gap-3">
                                    {journal}
                                </div>
                            </ResponsiveDialog>
                            <ResponsiveDialog
                                hud
                                open={play.tree.open}
                                onOpenChange={play.tree.set}
                                title={t('tree.label')}
                            >
                                <div className="world-game-tree-dialog">
                                    {mapTree}
                                </div>
                            </ResponsiveDialog>
                            {isDesktop ? null : (
                                <>
                                    <ResponsiveDialog
                                        hud
                                        open={!!bubble}
                                        onOpenChange={(open) => {
                                            if (!open) play.select(null);
                                        }}
                                        title={marker?.name}
                                    >
                                        {bubble}
                                    </ResponsiveDialog>
                                    <ResponsiveDialog
                                        hud
                                        open={!!trailBubble}
                                        onOpenChange={(open) => {
                                            if (!open) trail.clear();
                                        }}
                                        title={
                                            trail.selected?.session?.name ??
                                            t('trail.noSession')
                                        }
                                    >
                                        {trailBubble}
                                    </ResponsiveDialog>
                                    <ResponsiveDialog
                                        hud
                                        open={!!marker && play.details.open}
                                        onOpenChange={play.details.set}
                                        title={marker?.name ?? ''}
                                    >
                                        {notes}
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
