'use client';

import { useTranslations } from 'next-intl';
import { Map as MapIcon } from 'lucide-react';

import { EmptyState, QueryState } from '@/components/common/states';
import { HudToggleChip } from '@/components/hud';
import { HudPage, HudPageHeader } from '@/components/hud/page';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DmMarkerBubble } from '@/components/world/editor/DmMarkerBubble';
import { EnemyCard } from '@/components/world/editor/EnemyCard';
import { LayersPanel } from '@/components/world/editor/layers/LayersPanel';
import { NewWorldMapDialog } from '@/components/world/editor/maps/NewWorldMapDialog';
import { WorldMapSettings } from '@/components/world/editor/maps/WorldMapSettings';
import { ModeSwitch } from '@/components/world/editor/ModeSwitch';
import { HeroEyesSelect } from '@/components/world/editor/panels/HeroEyesSelect';
import { WorldMarkerPanel } from '@/components/world/editor/panels/WorldMarkerPanel';
import { WorldBreadcrumbs } from '@/components/world/editor/WorldBreadcrumbs';
import { WorldEditorContext } from '@/components/world/editor/WorldEditorContext';
import {
    WorldToolbar,
    WorldToolHint,
} from '@/components/world/editor/WorldToolbar';
import { WorldMapView } from '@/components/world/map/WorldMapView';
import { CompassRose } from '@/components/world/marker-icons';
import { LayerLegend } from '@/components/world/nav/LayerLegend';
import { MapTree } from '@/components/world/nav/MapTree';
import { TrailBubble } from '@/components/world/nav/TrailBubble';
import { TrailLegend } from '@/components/world/nav/TrailLegend';
import { SessionsPanel } from '@/components/world/travel/SessionsPanel';
import { TargetMark } from '@/components/world/travel/TargetMark';
import { TravelPanel } from '@/components/world/travel/TravelPanel';
import { useMediaQuery } from '@/lib/hooks/common';
import { DESKTOP_QUERY } from '@/lib/hooks/common';
import {
    type TravelMoved,
    useHeroSelection,
    useTrailView,
    useWorldEditorPage,
    useWorldSessions,
    useWorldTrail,
    useWorldTravel,
} from '@/lib/hooks/world';
import { viewToMapProps } from '@/lib/utils/world/view-props';

const ENTRY_COMPASS = {
    width: '3.2%',
    aspectRatio: '1',
    transform: 'translate(-50%, -50%)',
} as const;

const FRAME_HEIGHT =
    'lg:flex lg:h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:flex-col';

const MAP_HEIGHT =
    'h-[calc(100dvh-var(--app-header-h,89px)-9rem)] lg:h-auto lg:min-h-0 lg:flex-1';

