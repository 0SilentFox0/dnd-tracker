'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
    ArrowLeft,
    Brush,
    Eraser,
    Minus,
    PaintBucket,
    Pipette,
    Square,
} from 'lucide-react';

import { BattleMap } from '@/components/battle/map';
import { tileAssetUrl } from '@/components/battle/map/tiles/assets';
import { MapBackgroundSection } from '@/components/battle/setup/MapBackgroundSection';
import { MapCellToolsSection } from '@/components/battle/setup/MapCellToolsSection';
import {
    DoorToolOptions,
    EDGE_TOOLS,
    ToolButtons,
} from '@/components/battle/setup/MapToolButtons';
import { QueryState } from '@/components/common/states';
import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import {
    useBattleMap,
    useBattleMapTiles,
    usePatchBattleMapTiles,
} from '@/lib/hooks/battle-maps';
// deep import: the battle-maps barrel would close a cycle through battles
import { useMapEditorDraft } from '@/lib/hooks/battle-maps/useMapEditorDraft';
import { useTileEditor } from '@/lib/hooks/battle-maps/useTileEditor';
import { useCoarsePointer, useUnsavedChangesGuard } from '@/lib/hooks/common';
import { useText } from '@/lib/i18n/use-text';
import {
    isEdgeTool,
    isPreviewSafeBackground,
    MIN_SIDE,
} from '@/lib/utils/battle/grid';
import { parseUvtt, UvttImportError } from '@/lib/utils/battle/uvtt/parse';
import enTileLabels from '@/messages/en/tile-labels.json';
import ukTileLabels from '@/messages/uk/tile-labels.json';
import type { BattleMapFull, BattleMapTileChunks } from '@/types/battle-map';

function BackLink({ campaignId }: { campaignId: string }) {
    const t = useTranslations('maps.editor');

    return (
        <Button asChild variant="outline" size="sm">
            <Link href={`/campaigns/${campaignId}/dm/maps`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t('back')}
            </Link>
        </Button>
    );
}

type Panel = 'background' | 'cells' | 'edges' | 'tiles';

function TileAssetImage({
    tile,
    alt,
    className,
}: {
    tile: (typeof TILE_CATALOG)[number];
    alt: string;
    className: string;
}) {
    const width = tile.layer === 'edge-art' ? 256 : tile.footprint.cols * 256;

    const height = tile.layer === 'edge-art' ? 64 : tile.footprint.rows * 256;

    return (
        <Image
            src={tileAssetUrl(tile)}
            alt={alt}
            width={width}
            height={height}
            unoptimized
            className={className}
        />
    );
}

const TILE_TOOLS = [
    { key: 'brush', icon: Brush },
    { key: 'line', icon: Minus },
    { key: 'rectangle', icon: Square },
    { key: 'fill', icon: PaintBucket },
    { key: 'eraser', icon: Eraser },
    { key: 'picker', icon: Pipette },
] as const;

const PANELS: Panel[] = ['background', 'cells', 'edges', 'tiles'];

function EditorBody({
    campaignId,
    source,
}: {
    campaignId: string;
    source: BattleMapFull;
}) {
    const draft = useMapEditorDraft(campaignId, source);

    const tileQuery = useBattleMapTiles(campaignId, source.id);

    return (
        <QueryState query={tileQuery}>
            {(tileData) => (
                <EditorContent
                    campaignId={campaignId}
                    source={source}
                    draft={draft}
                    tileData={tileData}
                />
            )}
        </QueryState>
    );
}

