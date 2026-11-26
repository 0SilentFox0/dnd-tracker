'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { TileAssetImage } from '../TileAssetImage';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { Button } from '@/components/ui/button';
import { FLOOR_MATERIALS } from '@/lib/constants/map-art/materials';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import { useSearch } from '@/lib/hooks/common';

const FLOORS = FLOOR_MATERIALS.flatMap((material) => {
    const tile = TILE_CATALOG.find((def) => def.id === material.code);

    return tile ? [{ code: material.code, tile }] : [];
});

export function FloorMaterialPicker({
    selected,
    onSelect,
}: {
    selected: number;
    onSelect: (code: number) => void;
}) {
    const t = useTranslations('maps.editor.tiles');

    const labels = useTranslations('tileLabels');

    const label = useCallback(
        (key: string) =>
            labels.has(key as never) ? labels(key as never) : key,
        [labels]
    );

    const search = useSearch(
        FLOORS,
        useCallback((floor) => [label(floor.tile.key)], [label]),
        0
    );

    const items = search.items;

    return (
        <div className="space-y-2">
            <SearchInput
                label={t('search')}
                placeholder={t('search')}
                value={search.query.value}
                onChange={search.query.set}
            />
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {items.map(({ code, tile }) => (
                    <Button
                        key={code}
                        type="button"
                        size="sm"
                        aria-pressed={selected === code}
                        aria-label={label(tile.key)}
                        title={label(tile.key)}
                        className="h-auto min-w-0 flex-col gap-1 px-1 py-1.5 text-center whitespace-normal"
                        variant={selected === code ? 'default' : 'outline'}
                        onClick={() => onSelect(code)}
                    >
                        <span className="flex h-12 w-full items-center justify-center overflow-hidden rounded bg-black/30 p-1">
                            <TileAssetImage
                                tile={tile}
                                alt=""
                                className="max-h-full max-w-full object-contain"
                            />
                        </span>
                        <span className="line-clamp-2 w-full text-[11px] leading-tight">
                            {label(tile.key)}
                        </span>
                    </Button>
                ))}
            </div>
            {items.length === 0 && (
                <p className="rounded-md border border-dashed border-hud-rule p-3 text-center text-xs text-hud-muted">
                    {t('noResults')}
                </p>
            )}
        </div>
    );
}
