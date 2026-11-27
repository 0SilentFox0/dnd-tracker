'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { TILE_TOOLS } from './editor-icons';
import { TileAssetImage } from './TileAssetImage';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import type { useMapEditorWorkspace } from '@/lib/hooks/battle-maps';
import { useSearch } from '@/lib/hooks/common';

type Workspace = ReturnType<typeof useMapEditorWorkspace>;

const BRUSH_SIZES = ['1', '2', '3'].map((size) => ({
    value: size,
    label: size,
}));

const SECTION = 'space-y-3 rounded-lg border border-hud-rule bg-black/20 p-3';

const HEADING = 'hud-label';

export function TilePalettePanel({
    workspace,
}: {
    workspace: Pick<Workspace, 'tileEditor'>;
}) {
    const { tileEditor } = workspace;

    const t = useTranslations('maps.editor.tiles');

    const labels = useTranslations('tileLabels');

    const tileLabel = useCallback(
        (key: string) =>
            labels.has(key as never) ? labels(key as never) : key,
        [labels]
    );

    const layerTiles = useMemo(
        () =>
            TILE_CATALOG.filter(
                (tile) => tile.layer === tileEditor.activeLayer
            ),
        [tileEditor.activeLayer]
    );

    const search = useSearch(
        layerTiles,
        useCallback((tile) => [tileLabel(tile.key)], [tileLabel]),
        0
    );

    const visibleTiles = search.items;

    const selectedTile = TILE_CATALOG.find(
        (tile) => tile.id === tileEditor.selectedTileId
    );

    return (
        <div className="space-y-4">
            <section className={SECTION}>
                <h3 className={HEADING}>{t('tools')}</h3>
                <p className="text-xs text-hud-muted" aria-live="polite">
                    {t(`tool.${tileEditor.tool}`)}
                </p>
                <div
                    className="grid grid-cols-6 gap-1"
                    role="group"
                    aria-label={t('tools')}
                >
                    {TILE_TOOLS.map(({ key, icon: Icon }) => (
                        <Button
                            key={key}
                            type="button"
                            size="icon"
                            aria-label={t(`tool.${key}`)}
                            aria-pressed={tileEditor.tool === key}
                            title={t(`tool.${key}`)}
                            className="w-full"
                            variant={
                                tileEditor.tool === key ? 'default' : 'outline'
                            }
                            onClick={() => tileEditor.setTool(key)}
                        >
                            <Icon aria-hidden="true" className="h-4 w-4" />
                        </Button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="tile-brush-size" className="text-xs">
                        {t('brushSize')}
                    </Label>
                    <SelectField
                        id="tile-brush-size"
                        value={String(tileEditor.brushSize)}
                        options={BRUSH_SIZES}
                        onValueChange={(size) =>
                            tileEditor.setBrushSize(Number(size))
                        }
                        triggerClassName="h-8 w-16"
                    />
                </div>
            </section>
            <section className={SECTION}>
                <div className="flex items-center justify-between gap-2">
                    <h3 className={HEADING}>{t('palette')}</h3>
                    <span className="text-xs text-hud-muted">
                        {t('paletteCount', { count: visibleTiles.length })}
                    </span>
                </div>
                {selectedTile && (
                    <div className="overflow-hidden rounded-lg border border-hud-rule bg-black/20 p-2">
                        <p
                            className="mb-1 truncate text-xs font-medium"
                            aria-live="polite"
                        >
                            {tileLabel(selectedTile.key)}
                        </p>
                        <div className="flex h-16 items-center justify-center rounded-sm bg-black/30 p-1">
                            <TileAssetImage
                                tile={selectedTile}
                                alt={tileLabel(selectedTile.key)}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    </div>
                )}
                <SearchInput
                    label={t('search')}
                    placeholder={t('search')}
                    value={search.query.value}
                    onChange={search.query.set}
                />
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {visibleTiles.map((tile) => (
                        <Button
                            key={tile.id}
                            type="button"
                            size="sm"
                            aria-pressed={tileEditor.selectedTileId === tile.id}
                            aria-label={tileLabel(tile.key)}
                            title={tileLabel(tile.key)}
                            className="h-auto min-w-0 flex-col gap-1 px-1 py-1.5 text-center whitespace-normal"
                            variant={
                                tileEditor.selectedTileId === tile.id
                                    ? 'default'
                                    : 'outline'
                            }
                            onClick={() => tileEditor.setSelectedTile(tile.id)}
                        >
                            <span className="flex h-12 w-full items-center justify-center overflow-hidden rounded-sm bg-black/30 p-1">
                                <TileAssetImage
                                    tile={tile}
                                    alt=""
                                    className="max-h-full max-w-full object-contain"
                                />
                            </span>
                            <span className="line-clamp-2 w-full text-xs leading-tight">
                                {tileLabel(tile.key)}
                            </span>
                        </Button>
                    ))}
                </div>
                {visibleTiles.length === 0 && (
                    <p className="rounded-lg border border-dashed border-hud-rule p-4 text-center text-xs text-hud-muted">
                        {t('noResults')}
                    </p>
                )}
            </section>
        </div>
    );
}