function EditorContent({
    campaignId,
    source,
    draft,
    tileData,
}: {
    campaignId: string;
    source: BattleMapFull;
    draft: ReturnType<typeof useMapEditorDraft>;
    tileData: BattleMapTileChunks;
}) {
    const t = useTranslations('maps.editor');

    const tMap = useTranslations('battleSetup.map');

    const text = useText();

    const tileEditor = useTileEditor({
        initialChunks: tileData.chunks,
        version: tileData.version,
        mapSize: {
            cols: draft.editor.state.map.cols,
            rows: draft.editor.state.map.rows,
        },
    });

    const tileSave = usePatchBattleMapTiles(campaignId, source.id);

    const [panel, setPanel] = useState<Panel>(() =>
        source.map.background ? 'background' : 'tiles'
    );

    const [tileSearch, setTileSearch] = useState('');

    const [importError, setImportError] = useState('');

    const importInput = useRef<HTMLInputElement>(null);

    const { undo, redo } = tileEditor;

    useEffect(() => {
        if (panel !== 'tiles') return;

        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target;

            if (
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
            )
                return;

            if (!(event.metaKey || event.ctrlKey)) return;

            const key = event.key.toLowerCase();

            if (key === 'z') {
                event.preventDefault();

                if (event.shiftKey) redo();
                else undo();
            } else if (key === 'y') {
                event.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [panel, redo, undo]);

    useUnsavedChangesGuard(draft.isDirty || tileEditor.isDirty);

    const { editor } = draft;

    const { map, tool, notice } = editor.state;

    const maxSide = map.background
        ? MAP_LIMITS.photoMaxSide
        : MAP_LIMITS.tileMaxSide;

    const cellTool = tool !== null && !isEdgeTool(tool);

    const paintingTiles = panel === 'tiles';

    const tileTranslations = useTranslations('maps.editor.tiles');

    const locale = useLocale() === 'uk' ? 'uk' : 'en';

    const tileLabels = locale === 'uk' ? ukTileLabels : enTileLabels;

    const tileLabel = (key: string) =>
        (tileLabels as Record<string, string>)[key] ?? key;

    const previewMap = paintingTiles
        ? { ...map, background: null }
        : isPreviewSafeBackground(map.background) || map.background === null
          ? map
          : { ...map, background: null };

    const selectedTile = TILE_CATALOG.find(
        (tile) => tile.id === tileEditor.selectedTileId
    );

    const visibleTiles = TILE_CATALOG.filter((tile) => {
        if (tile.layer !== tileEditor.activeLayer) return false;

        const name = tileLabel(tile.key);

        return name
            .toLocaleLowerCase()
            .includes(tileSearch.trim().toLocaleLowerCase());
    });

    const selectPanel = (nextPanel: Panel) => {
        if (panel !== nextPanel) editor.actions.setTool(null);

        setPanel(nextPanel);
    };

    const importUvtt = async (file: File | undefined) => {
        if (!file) return;

        setImportError('');
        try {
            if (!/\.(dd2vtt|uvtt)$/i.test(file.name))
                throw new UvttImportError(t('import.invalidExtension'));

            const result = parseUvtt(await file.text());

            editor.actions.replaceMapFromImport({
                cols: result.cols,
                rows: result.rows,
                background: result.image,
                backgroundCols: result.backgroundCols,
                walls: result.walls,
                doors: result.doors,
            });
            selectPanel('background');
        } catch (error) {
            setImportError(
                error instanceof UvttImportError ? error.message : t('import.failed')
            );
        } finally {
            if (importInput.current) importInput.current.value = '';
        }
    };

    return (
        <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-2 p-2">
            <div className="flex flex-wrap items-end gap-3">
                <BackLink campaignId={campaignId} />
                <div className="min-w-[12rem] flex-1 space-y-1">
                    <Label htmlFor="map-name" className="text-xs">
                        {t('name')}
                    </Label>
                    <Input
                        id="map-name"
                        value={draft.name.value}
                        maxLength={80}
                        onChange={(e) => draft.name.set(e.target.value)}
                    />
                </div>
                <div className="w-20 space-y-1">
                    <Label htmlFor="map-cols" className="text-xs">
                        {tMap('cols')}
                    </Label>
                    <BoundedNumberInput
                        id="map-cols"
                        value={map.cols}
                        min={MIN_SIDE}
                        max={maxSide}
                        onCommit={(v) => editor.actions.setSize(v, map.rows)}
                        onValueChange={(v) =>
                            editor.actions.setSize(v, map.rows)
                        }
                    />
                </div>
                <div className="w-20 space-y-1">
                    <Label htmlFor="map-rows" className="text-xs">
                        {tMap('rows')}
                    </Label>
                    <BoundedNumberInput
                        id="map-rows"
                        value={map.rows}
                        min={MIN_SIDE}
                        max={maxSide}
                        onCommit={(v) => editor.actions.setSize(map.cols, v)}
                        onValueChange={(v) =>
                            editor.actions.setSize(map.cols, v)
                        }
                    />
                </div>
                <Button
                    onClick={draft.save}
                    disabled={!draft.canSave}
                    size="sm"
                >
                    {draft.isSaving ? t('saving') : t('save')}
                </Button>
            </div>
            <p
                aria-live="polite"
                role="status"
                className="min-h-5 text-sm text-hud-gold-bright"
            >
                {notice ? text(notice) : draft.justSaved ? t('saved') : ''}
            </p>
            <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(14rem,42%)] gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1">
                <div className="min-h-0 min-w-0">
                    <BattleMap
                        map={previewMap}
                        participants={[]}
                        actions={{
                            onStroke: paintingTiles
                                ? tileEditor.onStroke
                                : editor.actions.onStroke,
                        }}
                        tiles={{
                            mapId: source.id,
                            version: tileEditor.version,
                            seed: source.id,
                            chunks: tileEditor.chunks,
                            assets: {},
                        }}
                        className="h-full"
                        editing={{
                            clickableBlocked:
                                paintingTiles ||
                                (panel === 'cells' && cellTool),
                            strokeTool:
                                paintingTiles ||
                                (panel === 'cells' && cellTool),
                            showBlocked: true,
                            edges:
                                panel === 'edges' ? editor.edgeEditing : null,
                            doorLocks: true,
                        }}
                    />
                </div>
                <aside className="min-h-0 space-y-3 overflow-x-hidden overflow-y-auto pr-1">
                    <Tabs
                        value={panel}
                        onValueChange={(value) => selectPanel(value as Panel)}
                        className="min-w-0"
                    >
                        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-md bg-transparent p-0">
                            {PANELS.map((p) => (
                                <TabsTrigger
                                    key={p}
                                    type="button"
                                    value={p}
                                    className="min-w-0 flex-1 rounded-md border border-hud-rule bg-black/30 px-2 text-xs text-hud-muted data-[state=active]:border-[var(--gold)] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    {t(`panels.${p}`)}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <TabsContent value="background">
                            <div className="mb-3 space-y-2">
                                <input
                                    ref={importInput}
                                    type="file"
                                    accept=".dd2vtt,.uvtt,application/json"
                                    className="sr-only"
                                    aria-label={t('import.chooseFile')}
                                    onChange={(event) => void importUvtt(event.currentTarget.files?.[0])}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => importInput.current?.click()}
                                >
                                    {t('import.button')}
                                </Button>
                                <p className="text-xs text-hud-muted">{t('import.help')}</p>
                                {importError ? (
                                    <p role="alert" className="text-sm text-destructive">{importError}</p>
                                ) : null}
                            </div>
                            <MapBackgroundSection editor={editor} />
                        </TabsContent>
                        <TabsContent value="cells">
                            <MapCellToolsSection editor={editor} />
                        </TabsContent>
                        <TabsContent value="edges">
                            <div className="space-y-2">
                                <Label className="text-xs">{t('edges')}</Label>
                                <ToolButtons
                                    tools={EDGE_TOOLS}
                                    tool={tool}
                                    onPick={editor.actions.setTool}
                                />
                                <DoorToolOptions editor={editor} />
                            </div>
                        </TabsContent>
                        <TabsContent value="tiles">
                            <div className="space-y-3">
                                <div
                                    className="grid grid-cols-2 gap-1"
                                    role="group"
                                    aria-label={tileTranslations('layers')}
                                >
                                    {(
                                        [
                                            'ground',
                                            'wallfill',
                                            'objects',
                                            'edge-art',
                                        ] as const
                                    ).map((layer) => (
                                        <Button
                                            key={layer}
                                            type="button"
                                            size="sm"
                                            className="min-w-0 px-2 text-xs"
                                            aria-pressed={
                                                tileEditor.activeLayer === layer
                                            }
                                            variant={
                                                tileEditor.activeLayer === layer
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                tileEditor.setActiveLayer(layer)
                                            }
                                        >
                                            {tileTranslations(`layer.${layer}`)}
                                        </Button>
                                    ))}
                                </div>
                                <p
                                    className="text-xs text-hud-muted"
                                    aria-live="polite"
                                >
                                    {tileTranslations(
                                        `tool.${tileEditor.tool}`
                                    )}
                                </p>
                                <div
                                    className="grid grid-cols-6 gap-1"
                                    role="group"
                                    aria-label={tileTranslations('tools')}
                                >
                                    {TILE_TOOLS.map(
                                        ({ key: nextTool, icon: Icon }) => (
                                            <Button
                                                key={nextTool}
                                                type="button"
                                                size="icon"
                                                aria-label={tileTranslations(
                                                    `tool.${nextTool}`
                                                )}
                                                aria-pressed={
                                                    tileEditor.tool === nextTool
                                                }
                                                title={tileTranslations(
                                                    `tool.${nextTool}`
                                                )}
                                                className="w-full"
                                                variant={
                                                    tileEditor.tool === nextTool
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    tileEditor.setTool(nextTool)
                                                }
                                            >
                                                <Icon
                                                    aria-hidden="true"
                                                    className="h-4 w-4"
                                                />
                                            </Button>
                                        )
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label
                                        htmlFor="tile-brush-size"
                                        className="text-xs"
                                    >
                                        {tileTranslations('brushSize')}
                                    </Label>
                                    <select
                                        id="tile-brush-size"
                                        className="h-8 rounded border bg-background px-2 text-sm"
                                        value={tileEditor.brushSize}
                                        onChange={(event) =>
                                            tileEditor.setBrushSize(
                                                Number(event.target.value)
                                            )
                                        }
                                    >
                                        {[1, 2, 3].map((size) => (
                                            <option key={size} value={size}>
                                                {size}
                                            </option>
                                        ))}
                                    </select>
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
                                                alt={tileLabel(
                                                    selectedTile.key
                                                )}
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                                <Input
                                    aria-label={tileTranslations('search')}
                                    placeholder={tileTranslations('search')}
                                    value={tileSearch}
                                    onChange={(event) =>
                                        setTileSearch(event.target.value)
                                    }
                                    className="h-8 text-sm"
                                />
                                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                                    {visibleTiles.map((tile) => (
                                        <Button
                                            key={tile.id}
                                            type="button"
                                            size="sm"
                                            aria-pressed={
                                                tileEditor.selectedTileId ===
                                                tile.id
                                            }
                                            aria-label={tileLabel(tile.key)}
                                            title={tileLabel(tile.key)}
                                            className="h-auto min-w-0 flex-col gap-1 px-1 py-1.5 text-center whitespace-normal"
                                            variant={
                                                tileEditor.selectedTileId ===
                                                tile.id
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                tileEditor.setSelectedTile(
                                                    tile.id
                                                )
                                            }
                                        >
                                            <span className="flex h-12 w-full items-center justify-center overflow-hidden rounded bg-black/30 p-1">
                                                <TileAssetImage
                                                    tile={tile}
                                                    alt=""
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                            </span>
                                            <span className="line-clamp-2 w-full text-[11px] leading-tight">
                                                {tileLabel(tile.key)}
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!tileEditor.canUndo}
                                        onClick={tileEditor.undo}
                                    >
                                        {tileTranslations('undo')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!tileEditor.canRedo}
                                        onClick={tileEditor.redo}
                                    >
                                        {tileTranslations('redo')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={
                                            !tileEditor.isDirty ||
                                            tileSave.isPending
                                        }
                                        onClick={() =>
                                            tileSave.mutate(
                                                {
                                                    expectedVersion:
                                                        tileEditor.version,
                                                    patches:
                                                        tileEditor.dirtyPatches,
                                                },
                                                {
                                                    onSuccess: ({
                                                        version,
                                                    }) => {
                                                        tileEditor.acceptSaved();
                                                        draft.acceptVersion(
                                                            version
                                                        );
                                                    },
                                                }
                                            )
                                        }
                                    >
                                        {tileSave.isPending
                                            ? tileTranslations('saving')
                                            : tileTranslations('save')}
                                    </Button>
                                </div>
                                {tileSave.isError && (
                                    <p
                                        role="alert"
                                        className="text-sm text-destructive"
                                    >
                                        {tileTranslations('saveFailed')}
                                    </p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </aside>
            </div>
        </div>
    );
}

export function MapEditorScreen({
    campaignId,
    mapId,
}: {
    campaignId: string;
    mapId: string;
}) {
    const t = useTranslations('maps.editor');

    const touch = useCoarsePointer();

    const query = useBattleMap(campaignId, mapId);

    if (touch)
        return (
            <div className="space-y-3 p-4">
                <BackLink campaignId={campaignId} />
                <p className="text-sm text-hud-muted">{t('desktopOnly')}</p>
            </div>
        );

    return (
        <QueryState query={query}>
            {(source) => <EditorBody campaignId={campaignId} source={source} />}
        </QueryState>
    );
}
