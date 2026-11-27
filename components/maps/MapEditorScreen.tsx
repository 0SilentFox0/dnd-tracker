'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { ActiveToolChip } from './editor/ActiveToolChip';
import { BackLink, EditorHeader } from './editor/EditorHeader';
import { EditorSidebar } from './editor/EditorSidebar';
import { MapWorkbench } from './editor/MapWorkbench';

import { BattleMap } from '@/components/battle/map';
import { QueryState } from '@/components/common/states';
import {
    type EditorPanel,
    isStampTool,
    useActiveToolChip,
    useBattleMap,
    useBattleMapTiles,
    useMapArt,
    useMapArtEditor,
    useMapArtSave,
    useMapEditorDraft,
    useMapEditorWorkspace,
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

    const [fullscreen, setFullscreen] = useState(false);

    const { editor } = draft;

    const { map, tool, notice } = editor.state;

    const toolChip = useActiveToolChip(editor);

    const { panel, paintingTiles, tileEditor } = workspace;

    const { selectPanel } = workspace;

    const goToPanel = useCallback(
        (next: EditorPanel) => {
            selectPanel(next);
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
                      ...(isStampTool(artTool) && {
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
            <MapWorkbench
                layout={{
                    className:
                        'flex-1 grid-rows-[minmax(0,1fr)_minmax(14rem,42%)] lg:h-auto',
                }}
                fullscreen={{
                    value: fullscreen,
                    set: setFullscreen,
                    label: t('workbench.fullscreen'),
                }}
                onEscape={toolChip.onEscape}
                toolbar={
                    <ActiveToolChip
                        tool={toolChip.tool}
                        onClear={toolChip.onClear}
                    />
                }
                notice={
                    notice
                        ? text(notice)
                        : artEditor.notice
                          ? text(artEditor.notice)
                          : draft.justSaved
                            ? t('saved')
                            : null
                }
                canvas={
                    <BattleMap
                        map={previewMap}
                        participants={NO_PARTICIPANTS}
                        actions={mapActions}
                        look={look}
                        editing={editing}
                    />
                }
                sidebar={
                    <EditorSidebar
                        draft={draft}
                        workspace={workspace}
                        uvtt={uvtt}
                        art={art}
                        onSelectPanel={goToPanel}
                    />
                }
            />
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
