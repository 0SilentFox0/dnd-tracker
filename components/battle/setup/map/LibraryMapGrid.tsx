'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Download, ExternalLink } from 'lucide-react';

import { BattleMapThumb } from '@/components/battle/list/BattleMapThumb';
import { BattleMap } from '@/components/battle/map';
import { SearchInput } from '@/components/common/fields/SearchInput';
import { SearchEmptyState } from '@/components/common/states/SearchEmptyState';
import { HudButton } from '@/components/hud';
import { MapCatalogDialog } from '@/components/maps/MapCatalogDialog';
import { Button } from '@/components/ui/button';
import { useBattleMap } from '@/lib/hooks/battle-maps';
import type { BattleLibraryMap } from '@/lib/hooks/battles';
import { useMediaQuery } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

const NO_PARTICIPANTS: never[] = [];

const PREVIEW_LOOK = { className: 'h-full', hideCameraControls: true };

const PREVIEW_EDITING = { showDefaultBackground: false };

function SelectedPreview({
    campaignId,
    mapId,
}: {
    campaignId: string;
    mapId: string;
}) {
    const t = useTranslations('battleSetup.library');

    const { data } = useBattleMap(campaignId, mapId);

    if (!data) return null;

    return (
        <div
            role="img"
            aria-label={t('preview')}
            className="h-80 w-full min-w-0 overflow-hidden rounded-lg"
        >
            <BattleMap
                map={{ ...data.map, walls: data.walls, bars: data.bars }}
                participants={NO_PARTICIPANTS}
                look={PREVIEW_LOOK}
                editing={PREVIEW_EDITING}
            />
        </div>
    );
}

export function LibraryMapGrid({
    library,
    campaignId,
    onClear,
}: {
    library: BattleLibraryMap;
    campaignId: string;
    onClear: () => void;
}) {
    const t = useTranslations('battleSetup.library');

    const [search, setSearch] = useState('');

    const wide = useMediaQuery('(min-width: 1280px)');

    const needle = search.trim().toLowerCase();

    const maps = library.maps.filter((m) =>
        m.name.toLowerCase().includes(needle)
    );

    const chosen = library.maps.find((m) => m.id === library.selectedId);

    const anyTooLarge = library.maps.some(
        (m) => Math.max(m.cols, m.rows) > library.maxSide
    );

    const status = library.isLocked
        ? t('locked')
        : library.wasLinked && library.isChanged && !chosen
          ? t('ownFromLinked')
          : library.isLinked
            ? t('linked')
            : chosen
              ? t('chosen', { cols: chosen.cols, rows: chosen.rows })
              : anyTooLarge
                ? t('tooLarge', { max: library.maxSide })
                : null;

    const pick = (id: string) => {
        if (id === library.selectedId) {
            if (!library.canUnlink) return;

            onClear();
            void library.select(null);

            return;
        }

        void library.select(id);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    label={t('search')}
                    className="min-w-48 flex-1"
                />
                {library.canImportCatalog ? (
                    <Button
                        type="button"
                        variant="outline"
                        disabled={library.isImportingCatalog}
                        onClick={() => library.setCatalogOpen(true)}
                    >
                        <Download aria-hidden="true" className="mr-2 h-4 w-4" />
                        {t('catalog')}
                    </Button>
                ) : null}
                <Link
                    href={`/campaigns/${campaignId}/dm/maps`}
                    className="text-sm text-hud-ink underline"
                >
                    {t('manage')}
                </Link>
            </div>
            {status ? <p className="text-sm text-hud-muted">{status}</p> : null}
            <div
                className={cn(
                    'grid gap-4',
                    wide &&
                        chosen &&
                        'grid-cols-[minmax(0,1fr)_minmax(0,28rem)]'
                )}
            >
                <div className="min-w-0">
                    {!library.maps.length ? (
                        <p className="text-sm text-hud-muted">{t('empty')}</p>
                    ) : !maps.length ? (
                        <SearchEmptyState
                            query={search}
                            onClear={() => setSearch('')}
                        />
                    ) : (
                        <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
                            {maps.map((m) => {
                                const selected = m.id === library.selectedId;

                                const tooLarge =
                                    Math.max(m.cols, m.rows) > library.maxSide;

                                const disabled = library.isLocked || tooLarge;

                                return (
                                    <li key={m.id}>
                                        <HudButton
                                            type="button"
                                            aria-pressed={selected}
                                            aria-disabled={
                                                disabled || undefined
                                            }
                                            title={
                                                tooLarge
                                                    ? t('tooLarge', {
                                                          max: library.maxSide,
                                                      })
                                                    : undefined
                                            }
                                            onClick={() => {
                                                if (!disabled) pick(m.id);
                                            }}
                                            className={cn(
                                                'ds-interactive relative block w-full rounded-lg p-1.5 text-left',
                                                selected &&
                                                    'ring-2 ring-hud-accent',
                                                disabled && 'opacity-50'
                                            )}
                                        >
                                            <BattleMapThumb
                                                size="tile"
                                                map={{
                                                    background: m.thumb,
                                                    cols: m.cols,
                                                    rows: m.rows,
                                                    gridType: 'square',
                                                }}
                                            />
                                            {selected ? (
                                                <span
                                                    role="img"
                                                    aria-label={t(
                                                        'selectedMark'
                                                    )}
                                                    className="absolute top-3 right-3 rounded-full bg-hud-accent p-0.5 text-hud-accent-fg"
                                                >
                                                    <Check
                                                        aria-hidden="true"
                                                        className="h-4 w-4"
                                                    />
                                                </span>
                                            ) : null}
                                            <span className="mt-1.5 block truncate text-sm font-medium text-hud-ink">
                                                {m.name}
                                            </span>
                                            <span className="block text-xs text-hud-muted tabular-nums">
                                                {t('size', {
                                                    cols: m.cols,
                                                    rows: m.rows,
                                                })}
                                            </span>
                                        </HudButton>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                {wide && chosen ? (
                    <div className="space-y-2">
                        <SelectedPreview
                            key={chosen.id}
                            campaignId={campaignId}
                            mapId={chosen.id}
                        />
                        <Link
                            href={`/campaigns/${campaignId}/dm/maps/${chosen.id}`}
                            className="inline-flex items-center gap-1 text-sm text-hud-ink underline"
                        >
                            {t('openInEditor')}
                            <ExternalLink
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                            />
                        </Link>
                    </div>
                ) : chosen ? (
                    <Link
                        href={`/campaigns/${campaignId}/dm/maps/${chosen.id}`}
                        className="inline-flex items-center gap-1 text-sm text-hud-ink underline"
                    >
                        {t('openInEditor')}
                        <ExternalLink
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                        />
                    </Link>
                ) : null}
            </div>
            {library.catalogOpen ? (
                <MapCatalogDialog
                    open={library.catalogOpen}
                    onOpenChange={library.setCatalogOpen}
                    onImport={library.importCatalogEntry}
                    pending={library.isImportingCatalog}
                />
            ) : null}
        </div>
    );
}
