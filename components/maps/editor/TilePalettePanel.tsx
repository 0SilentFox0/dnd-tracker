'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { LAYER_ICONS, TILE_TOOLS } from './editor-icons';
import { TileAssetImage } from './TileAssetImage';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import { Slider } from '@/components/ui/slider';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import type { useMapEditorWorkspace } from '@/lib/hooks/battle-maps';
import { useSearch } from '@/lib/hooks/common';

type Workspace = ReturnType<typeof useMapEditorWorkspace>;

const BRUSH_SIZES = ['1', '2', '3'].map((size) => ({
    value: size,
    label: size,
}));

const GROUND_LAYERS = ['ground', 'wallfill', 'objects', 'edge-art'] as const;

const EFFECT_LAYERS = ['effects'] as const;

const SECTION = 'space-y-3 rounded-lg border border-hud-rule bg-black/20 p-3';

const HEADING = 'text-xs font-semibold tracking-wide text-hud-muted uppercase';

function tileImageClass(layer: string) {
    return layer === 'edge-art'
        ? 'h-full w-full object-fill'
        : 'max-h-full max-w-full object-contain';
}

export function TilePalettePanel({
    workspace,
    effects,
}: {
    workspace: Pick<Workspace, 'tileEditor' | 'effect'>;
    effects: boolean;
}) {
    const { tileEditor, effect } = workspace;

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
                <h3 className={HEADING}>{t('layers')}</h3>
                <div
                    className={
                        effects
                            ? 'grid grid-cols-1 gap-2'
                            : 'grid grid-cols-2 gap-2'
                    }
                    role="group"
                    aria-label={t('layers')}
                >
                    {(effects ? EFFECT_LAYERS : GROUND_LAYERS).map((layer) => {
                        const Icon = LAYER_ICONS[layer];

                        return (
                            <Button
                                key={layer}
                                type="button"
                                size="sm"
                                className="h-auto min-h-10 min-w-0 justify-start gap-2 px-2 py-2 text-left text-xs whitespace-normal"
                                aria-pressed={tileEditor.activeLayer === layer}
                                variant={
                                    tileEditor.activeLayer === layer
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => tileEditor.setActiveLayer(layer)}
                            >
                                <Icon
                                    aria-hidden="true"
                                    className="h-4 w-4 shrink-0"
                                />
                                {t(`layer.${layer}`)}
                            </Button>
                        );
                    })}
                </div>
                {selectedTile && (
                    <div className="sticky top-[4.25rem] z-10 flex items-center justify-between gap-2 rounded-md border border-hud-rule bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
                        <span className="truncate text-hud-muted">
                            {t(`layer.${tileEditor.activeLayer}`)}
                        </span>
                        <span className="truncate font-medium text-hud-gold-bright">
                            {tileLabel(selectedTile.key)}
                        </span>
                    </div>
                )}
                <p className="rounded border border-hud-rule bg-black/20 p-2 text-xs text-hud-muted">
                    {t(`description.${tileEditor.activeLayer}`)}
                </p>
                {effects && (
                    <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1 text-xs text-hud-muted">
                            <span className="flex justify-between gap-2">
                                <span>{t('effectSize')}</span>
                                <span>{effect.size.toFixed(1)}×</span>
                            </span>
                            <Slider
                                aria-label={t('effectSize')}
                                min={0.6}
                                max={1.8}
                                step={0.1}
                                value={effect.size}
                                onValueChange={effect.setSize}
                                className="w-full"
                            />
                        </label>
                        <label className="space-y-1 text-xs text-hud-muted">
                            <span className="flex justify-between gap-2">
                                <span>{t('effectIntensity')}</span>
                                <span>
                                    {Math.round(effect.intensity * 100)}%
                                </span>
                            </span>
                            <Slider
                                aria-label={t('effectIntensity')}
                                min={0.2}
                                max={1}
                                step={0.05}
                                value={effect.intensity}
                                onValueChange={effect.setIntensity}
                                className="w-full"
                            />
                        </label>
                    </div>
                )}
            </section>
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
                    <span className="text-[11px] text-hud-muted">
                        {t('paletteCount', { count: visibleTiles.length })}
                    </span>
                </div>
                {selectedTile && (
                    <div className="overflow-hidden rounded-md border border-hud-rule bg-black/20 p-2">
                        <p
                            className="mb-1 truncate text-xs font-medium"
                            aria-live="polite"
                        >
                            {tileLabel(selectedTile.key)}
                        </p>
                        <div className="flex h-16 items-center justify-center rounded bg-black/30 p-1">
                            <TileAssetImage
                                tile={selectedTile}
                                alt={tileLabel(selectedTile.key)}
                                className={tileImageClass(selectedTile.layer)}
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
                            <span className="flex h-12 w-full items-center justify-center overflow-hidden rounded bg-black/30 p-1">
                                <TileAssetImage
                                    tile={tile}
                                    alt=""
                                    className={tileImageClass(tile.layer)}
                                />
                            </span>
                            <span className="line-clamp-2 w-full text-[11px] leading-tight">
                                {tileLabel(tile.key)}
                            </span>
                        </Button>
                    ))}
                </div>
                {visibleTiles.length === 0 && (
                    <p className="rounded-md border border-dashed border-hud-rule p-4 text-center text-xs text-hud-muted">
                        {t('noResults')}
                    </p>
                )}
            </section>
        </div>
    );
}
