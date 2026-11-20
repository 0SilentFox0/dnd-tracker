'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, MapPin } from 'lucide-react';

import { SearchInput } from '@/components/common/fields/SearchInput';
import {
    EmptyState,
    ErrorState,
    LoadingState,
} from '@/components/common/states';
import { SearchEmptyState } from '@/components/common/states/SearchEmptyState';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { WorldMapLink } from '@/components/world/WorldMapLink';
import { DESKTOP_QUERY, useMediaQuery, useSearch } from '@/lib/hooks/common';
import { useWorldMap, useWorldMaps } from '@/lib/hooks/world';
import { treeDepth, treeOrder } from '@/lib/utils/world/tree';
import type { ScenarioMarkerRef } from '@/types/scenario';
import type { WorldMarker } from '@/types/world';

interface Props {
    campaignId: string;
    open: boolean;
    onOpenChange(open: boolean): void;
    onPick(ref: ScenarioMarkerRef): void;
    excludeMapIds?: string[];
    markerFilter?: (m: WorldMarker) => boolean;
    title?: string;
}

const markerFields = (m: WorldMarker) => [m.name];

function MarkerList({
    campaignId,
    mapId,
    onPick,
    markerFilter,
}: {
    campaignId: string;
    mapId: string;
    onPick(markerId: string): void;
    markerFilter?: (m: WorldMarker) => boolean;
}) {
    const t = useTranslations('scenario.markerPicker');

    const { data, isLoading, isError, error, refetch } = useWorldMap(
        campaignId,
        mapId
    );

    const markers = useMemo(
        () =>
            markerFilter
                ? (data?.markers ?? []).filter(markerFilter)
                : (data?.markers ?? []),
        [data?.markers, markerFilter]
    );

    const search = useSearch(markers, markerFields);

    if (isLoading) return <LoadingState />;

    if (isError)
        return <ErrorState error={error} onRetry={() => void refetch()} />;

    if (!markers.length)
        return <EmptyState icon={MapPin} title={t('noMarkers')} />;

    return (
        <div className="flex flex-col gap-2">
            <SearchInput
                value={search.query.value}
                onChange={search.query.set}
                label={t('search')}
            />
            {search.items.length === 0 ? (
                <SearchEmptyState
                    query={search.query.value}
                    onClear={() => search.query.set('')}
                />
            ) : (
                search.items.map((m) => (
                    <Button
                        key={m.id}
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => onPick(m.id)}
                    >
                        <MapPin className="size-4" aria-hidden /> {m.name}
                    </Button>
                ))
            )}
        </div>
    );
}

export function MarkerPickerDialog({
    campaignId,
    open,
    onOpenChange,
    onPick,
    excludeMapIds,
    markerFilter,
    title,
}: Props) {
    const t = useTranslations('scenario.markerPicker');

    const isWide = useMediaQuery(DESKTOP_QUERY);

    const {
        data: maps = [],
        isLoading,
        isError,
        error,
        refetch,
    } = useWorldMaps(campaignId);

    const [mapId, setMapId] = useState<string | null>(null);

    const ordered = useMemo(
        () => treeOrder(maps).filter((m) => !excludeMapIds?.includes(m.id)),
        [maps, excludeMapIds]
    );

    const pick = (markerId: string) => {
        if (!mapId) return;

        onPick({ mapId, markerId });
        onOpenChange(false);
    };

    const tree = (
        <div className="flex flex-col gap-1">
            {ordered.map((m) => (
                <Button
                    key={m.id}
                    type="button"
                    variant={m.id === mapId ? 'secondary' : 'ghost'}
                    className="justify-start"
                    style={{ paddingLeft: 12 + treeDepth(maps, m.id) * 14 }}
                    onClick={() => setMapId(m.id)}
                >
                    {m.name}
                </Button>
            ))}
        </div>
    );

    let body;

    if (isLoading) body = <LoadingState />;
    else if (isError)
        body = <ErrorState error={error} onRetry={() => void refetch()} />;
    else if (maps.length === 0)
        body = (
            <EmptyState
                icon={MapPin}
                title={t('noMaps')}
                action={
                    <WorldMapLink
                        campaignId={campaignId}
                        variant="button"
                        newTab
                    />
                }
            />
        );
    else if (isWide)
        body = (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
                {tree}
                {mapId ? (
                    <MarkerList
                        campaignId={campaignId}
                        mapId={mapId}
                        onPick={pick}
                        markerFilter={markerFilter}
                    />
                ) : (
                    <EmptyState title={t('pickMap')} />
                )}
            </div>
        );
    else if (!mapId) body = tree;
    else
        body = (
            <div className="flex flex-col gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    className="self-start"
                    onClick={() => setMapId(null)}
                >
                    <ChevronLeft className="size-4" aria-hidden /> {t('toMaps')}
                </Button>
                <MarkerList
                    campaignId={campaignId}
                    mapId={mapId}
                    onPick={pick}
                    markerFilter={markerFilter}
                />
            </div>
        );

    return (
        <ResponsiveDialog
            hud
            open={open}
            onOpenChange={onOpenChange}
            title={title ?? t('title')}
        >
            {body}
        </ResponsiveDialog>
    );
}
