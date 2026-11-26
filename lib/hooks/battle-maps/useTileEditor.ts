'use client';

import { useCallback, useMemo, useState } from 'react';

import { TILE_CATALOG } from '@/lib/constants/tilesets/catalog';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import { diffTileChunks } from '@/lib/utils/battle/tiles/diff';
import {
    applyTileChanges,
    applyTileStroke,
    tileAt,
    type TileCellChange,
    type TileEditTool,
} from '@/lib/utils/battle/tiles/edit';
import { decodeTileChunk } from '@/lib/utils/battle/tiles/rle';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';
import type { GridPoint } from '@/types/battle-grid';

const HISTORY_LIMIT = 100;

const ACTIVE_LAYER: TileLayer = 'objects';

const FIRST_OBJECT_ID =
    TILE_CATALOG.find((tile) => tile.layer === ACTIVE_LAYER)?.id ?? 1;

function decodeChunks(
    chunks: Partial<Record<TileLayer, Record<string, string>>>
): TileLayerChunks {
    return Object.fromEntries(
        Object.entries(chunks).map(([layer, records]) => [
            layer,
            Object.fromEntries(
                Object.entries(records ?? {}).map(([key, data]) => [
                    key,
                    decodeTileChunk(data),
                ])
            ),
        ])
    ) as TileLayerChunks;
}

export function useTileEditor(input: {
    initialChunks: Partial<Record<TileLayer, Record<string, string>>>;
    version: number;
    mapSize: { cols: number; rows: number };
}) {
    const base = useMemo(
        () => decodeChunks(input.initialChunks),
        [input.initialChunks]
    );

    const [chunks, setChunks] = useState<TileLayerChunks>(base);

    const [baseChunks, setBaseChunks] = useState<TileLayerChunks>(base);

    const version = input.version;

    const [selectedTileId, setSelectedTile] = useState(FIRST_OBJECT_ID);

    const [tool, setTool] = useState<TileEditTool>('brush');

    const [brushSize, setBrush] = useState(1);

    const [undoStack, setUndoStack] = useState<TileCellChange[][]>([]);

    const [redoStack, setRedoStack] = useState<TileCellChange[][]>([]);

    const dirtyPatches = useMemo(
        () =>
            diffTileChunks(
                ACTIVE_LAYER,
                baseChunks[ACTIVE_LAYER] ?? {},
                chunks[ACTIVE_LAYER] ?? {}
            ).map((patch) => ({ ...patch, layer: 'objects' as const })),
        [baseChunks, chunks]
    );

    const onStroke = useCallback(
        (points: GridPoint[]) => {
            const first = points[0];

            if (!first) return;

            if (tool === 'picker') {
                const id = tileAt(chunks, ACTIVE_LAYER, first.x, first.y);

                if (id > 0) setSelectedTile(id);

                return;
            }

            const result = applyTileStroke({
                chunks,
                layer: ACTIVE_LAYER,
                points,
                tileId: selectedTileId,
                brushSize,
                tool,
                mapSize: input.mapSize,
                grid: 'square',
            });

            if (result.changes.length === 0) return;

            setChunks(result.chunks);
            setUndoStack((stack) =>
                [...stack, result.changes].slice(-HISTORY_LIMIT)
            );
            setRedoStack([]);
        },
        [brushSize, chunks, input.mapSize, selectedTileId, tool]
    );

    const undo = useCallback(() => {
        const changes = undoStack.at(-1);

        if (!changes) return;

        setChunks((current) => applyTileChanges(current, changes, 'before'));
        setUndoStack((stack) => stack.slice(0, -1));
        setRedoStack((stack) => [...stack, changes]);
    }, [undoStack]);

    const redo = useCallback(() => {
        const changes = redoStack.at(-1);

        if (!changes) return;

        setChunks((current) => applyTileChanges(current, changes, 'after'));
        setRedoStack((stack) => stack.slice(0, -1));
        setUndoStack((stack) => [...stack, changes].slice(-HISTORY_LIMIT));
    }, [redoStack]);

    const acceptSaved = useCallback(() => {
        setBaseChunks(chunks);
        setUndoStack([]);
        setRedoStack([]);
    }, [chunks]);

    return {
        chunks,
        version,
        activeLayer: ACTIVE_LAYER,
        selectedTileId,
        setSelectedTile,
        tool,
        setTool,
        brushSize,
        setBrushSize: (size: number) =>
            setBrush(Math.max(1, Math.min(3, Math.round(size)))),
        dirtyPatches,
        isDirty: dirtyPatches.length > 0,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        onStroke,
        undo,
        redo,
        acceptSaved,
    };
}
