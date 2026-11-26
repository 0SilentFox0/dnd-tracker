'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { BackLink, EditorHeader } from './editor/EditorHeader';
import { EditorSidebar } from './editor/EditorSidebar';

import { BattleMap } from '@/components/battle/map';
import { QueryState } from '@/components/common/states';
import {
    type EditorPanel,
    useBattleMap,
    useBattleMapTiles,
    useMapArt,
    useMapArtEditor,
    useMapArtSave,
    useMapEditorDraft,
    useMapEditorWorkspace,
    isStampTool,
    useTileSave,
    useUvttImport,
} from '@/lib/hooks/battle-maps';
import { useCoarsePointer } from '@/lib/hooks/common';
import { useText } from '@/lib/i18n/use-text';
import { isEdgeTool, isPreviewSafeBackground } from '@/lib/utils/battle/grid';
import { deriveMechanics } from '@/lib/utils/battle/map-art';
import type {
    BattleMapFull,
    BattleMapTileChunks,
    MapArtRecord,
} from '@/types/battle-map';

const NO_PARTICIPANTS: never[] = [];

const isArtEdgeTool = (tool: string) =>
    tool === 'wall' || tool === 'wall-erase' || tool === 'opening';

function EditorBody({
    campaignId,
    source,
}: {
    campaignId: string;
    source: BattleMapFull;
}) {
    const draft = useMapEditorDraft(campaignId, source);

    const tileQuery = useBattleMapTiles(campaignId, source.id);

    const artQuery = useMapArt(campaignId, source.id);

    return (
        <QueryState query={tileQuery}>
            {(tileData) => (
                <QueryState query={artQuery}>
                    {(record) => (
                        <EditorContent
                            campaignId={campaignId}
                            source={source}
                            draft={draft}
                            data={{ tiles: tileData, art: record }}
                        />
                    )}
                </QueryState>
            )}
        </QueryState>
    );
}

