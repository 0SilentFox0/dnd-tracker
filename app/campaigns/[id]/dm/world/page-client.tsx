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
import { MapTree } from '@/components/world/MapTree';
import { CompassRose } from '@/components/world/marker-icons';
import { TargetMark } from '@/components/world/travel/TargetMark';
import { TravelPanel } from '@/components/world/travel/TravelPanel';
import { WorldMapView } from '@/components/world/WorldMapView';
import { useMediaQuery } from '@/lib/hooks/common';
import { DESKTOP_QUERY } from '@/lib/hooks/common';
import { type TravelMoved, useWorldEditorPage } from '@/lib/hooks/world';
import { polygonCentroid } from '@/lib/utils/world/geometry';
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
        tools: { eyes, drawing, moveTarget, editor, snap, mode },
        selected: { id: selectedId, select, close: closePanel },
        dialogs: { create: creating, details, tree },
        actions: { openMap, changeEyes, changeVertices },
    } = useWorldEditorPage({ campaignId, mapId, initialSelectedId });

    const { tool, setTool } = drawing;

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
            footer={
                maps.data?.length === 0 ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => creating.set(true)}
                    >
                        {t('tree.newMap')}
                    </Button>
                ) : undefined
            }
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
                                    const marker = selectedId
                                        ? d.markers.find(
                                              (m) => m.id === selectedId
                                          )
                                        : undefined;

                                    const building =
                                        tool === 'select' && !eyes.asHeroId;

                                    const detailsOpen =
                                        building && details.open;

                                    const bubbleOpen =
                                        building && !!marker && !details.open;

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
                                                                            compact={
                                                                                !isDesktop
                                                                            }
                                                                            hint={
                                                                                <p
                                                                                    role="status"
                                                                                    className="pointer-events-none rounded-md border border-[var(--gold)]/60 bg-black/80 px-3 py-1.5 text-xs text-hud-ink"
                                                                                >
                                                                                    {t(
                                                                                        'eyes.player'
                                                                                    )}
                                                                                </p>
                                                                            }
                                                                        />
                                                                    );
                                                                }}
                                                            </QueryState>
                                                        ) : (
                                                            <WorldMapView
                                                                key={d.map.id}
                                                                detail={d}
                                                                heroes={
                                                                    d.heroes
                                                                }
                                                                selectedId={
                                                                    selectedId
                                                                }
                                                                draft={
                                                                    drawing.draft
                                                                }
                                                                tool={tool}
                                                                compact={
                                                                    !isDesktop
                                                                }
                                                                hint={
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
                                                                }
                                                                snap={snap}
                                                                card={
                                                                    bubbleOpen &&
                                                                    marker
                                                                        ? {
                                                                              point:
                                                                                  marker.kind ===
                                                                                      'zone' &&
                                                                                  marker.polygon
                                                                                      ? polygonCentroid(
                                                                                            marker.polygon
                                                                                        )
                                                                                      : {
                                                                                            x: marker.x,
                                                                                            y: marker.y,
                                                                                        },
                                                                              content:
                                                                                  (
                                                                                      <DmMarkerBubble
                                                                                          key={
                                                                                              marker.id
                                                                                          }
                                                                                          marker={
                                                                                              marker
                                                                                          }
                                                                                          actions={{
                                                                                              onMore: () =>
                                                                                                  details.set(
                                                                                                      true
                                                                                                  ),
                                                                                              onClose:
                                                                                                  closePanel,
                                                                                          }}
                                                                                      />
                                                                                  ),
                                                                          }
                                                                        : undefined
                                                                }
                                                                handlers={{
                                                                    ...drawing.handlers,
                                                                    onVertexChange:
                                                                        changeVertices,
                                                                    onMapClick:
                                                                        (p) =>
                                                                            tool ===
                                                                            'select'
                                                                                ? select(
                                                                                      null
                                                                                  )
                                                                                : drawing.handlers.onMapClick(
                                                                                      p
                                                                                  ),
                                                                    onMarkerClick:
                                                                        (
                                                                            id
                                                                        ) => {
                                                                            if (
                                                                                tool ===
                                                                                'select'
                                                                            )
                                                                                select(
                                                                                    id
                                                                                );
                                                                            else if (
                                                                                tool ===
                                                                                    'move' &&
                                                                                !detail.isPlaceholderData
                                                                            )
                                                                                moveTarget.pickMarker(
                                                                                    id
                                                                                );
                                                                        },
                                                                    onMarkerDoubleClick:
                                                                        (
                                                                            id
                                                                        ) => {
                                                                            const child =
                                                                                d.markers.find(
                                                                                    (
                                                                                        m
                                                                                    ) =>
                                                                                        m.id ===
                                                                                        id
                                                                                )?.childMapId;

                                                                            if (
                                                                                child
                                                                            )
                                                                                openMap(
                                                                                    child
                                                                                );
                                                                        },
                                                                    onMarkerDrag:
                                                                        tool ===
                                                                            'select' ||
                                                                        tool ===
                                                                            'point'
                                                                            ? (
                                                                                  id,
                                                                                  p
                                                                              ) =>
                                                                                  void editor.marker.update.mutateOk(
                                                                                      {
                                                                                          id,
                                                                                          data: {
                                                                                              x: p.x,
                                                                                              y: p.y,
                                                                                          },
                                                                                      }
                                                                                  )
                                                                            : undefined,
                                                                }}
                                                                overlay={
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
                                                                }
                                                            />
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
                                                        <div className="lg:w-80 lg:shrink-0 lg:overflow-y-auto">
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
