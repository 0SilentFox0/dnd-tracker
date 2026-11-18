'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Footprints, Map as MapIcon, Presentation } from 'lucide-react';

import { SHOW_TONE, ShowButton } from '@/components/show/stage/show-ui';
import { WorldTravelDialog } from '@/components/show/world/WorldTravelDialog';
import { SelectField } from '@/components/ui/select-field';
import { WorldMapLink } from '@/components/world/WorldMapLink';
import type { ShowControl } from '@/lib/hooks/show';
import { type TravelMoved, useWorldMap, useWorldMaps } from '@/lib/hooks/world';
import { cn } from '@/lib/utils';
import { mapPath } from '@/lib/utils/world/tree';
import type { ShowState } from '@/types/show';

const SELECT =
    'h-7 min-w-0 max-w-48 rounded border-0 bg-transparent px-1 py-0 text-xs opacity-75 shadow-none hover:opacity-100 data-[size=default]:h-7 dark:bg-transparent dark:hover:bg-transparent';

interface Pick {
    base: string | undefined;
    id: string;
}

export function ShowWorldControls({
    campaignId,
    show,
    control,
}: {
    campaignId: string;
    show: ShowState | null;
    control: ShowControl;
}) {
    const t = useTranslations('world.show');

    const { data: maps } = useWorldMaps(campaignId);

    const shownMapId = show?.world?.mapId;

    const [mapPick, setMapPick] = useState<Pick | null>(null);

    const [focusPick, setFocusPick] = useState<
        (Pick & { mapId: string }) | null
    >(null);

    const [travelOpen, setTravelOpen] = useState(false);

    const root = maps?.find((m) => !m.parentMapId);

    const mapId =
        (mapPick?.base === shownMapId ? mapPick?.id : undefined) ??
        shownMapId ??
        root?.id ??
        null;

    const { data: detail } = useWorldMap(campaignId, mapId);

    if (!maps || maps.length === 0)
        return <WorldLink campaignId={campaignId} />;

    const focusId =
        focusPick && focusPick.mapId === mapId && focusPick.base === shownMapId
            ? focusPick.id
            : shownMapId === mapId
              ? show?.world?.focusMarkerId
              : undefined;

    const rows = maps
        .map((m) => ({ map: m, path: mapPath(maps, m.id) }))
        .sort((a, b) =>
            a.path
                .map((p) => p.name)
                .join('\0')
                .localeCompare(b.path.map((p) => p.name).join('\0'))
        );

    const showing = !!mapId && shownMapId === mapId;

    const send = (focusMarkerId?: string) =>
        mapId && void control.send({ action: 'world', mapId, focusMarkerId });

    const pickFocus = (id: string) => {
        setFocusPick({ base: shownMapId, mapId: mapId as string, id });

        if (showing) send(id || undefined);
    };

    const followTravel = (e: TravelMoved) => {
        if (e.kind !== 'travel' && shownMapId === e.fromMapId)
            void control.send({ action: 'world', mapId: e.destMapId });
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <ShowButton
                aria-label={t('present')}
                title={t('present')}
                disabled={control.pending || !mapId}
                aria-pressed={showing}
                onClick={() => send(focusId || undefined)}
            >
                <MapIcon className="size-4" />
                <span className="text-xs">{t('present')}</span>
            </ShowButton>
            <SelectField
                aria-label={t('map')}
                value={mapId ?? ''}
                onValueChange={(id) =>
                    setMapPick({ base: shownMapId, id })
                }
                options={rows.map(({ map, path }) => ({
                    value: map.id,
                    label: `${'\u00a0\u00a0'.repeat(path.length - 1)}${map.name}`,
                }))}
                triggerClassName={SELECT}
            />
            <SelectField
                aria-label={t('focus')}
                value={focusId ?? ''}
                onValueChange={pickFocus}
                disabled={control.pending}
                allowNone
                noneLabel={t('noFocus')}
                options={(detail?.markers ?? []).map((m) => ({
                    value: m.id,
                    label: m.name,
                }))}
                triggerClassName={SELECT}
            />
            {show?.world && (
                <ShowButton
                    aria-label={t('toSlides')}
                    title={t('toSlidesTitle')}
                    disabled={control.pending}
                    onClick={() => void control.send({ action: 'worldOff' })}
                >
                    <Presentation className="size-4" />
                    <span className="text-xs">{t('toSlides')}</span>
                </ShowButton>
            )}
            <ShowButton
                aria-label={t('travel')}
                title={t('travelTitle')}
                disabled={!mapId}
                onClick={() => setTravelOpen(true)}
            >
                <Footprints className="size-4" />
                <span className="text-xs">{t('travel')}</span>
            </ShowButton>
            {mapId && (
                <WorldTravelDialog
                    campaignId={campaignId}
                    mapId={mapId}
                    open={travelOpen}
                    onOpenChange={setTravelOpen}
                    onMoved={followTravel}
                />
            )}
            <WorldLink campaignId={campaignId} />
        </div>
    );
}

function WorldLink({ campaignId }: { campaignId: string }) {
    return (
        <div className={cn('ml-auto flex justify-end', SHOW_TONE.muted)}>
            <WorldMapLink campaignId={campaignId} variant="button" newTab />
        </div>
    );
}
