'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    ArrowUpRight,
    Diamond,
    Map as MapIcon,
    MapPin,
    Search,
} from 'lucide-react';

import { HudButton } from '@/components/hud';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { MARKER_ICON } from '@/components/world/marker-icons';
import { PlaceSearchBar } from '@/components/world/nav/PlaceSearchBar';
import { NO_LAYER_KEY } from '@/lib/constants/world';
import type { WorldMapSummary, WorldMarker } from '@/types/world';

export function WorldJourneyHud({
    places,
    actions,
    sections,
}: {
    places: {
        markers: WorldMarker[];
        maps: WorldMapSummary[];
        hidden: ReadonlySet<string>;
        selectedId?: string | null;
    };
    actions: {
        pickMarker(id: string): void;
        openMap(id: string): void;
        openTree(): void;
    };
    sections?: ReactNode;
}) {
    const t = useTranslations('world');

    const [searchOpen, setSearchOpen] = useState(false);

    const [placesOpen, setPlacesOpen] = useState(false);

    const knownMaps = new Map(places.maps.map((map) => [map.id, map]));

    const markers = places.markers.filter(
        (marker) => !places.hidden.has(marker.layerId ?? NO_LAYER_KEY)
    );

    const rows = (
        <div className="world-journey-rows">
            {markers.map((marker) => {
                const child = marker.childMapId
                    ? knownMaps.get(marker.childMapId)
                    : undefined;

                const Icon =
                    (marker.icon && MARKER_ICON[marker.icon]) || Diamond;

                return (
                    <div
                        key={marker.id}
                        className="world-journey-result"
                        data-current={
                            marker.id === places.selectedId || undefined
                        }
                    >
                        <HudButton
                            className="world-journey-place"
                            aria-current={
                                marker.id === places.selectedId || undefined
                            }
                            onClick={() => {
                                setPlacesOpen(false);
                                actions.pickMarker(marker.id);
                            }}
                        >
                            <span className="world-journey-glyph">
                                <Icon aria-hidden className="size-4" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate font-semibold">
                                    {marker.name}
                                </span>
                                {child && (
                                    <span className="block truncate text-xs text-hud-muted">
                                        {child.name}
                                    </span>
                                )}
                            </span>
                        </HudButton>
                        {child && (
                            <HudButton
                                className="world-journey-icon world-journey-enter"
                                aria-label={`${t('bubble.openMap')}: ${child.name}`}
                                title={child.name}
                                onClick={() => {
                                    setPlacesOpen(false);
                                    actions.openMap(child.id);
                                }}
                            >
                                <ArrowUpRight aria-hidden className="size-4" />
                            </HudButton>
                        )}
                    </div>
                );
            })}
            {markers.length === 0 && (
                <p className="world-journey-empty text-sm text-hud-muted">
                    {t('journey.empty')}
                </p>
            )}
        </div>
    );

    return (
        <nav
            data-tour="world.places"
            className="world-journey world-glass"
            aria-label={t('journey.title')}
        >
            <div className="world-journey-header">
                <h2 className="world-journey-heading">{t('journey.title')}</h2>
                <div className="world-journey-sections">
                    <HudButton
                        className="world-journey-icon"
                        aria-label={t('tree.toggle')}
                        title={t('tree.toggle')}
                        onClick={actions.openTree}
                    >
                        <MapIcon aria-hidden className="size-4" />
                    </HudButton>
                    <HudButton
                        className="world-journey-icon"
                        aria-label={t('search.label')}
                        title={t('search.label')}
                        onClick={() => setSearchOpen(true)}
                    >
                        <Search aria-hidden className="size-4" />
                    </HudButton>
                    <HudButton
                        className="world-journey-icon world-journey-mobile-places"
                        aria-label={t('journey.title')}
                        title={t('journey.title')}
                        aria-haspopup="dialog"
                        aria-expanded={placesOpen}
                        onClick={() => setPlacesOpen(true)}
                    >
                        <MapPin aria-hidden className="size-4" />
                    </HudButton>
                    {sections}
                </div>
            </div>
            <div className="world-journey-inline">{rows}</div>
            {placesOpen && (
                <ResponsiveDialog
                    hud
                    open
                    onOpenChange={setPlacesOpen}
                    title={t('journey.title')}
                >
                    <div className="world-journey-sheet">
                        {rows}
                        {markers.length === 0 && (
                            <HudButton
                                className="world-journey-place"
                                onClick={() => {
                                    setPlacesOpen(false);
                                    actions.openTree();
                                }}
                            >
                                <MapIcon aria-hidden className="size-4" />
                                {t('tree.toggle')}
                            </HudButton>
                        )}
                    </div>
                </ResponsiveDialog>
            )}
            {searchOpen && (
                <ResponsiveDialog
                    hud
                    open
                    onOpenChange={setSearchOpen}
                    title={t('search.label')}
                >
                    <div className="world-journey-search">
                        <PlaceSearchBar
                            markers={markers}
                            onPick={(id) => {
                                setSearchOpen(false);
                                actions.pickMarker(id);
                            }}
                        />
                    </div>
                </ResponsiveDialog>
            )}
        </nav>
    );
}

export function WorldSceneHeading({ children }: { children: ReactNode }) {
    const t = useTranslations('world');

    return (
        <div className="world-scene-heading world-glass">
            <h1 className="sr-only">{t('title')}</h1>
            {children}
        </div>
    );
}

export function WorldMapLegend({ fog }: { fog: boolean }) {
    const t = useTranslations('world.journey');

    return (
        <ul className="world-map-legend world-glass" aria-label={t('legend')}>
            <li>
                <span
                    aria-hidden
                    className="world-map-symbol world-map-symbol-party"
                />
                {t('party')}
            </li>
            <li>
                <span aria-hidden className="world-map-symbol" />
                {t('known')}
            </li>
            {fog && (
                <li>
                    <span
                        aria-hidden
                        className="world-map-symbol world-map-symbol-fog"
                    />
                    {t('unexplored')}
                </li>
            )}
        </ul>
    );
}