export function WorldEditorPageClient({
    campaignId,
    campaignName,
    mapId,
    initialSelectedId,
}: {
    campaignId: string;
    campaignName: string;
    mapId: string | null;
    initialSelectedId?: string;
}) {
    const t = useTranslations('world');

    const isDesktop = useMediaQuery(DESKTOP_QUERY);

    const {
        ctx,
        data: { maps, detail, roster },
        tools: { eyes, drawing, moveTarget, snap, mode },
        selected: { id: selectedId, select, close: closePanel },
        dialogs: { create: creating, details, tree },
        actions: { openMap, changeEyes },
        handlers,
        card: bubbleCard,
        enemy,
        layers,
    } = useWorldEditorPage({ campaignId, mapId, initialSelectedId });

    const { tool, setTool } = drawing;

    const trail = useTrailView(
        useWorldTrail(campaignId, mapId).data,
        detail.data ? detail.data.map.width / detail.data.map.height : 1
    );

    const sessions = useWorldSessions(campaignId);

    const heroSelection = useHeroSelection(roster.heroes);

    const { travel } = useWorldTravel(campaignId);

    const trailBubble = trail.selected ? (
        <TrailBubble
            selected={trail.selected}
            embedded={!isDesktop}
            onClose={trail.clear}
        />
    ) : null;

    const emptyView = (
        <>
            <HudPageHeader title={t('title')} subtitle={campaignName} />
            <EmptyState
                icon={MapIcon}
                title={t('editor.emptyTitle')}
                description={t('editor.emptyDescription')}
                action={
                    <Button onClick={() => creating.set(true)}>
                        {t('editor.upload')}
                    </Button>
                }
            />
        </>
    );

    const treeShown = isDesktop ? (tree.open ?? true) : tree.open === true;

    const mapTree = (
        <MapTree
            maps={maps.data ?? []}
            activeId={mapId}
            onOpen={(id) => {
                openMap(id);

                if (!isDesktop) tree.set(false);
            }}
        />
    );

    const layersPanel = (
        <LayersPanel
            campaignId={campaignId}
            layers={layers.items}
            activeId={layers.active.id}
            onActive={layers.active.set}
            heroes={roster.heroes}
            imageEdit={layers.imageEdit}
        />
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
                                    const { marker } = bubbleCard;

                                    const building =
                                        tool === 'select' && !eyes.asHeroId;

                                    const detailsOpen =
                                        building && details.open;

                                    const layersShown =
                                        mode.value === 'build' &&
                                        !eyes.asHeroId &&
                                        layers.panel.open;

                                    const bubble =
                                        bubbleCard.open && marker ? (
                                            <DmMarkerBubble
                                                key={marker.id}
                                                marker={marker}
                                                actions={{
                                                    onMore: () =>
                                                        details.set(true),
                                                    onClose: closePanel,
                                                }}
                                            />
                                        ) : null;

                                    const enemyCard =
                                        enemy.selected && enemy.card ? (
                                            <EnemyCard
                                                key={enemy.selected.id}
                                                enemy={enemy.selected}
                                                actions={enemy.card.actions}
                                                embedded={!isDesktop}
                                            />
                                        ) : null;

                                    const card =
                                        trailBubble &&
                                        trail.selected &&
                                        isDesktop
                                            ? {
                                                  point: trail.selected.node,
                                                  content: trailBubble,
                                              }
                                            : enemyCard &&
                                                enemy.card &&
                                                isDesktop
                                              ? {
                                                    point: enemy.card.point,
                                                    content: enemyCard,
                                                }
                                              : bubble &&
                                                  bubbleCard.point &&
                                                  isDesktop
                                                ? {
                                                      point: bubbleCard.point,
                                                      content: bubble,
                                                  }
                                                : undefined;

                                    const panel = marker ? (
                                        <WorldMarkerPanel />
                                    ) : (
                                        <WorldMapSettings key={d.map.id} />
                                    );

                                    return (
                                        <>
                                            <HudPageHeader
                                                title={t('title')}
                                                subtitle={
                                                    <WorldBreadcrumbs
                                                        mapId={d.map.id}
                                                    />
                                                }
                                                actions={
                                                    <span className="hidden text-sm text-hud-muted md:inline">
                                                        {campaignName}
                                                    </span>
                                                }
                                                className="max-md:p-2 max-md:[&_h1]:sr-only"
                                            />
                                            <div className={FRAME_HEIGHT}>
                                                <div className="mb-2 shrink-0">
                                                    <WorldToolbar
                                                        drawing={drawing}
                                                        mode={mode.value}
                                                        snap={snap}
                                                        readOnly={
                                                            !!eyes.asHeroId
                                                        }
                                                        onSettings={() => {
                                                            select(null);
                                                            details.set(true);
                                                        }}
                                                    >
                                                        <HudToggleChip
                                                            tall
                                                            active={treeShown}
                                                            onClick={() =>
                                                                tree.set(
                                                                    !treeShown
                                                                )
                                                            }
                                                        >
                                                            {t('tree.toggle')}
                                                        </HudToggleChip>
                                                        {mode.value === 'build' &&
                                                        !eyes.asHeroId ? (
                                                            <HudToggleChip
                                                                tall
                                                                active={
                                                                    layers.panel
                                                                        .open
                                                                }
                                                                onClick={() =>
                                                                    layers.panel.set(
                                                                        !layers
                                                                            .panel
                                                                            .open
                                                                    )
                                                                }
                                                            >
                                                                {t(
                                                                    'layers.toggle'
                                                                )}
                                                            </HudToggleChip>
                                                        ) : null}
                                                        <ModeSwitch
                                                            value={mode.value}
                                                            onChange={mode.set}
                                                        />
                                                        <HeroEyesSelect
                                                            heroes={
                                                                roster.heroes
                                                            }
                                                            value={
                                                                eyes.asHeroId
                                                            }
                                                            onChange={
                                                                changeEyes
                                                            }
                                                        />
                                                    </WorldToolbar>
                                                </div>
                                                <div className="flex min-h-0 flex-col gap-2 lg:flex-1 lg:flex-row">
                                                    {isDesktop && treeShown ? (
                                                        <aside className="hud-surface w-52 shrink-0 overflow-y-auto rounded-md border border-hud-rule p-1">
                                                            {mapTree}
                                                        </aside>
                                                    ) : null}
                                                    {isDesktop && layersShown ? (
                                                        <aside className="hud-surface w-64 shrink-0 overflow-y-auto rounded-md border border-hud-rule p-2">
                                                            {layersPanel}
                                                        </aside>
                                                    ) : null}
                                                    <div
                                                        className={`relative ${MAP_HEIGHT} lg:min-w-0`}
                                                    >
                                                        {eyes.asHeroId ? (
                                                            <QueryState
                                                                query={
                                                                    eyes.view
                                                                }
                                                            >
                                                                {(v) => {
                                                                    const p =
                                                                        viewToMapProps(
                                                                            v
                                                                        );

                                                                    return (
                                                                        <WorldMapView
                                                                            key={`${v.map.id}:${eyes.asHeroId}`}
                                                                            detail={
                                                                                p.detail
                                                                            }
                                                                            heroes={
                                                                                p.heroes
                                                                            }
                                                                            fog={
                                                                                p.fog
                                                                            }
                                                                            layers={
                                                                                eyes.layers
                                                                            }
                                                                            compact={
                                                                                !isDesktop
                                                                            }
                                                                            slots={{
                                                                                hint: (
                                                                                    <p
                                                                                        role="status"
                                                                                        className="pointer-events-none rounded-md border border-[var(--gold)]/60 bg-black/80 px-3 py-1.5 text-xs text-hud-ink"
                                                                                    >
                                                                                        {t(
                                                                                            'eyes.player'
                                                                                        )}
                                                                                    </p>
                                                                                ),
                                                                            }}
                                                                        />
                                                                    );
                                                                }}
                                                            </QueryState>
                                                        ) : (
                                                            <WorldMapView
                                                                key={d.map.id}
                                                                detail={d}
                                                                layers={{
                                                                    items: layers.items,
                                                                    hidden: layers
                                                                        .visibility
                                                                        .hidden,
                                                                    edit:
                                                                        mode.value ===
                                                                        'build'
                                                                            ? {
                                                                                  layerId:
                                                                                      layers
                                                                                          .imageEdit
                                                                                          .layerId,
                                                                                  onRectChange:
                                                                                      layers.onRectChange,
                                                                              }
                                                                            : undefined,
                                                                }}
                                                                heroes={
                                                                    d.heroes
                                                                }
                                                                dragHeroes={
                                                                    tool ===
                                                                    'move'
                                                                        ? {
                                                                              selected:
                                                                                  heroSelection.selected,
                                                                              onDrop: (
                                                                                  ids,
                                                                                  to
                                                                              ) =>
                                                                                  !travel.isPending &&
                                                                                  void travel.mutateOk(
                                                                                      {
                                                                                          mapId: d
                                                                                              .map
                                                                                              .id,
                                                                                          characterIds:
                                                                                              ids,
                                                                                          to,
                                                                                          rest: 'none',
                                                                                      }
                                                                                  ),
                                                                          }
                                                                        : undefined
                                                                }
                                                                trails={{
                                                                    trails: trail.trails,
                                                                    sessions:
                                                                        trail.sessions,
                                                                    visible:
                                                                        trail.visible,
                                                                    selectedEntryId:
                                                                        trail
                                                                            .selected
                                                                            ?.entryId,
                                                                    onSelect:
                                                                        trail.select,
                                                                }}
                                                                enemies={
                                                                    d.enemies
                                                                }
                                                                selectedId={
                                                                    enemy
                                                                        .selected
                                                                        ?.id ??
                                                                    selectedId
                                                                }
                                                                edit={{
                                                                    tool,
                                                                    draft: drawing.draft,
                                                                    snap,
                                                                }}
                                                                compact={
                                                                    !isDesktop
                                                                }
                                                                handlers={
                                                                    handlers
                                                                }
                                                                slots={{
                                                                    hint: (
                                                                        <WorldToolHint
                                                                            tool={
                                                                                tool
                                                                            }
                                                                            vertices={
                                                                                drawing
                                                                                    .draft
                                                                                    .length
                                                                            }
                                                                        />
                                                                    ),
                                                                    card,
                                                                    overlay: (
                                                                        <>
                                                                            <CompassRose
                                                                                className="atlas-compass pointer-events-none absolute"
                                                                                style={{
                                                                                    ...ENTRY_COMPASS,
                                                                                    left: `${d.map.entryX * 100}%`,
                                                                                    top: `${d.map.entryY * 100}%`,
                                                                                }}
                                                                            />
                                                                            {moveTarget.point ? (
                                                                                <TargetMark
                                                                                    point={
                                                                                        moveTarget.point
                                                                                    }
                                                                                />
                                                                            ) : null}
                                                                        </>
                                                                    ),
                                                                }}
                                                            />
                                                        )}
                                                        {eyes.asHeroId ? (
                                                            <div className="absolute top-2 left-2 z-10 max-w-[calc(100%-4rem)]">
                                                                <LayerLegend
                                                                    layers={
                                                                        eyes
                                                                            .layers
                                                                            .items
                                                                    }
                                                                    hidden={
                                                                        eyes
                                                                            .layers
                                                                            .hidden
                                                                    }
                                                                    onToggle={
                                                                        eyes
                                                                            .layers
                                                                            .toggle
                                                                    }
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="absolute top-2 left-2 z-10 flex max-w-[calc(100%-4rem)] flex-col items-start gap-1">
                                                                <LayerLegend
                                                                    layers={
                                                                        layers.items
                                                                    }
                                                                    hidden={
                                                                        layers
                                                                            .visibility
                                                                            .hidden
                                                                    }
                                                                    onToggle={
                                                                        layers
                                                                            .visibility
                                                                            .toggle
                                                                    }
                                                                />
                                                                <TrailLegend
                                                                    trails={
                                                                        trail.trails
                                                                    }
                                                                    sessions={
                                                                        trail.sessions
                                                                    }
                                                                    visible={
                                                                        trail.visible
                                                                    }
                                                                    onToggle={
                                                                        trail.toggle
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                        {tool === 'zone' &&
                                                        drawing.draft.length >
                                                            0 ? (
                                                            <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    disabled={
                                                                        drawing
                                                                            .draft
                                                                            .length <
                                                                        3
                                                                    }
                                                                    onClick={
                                                                        drawing.finish
                                                                    }
                                                                >
                                                                    {t(
                                                                        'toolbar.done'
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={
                                                                        drawing.cancel
                                                                    }
                                                                >
                                                                    {t(
                                                                        'toolbar.cancel'
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    {isDesktop &&
                                                    detailsOpen ? (
                                                        <aside className="hud-surface rounded-md border border-hud-rule p-3 lg:w-80 lg:shrink-0 lg:overflow-y-auto">
                                                            <div className="mb-2 flex justify-end">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={
                                                                        closePanel
                                                                    }
                                                                >
                                                                    {t(
                                                                        'editor.closePanel'
                                                                    )}
                                                                </Button>
                                                            </div>
                                                            {panel}
                                                        </aside>
                                                    ) : null}
                                                    {tool === 'move' &&
                                                    !eyes.asHeroId ? (
                                                        <div className="flex flex-col gap-2 lg:w-80 lg:shrink-0 lg:overflow-y-auto">
                                                            <TravelPanel
                                                                campaignId={
                                                                    campaignId
                                                                }
                                                                mapId={d.map.id}
                                                                heroes={
                                                                    roster.heroes
                                                                }
                                                                onMapIds={(
                                                                    d.heroes ??
                                                                    []
                                                                ).map(
                                                                    (h) => h.id
                                                                )}
                                                                target={
                                                                    moveTarget.point
                                                                }
                                                                selectedMarker={
                                                                    moveTarget.marker
                                                                }
                                                                hasActiveSession={
                                                                    !!sessions.active
                                                                }
                                                                selection={
                                                                    heroSelection
                                                                }
                                                                actions={{
                                                                    onPickTarget:
                                                                        () =>
                                                                            setTool(
                                                                                'move'
                                                                            ),
                                                                    onMoved: (
                                                                        e: TravelMoved
                                                                    ) =>
                                                                        e.kind !==
                                                                            'travel' &&
                                                                        openMap(
                                                                            e.destMapId,
                                                                            {
                                                                                keepTool: true,
                                                                            }
                                                                        ),
                                                                }}
                                                            />
                                                            <SessionsPanel
                                                                campaignId={
                                                                    campaignId
                                                                }
                                                            />
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                            {isDesktop ? null : (
                                                <>
                                                    <ResponsiveDialog
                                                        hud
                                                        open={detailsOpen}
                                                        onOpenChange={(
                                                            open
                                                        ) => {
                                                            if (!open)
                                                                closePanel();
                                                        }}
                                                        title={
                                                            marker?.name ??
                                                            d.map.name
                                                        }
                                                        description={
                                                            marker
                                                                ? t(
                                                                      'editor.markerParams'
                                                                  )
                                                                : t(
                                                                      'editor.mapParams'
                                                                  )
                                                        }
                                                    >
                                                        {panel}
                                                    </ResponsiveDialog>
                                                    <ResponsiveDialog
                                                        hud
                                                        open={!!bubble}
                                                        onOpenChange={(
                                                            open
                                                        ) => {
                                                            if (!open)
                                                                closePanel();
                                                        }}
                                                        title={marker?.name}
                                                    >
                                                        {bubble}
                                                    </ResponsiveDialog>
                                                    <ResponsiveDialog
                                                        hud
                                                        open={!!enemyCard}
                                                        onOpenChange={(
                                                            open
                                                        ) => {
                                                            if (!open)
                                                                enemy.card?.actions.onClose();
                                                        }}
                                                        title={
                                                            enemy.selected?.name
                                                        }
                                                    >
                                                        {enemyCard}
                                                    </ResponsiveDialog>
                                                    <ResponsiveDialog
                                                        hud
                                                        open={!!trailBubble}
                                                        onOpenChange={(
                                                            open
                                                        ) => {
                                                            if (!open)
                                                                trail.clear();
                                                        }}
                                                        title={
                                                            trail.selected
                                                                ?.session
                                                                ?.name ??
                                                            t('trail.noSession')
                                                        }
                                                    >
                                                        {trailBubble}
                                                    </ResponsiveDialog>
                                                    <ResponsiveDialog
                                                        hud
                                                        open={layersShown}
                                                        onOpenChange={
                                                            layers.panel.set
                                                        }
                                                        title={t(
                                                            'layers.title'
                                                        )}
                                                    >
                                                        {layersPanel}
                                                    </ResponsiveDialog>
                                                    <ResponsiveDialog
                                                        hud
                                                        open={treeShown}
                                                        onOpenChange={tree.set}
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
                        ) : (
                            emptyView
                        )
                    }
                </QueryState>
                <NewWorldMapDialog
                    open={creating.open}
                    onOpenChange={creating.set}
                />
            </HudPage>
        </WorldEditorContext.Provider>
    );
}