function EditorContent({
    campaignId,
    source,
    draft,
    data,
}: {
    campaignId: string;
    source: BattleMapFull;
    draft: ReturnType<typeof useMapEditorDraft>;
    data: { tiles: BattleMapTileChunks; art: MapArtRecord };
}) {
    const t = useTranslations('maps.editor');

    const text = useText();

    const artEditor = useMapArtEditor({
        initial: data.art.scene,
        map: draft.editor.state.map,
    });

    const artSave = useMapArtSave(campaignId, source.id, draft, artEditor);

    const workspace = useMapEditorWorkspace(
        source,
        draft,
        data.tiles,
        artEditor
    );

    const art = useMemo(
        () => ({
            editor: artEditor,
            save: artSave,
            ids: { campaignId, mapId: source.id },
        }),
        [artEditor, artSave, campaignId, source.id]
    );

    const tileSave = useTileSave(
        campaignId,
        source.id,
        workspace.tileEditor,
        draft
    );

    const asideRef = useRef<HTMLElement>(null);

    const { editor } = draft;

    const { map, tool, notice } = editor.state;

    const { panel, paintingTiles, tileEditor } = workspace;

    const { selectPanel } = workspace;

    const goToPanel = useCallback(
        (next: EditorPanel) => {
            selectPanel(next);
            asideRef.current?.scrollTo({ top: 0 });
        },
        [selectPanel]
    );

    const { replaceMapFromImport } = editor.actions;

    const uvtt = useUvttImport(
        useCallback(
            (result) => {
                replaceMapFromImport({
                    cols: result.cols,
                    rows: result.rows,
                    background: result.image,
                    backgroundCols: result.backgroundCols,
                    walls: result.walls,
                    doors: result.doors,
                });
                goToPanel('background');
            },
            [replaceMapFromImport, goToPanel]
        )
    );

    const artTool = panel === 'art' ? artEditor.tool : null;

    const artCellTool =
        artTool !== null && !isArtEdgeTool(artTool) && !isStampTool(artTool);

    const cellPainting =
        paintingTiles ||
        artCellTool ||
        (panel === 'cells' && tool !== null && !isEdgeTool(tool));

    const hideBackground =
        paintingTiles ||
        !(isPreviewSafeBackground(map.background) || map.background === null);

    const { scene: artScene } = artEditor;

    const derivedDoors = useMemo(
        () =>
            artScene
                ? deriveMechanics(artScene, {
                      cols: map.cols,
                      rows: map.rows,
                      gridType: map.gridType,
                  }).doors
                : null,
        [artScene, map.cols, map.rows, map.gridType]
    );

    const previewMap = useMemo(() => {
        if (derivedDoors)
            return {
                ...map,
                background: null,
                walls: [],
                bars: [],
                doors: derivedDoors,
            };

        return hideBackground ? { ...map, background: null } : map;
    }, [derivedDoors, hideBackground, map]);

    const { onStroke: tileStroke, version, chunks } = tileEditor;

    const { onStroke: mapStroke } = editor.actions;

    const { onCellStroke: artStroke } = artEditor;

    const mapActions = useMemo(() => {
        if (paintingTiles) return { onStroke: tileStroke };

        return { onStroke: artCellTool ? artStroke : mapStroke };
    }, [paintingTiles, artCellTool, tileStroke, artStroke, mapStroke]);

    const look = useMemo(
        () => ({
            className: 'h-full',
            tiles: {
                mapId: source.id,
                version,
                seed: source.id,
                chunks,
                assets: {},
            },
        }),
        [source.id, version, chunks]
    );

    const { edgeEditing } = editor;

    const { lights, stamps: stampsApi, revision: artRevision } = artEditor;

    const artPreview = useMemo(
        () =>
            artScene
                ? {
                      mapId: source.id,
                      scene: artScene,
                      revision: artRevision,
                      ...(artTool === 'light' && { lights }),
                      ...((artTool === 'stamp' || artTool === 'stamp-select') && {
                          stamps: { mode: artTool, api: stampsApi },
                      }),
                  }
                : null,
        [artScene, artRevision, artTool, lights, stampsApi, source.id]
    );

    const artEdges = panel === 'art' ? artEditor.edgeEditing : null;

    const editing = useMemo(
        () => ({
            showDefaultBackground: false,
            clickableBlocked: cellPainting,
            strokeTool: cellPainting,
            showBlocked: true,
            edges: panel === 'edges' ? edgeEditing : artEdges,
            doorLocks: true,
            art: artPreview,
        }),
        [cellPainting, panel, edgeEditing, artEdges, artPreview]
    );

    return (
        <div className="flex h-[calc(100dvh-var(--app-header-h,89px)-3.5rem)] min-h-0 flex-col gap-3 overflow-hidden p-3">
            <EditorHeader
                campaignId={campaignId}
                draft={draft}
                workspace={workspace}
                tileSave={tileSave}
                art={art}
            />
            {tileSave.isError && paintingTiles && (
                <p role="alert" className="shrink-0 text-sm text-destructive">
                    {t('tiles.saveFailed')}
                </p>
            )}
            <p
                aria-live="polite"
                role="status"
                className="min-h-5 shrink-0 text-sm text-hud-ink"
            >
                {notice
                    ? text(notice)
                    : artEditor.notice
                      ? text(artEditor.notice)
                      : draft.justSaved
                        ? t('saved')
                        : ''}
            </p>
            <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(14rem,42%)] gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1">
                <div className="relative min-h-0 min-w-0 overflow-hidden">
                    <BattleMap
                        map={previewMap}
                        participants={NO_PARTICIPANTS}
                        actions={mapActions}
                        look={look}
                        editing={editing}
                    />
                </div>
                <aside
                    ref={asideRef}
                    className="min-h-0 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-hud-rule bg-background p-2 pb-6 shadow-sm"
                >
                    <EditorSidebar
                        draft={draft}
                        workspace={workspace}
                        uvtt={uvtt}
                        art={art}
                        onSelectPanel={goToPanel}
                    />
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
