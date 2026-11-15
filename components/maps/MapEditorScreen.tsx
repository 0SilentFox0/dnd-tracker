'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { BattleMap } from '@/components/battle/map';
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
        mapSize: { cols: draft.editor.state.map.cols, rows: draft.editor.state.map.rows },
    });

    const tileSave = usePatchBattleMapTiles(campaignId, source.id);

    const [panel, setPanel] = useState<Panel>('background');

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

    const previewMap =
        isPreviewSafeBackground(map.background) || map.background === null
            ? map
            : { ...map, background: null };

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
            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="min-h-0 min-w-0">
                    <BattleMap
                        map={previewMap}
                        participants={[]}
                        actions={{
                            onStroke: paintingTiles
                                ? tileEditor.onStroke
                                : editor.actions.onStroke,
                        }}
                        tiles={
                            {
                                      mapId: source.id,
                                      version: tileEditor.version,
                                      seed: source.id,
                                      chunks: tileEditor.chunks,
                                      assets: {},
                            }
                        }
                        className="h-full"
                        editing={{
                            clickableBlocked: paintingTiles || cellTool,
                            strokeTool: paintingTiles || cellTool,
                            showBlocked: true,
                            edges: editor.edgeEditing,
                            doorLocks: true,
                        }}
                    />
                </div>
                <aside className="min-h-0 space-y-3 overflow-y-auto pr-1">
                    <div className="flex gap-1" role="tablist">
                        {PANELS.map((p) => (
                            <Button
                                key={p}
                                type="button"
                                role="tab"
                                aria-selected={panel === p}
                                size="sm"
                                variant={panel === p ? 'default' : 'outline'}
                                onClick={() => setPanel(p)}
                            >
                                {t(`panels.${p}`)}
                            </Button>
                        ))}
                    </div>
                    {panel === 'background' && (
                        <MapBackgroundSection editor={editor} />
                    )}
                    {panel === 'cells' && (
                        <MapCellToolsSection editor={editor} />
                    )}
                    {panel === 'edges' && (
                        <div className="space-y-2">
                            <Label className="text-xs">{t('edges')}</Label>
                            <ToolButtons
                                tools={EDGE_TOOLS}
                                tool={tool}
                                onPick={editor.actions.setTool}
                            />
                            <DoorToolOptions editor={editor} />
                        </div>
                    )}
                    {panel === 'tiles' && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-1" role="group" aria-label={tileTranslations('layers')}>
                                {(['ground', 'wallfill', 'objects', 'edge-art'] as const).map((layer) => (
                                    <Button
                                        key={layer}
                                        type="button"
                                        size="sm"
                                        variant={tileEditor.activeLayer === layer ? 'default' : 'outline'}
                                        onClick={() => tileEditor.setActiveLayer(layer)}
                                    >
                                        {tileTranslations(`layer.${layer}`)}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-1" role="group" aria-label={tileTranslations('tools')}>
                                {(['brush', 'line', 'rectangle', 'fill', 'eraser', 'picker'] as const).map((nextTool) => (
                                    <Button
                                        key={nextTool}
                                        type="button"
                                        size="sm"
                                        variant={tileEditor.tool === nextTool ? 'default' : 'outline'}
                                        onClick={() => tileEditor.setTool(nextTool)}
                                    >
                                        {tileTranslations(`tool.${nextTool}`)}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="tile-brush-size" className="text-xs">{tileTranslations('brushSize')}</Label>
                                <select
                                    id="tile-brush-size"
                                    className="h-8 rounded border bg-background px-2 text-sm"
                                    value={tileEditor.brushSize}
                                    onChange={(event) => tileEditor.setBrushSize(Number(event.target.value))}
                                >
                                    {[1, 2, 3].map((size) => <option key={size} value={size}>{size}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                {TILE_CATALOG.filter((tile) => tile.layer === tileEditor.activeLayer).map((tile) => (
                                    <Button
                                        key={tile.id}
                                        type="button"
                                        size="sm"
                                        variant={tileEditor.selectedTileId === tile.id ? 'default' : 'outline'}
                                        onClick={() => tileEditor.setSelectedTile(tile.id)}
                                    >
                                        {tileTranslations(`name.${tile.key}`)}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex gap-1">
                                <Button type="button" size="sm" variant="outline" disabled={!tileEditor.canUndo} onClick={tileEditor.undo}>{tileTranslations('undo')}</Button>
                                <Button type="button" size="sm" variant="outline" disabled={!tileEditor.canRedo} onClick={tileEditor.redo}>{tileTranslations('redo')}</Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={!tileEditor.isDirty || tileSave.isPending}
                                    onClick={() => tileSave.mutate(
                                        { expectedVersion: tileEditor.version, patches: tileEditor.dirtyPatches },
                                        { onSuccess: ({ version }) => { tileEditor.acceptSaved(); draft.acceptVersion(version); } }
                                    )}
                                >
                                    {tileSave.isPending ? tileTranslations('saving') : tileTranslations('save')}
                                </Button>
                            </div>
                            {tileSave.isError && <p role="alert" className="text-sm text-destructive">{tileTranslations('saveFailed')}</p>}
                        </div>
                    )}
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
