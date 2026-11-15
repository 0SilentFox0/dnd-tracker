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
import type { GridPoint } from '@/types/battle';

const HISTORY_LIMIT = 100;

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
    const base = useMemo(() => decodeChunks(input.initialChunks), [input.initialChunks]);

    const [chunks, setChunks] = useState<TileLayerChunks>(base);

    const [baseChunks, setBaseChunks] = useState<TileLayerChunks>(base);

    const version = input.version;

    const [activeLayer, setLayer] = useState<TileLayer>('ground');

    const [selectedTileId, setSelectedTile] = useState(1);

    const [tool, setTool] = useState<TileEditTool>('brush');

    const [brushSize, setBrush] = useState(1);

    const [undoStack, setUndoStack] = useState<TileCellChange[][]>([]);

    const [redoStack, setRedoStack] = useState<TileCellChange[][]>([]);

    const dirtyPatches = useMemo(
        () =>
            ['ground', 'wallfill', 'objects', 'edge-art'].flatMap((layer) =>
                diffTileChunks(
                    layer as TileLayer,
                    baseChunks[layer as TileLayer] ?? {},
                    chunks[layer as TileLayer] ?? {}
                )
            ),
        [baseChunks, chunks]
    );

    const onStroke = useCallback(
        (points: GridPoint[]) => {
            const first = points[0];

            if (!first) return;

            if (tool === 'picker') {
                const id = tileAt(chunks, activeLayer, first.x, first.y);

                if (id > 0) setSelectedTile(id);

                return;
            }

            const result = applyTileStroke({
                chunks,
                layer: activeLayer,
                points,
                tileId: selectedTileId,
                brushSize,
                tool,
                mapSize: input.mapSize,
            });

            if (result.changes.length === 0) return;

            setChunks(result.chunks);
            setUndoStack((stack) => [...stack, result.changes].slice(-HISTORY_LIMIT));
            setRedoStack([]);
        },
        [activeLayer, brushSize, chunks, input.mapSize, selectedTileId, tool]
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

    const setActiveLayer = useCallback((layer: TileLayer) => {
        setLayer(layer);

        const firstTile = TILE_CATALOG.find((tile) => tile.layer === layer);

        if (firstTile) setSelectedTile(firstTile.id);
    }, []);

    const acceptSaved = useCallback(() => {
            setBaseChunks(chunks);
            setUndoStack([]);
            setRedoStack([]);
        }, [chunks]);

    return {
        chunks,
        version,
        activeLayer,
        setActiveLayer,
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
