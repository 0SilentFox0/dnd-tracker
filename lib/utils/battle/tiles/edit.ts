import { cellLine } from '@/lib/utils/battle/grid/geometry';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import type { TileLayer } from '@/lib/utils/battle/tiles/types';
import type { GridPoint } from '@/types/battle';

export type TileEditTool = 'brush' | 'line' | 'rectangle' | 'fill' | 'eraser' | 'picker';

export interface TileCellChange {
    layer: TileLayer;
    key: string;
    index: number;
    before: number;
    after: number;
}

const SIDE = 16;

const CHUNK_CELLS = SIDE * SIDE;

export function tileAt(
    chunks: TileLayerChunks,
    layer: TileLayer,
    x: number,
    y: number
): number {
    if (x < 0 || y < 0) return 0;

    const cx = Math.floor(x / SIDE);

    const cy = Math.floor(y / SIDE);

    return chunks[layer]?.[`${cx}:${cy}`]?.[(y % SIDE) * SIDE + (x % SIDE)] ?? 0;
}

function operationPoints(
    tool: TileEditTool,
    points: readonly GridPoint[]
): GridPoint[] {
    if (points.length < 2 || (tool !== 'line' && tool !== 'rectangle'))
        return [...points];

    const start = points[0];

    const end = points[points.length - 1];

    if (tool === 'line') return cellLine(start, end);

    const cells: GridPoint[] = [];

    const minX = Math.min(start.x, end.x);

    const maxX = Math.max(start.x, end.x);

    const minY = Math.min(start.y, end.y);

    const maxY = Math.max(start.y, end.y);

    for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= maxX; x++) cells.push({ x, y });

    return cells;
}

function fillPoints(
    chunks: TileLayerChunks,
    layer: TileLayer,
    start: GridPoint,
    mapSize: { cols: number; rows: number }
): GridPoint[] {
    const target = tileAt(chunks, layer, start.x, start.y);

    const queue = [start];

    const seen = new Set<string>();

    const result: GridPoint[] = [];

    for (let cursor = 0; cursor < queue.length && result.length < mapSize.cols * mapSize.rows; cursor++) {
        const point = queue[cursor];

        const key = `${point.x}:${point.y}`;

        if (seen.has(key) || point.x < 0 || point.y < 0 || point.x >= mapSize.cols || point.y >= mapSize.rows)
            continue;

        seen.add(key);

        if (tileAt(chunks, layer, point.x, point.y) !== target) continue;

        result.push(point);
        queue.push(
            { x: point.x + 1, y: point.y },
            { x: point.x - 1, y: point.y },
            { x: point.x, y: point.y + 1 },
            { x: point.x, y: point.y - 1 }
        );
    }

    return result;
}

export function applyTileStroke(input: {
    chunks: TileLayerChunks;
    layer: TileLayer;
    points: readonly GridPoint[];
    tileId: number;
    brushSize: number;
    tool: TileEditTool;
    mapSize: { cols: number; rows: number };
}): { chunks: TileLayerChunks; changes: TileCellChange[] } {
    const { chunks, layer, tileId, brushSize, tool, mapSize } = input;

    const startPoints = input.points;

    if (startPoints.length === 0) return { chunks, changes: [] };

    if (!Number.isInteger(brushSize) || brushSize < 1 || brushSize > 3)
        throw new Error('Brush size must be between 1 and 3');

    const points = tool === 'fill'
        ? fillPoints(chunks, layer, startPoints[0], mapSize)
        : operationPoints(tool, startPoints);

    const targets = new Map<string, GridPoint>();

    const offset = Math.floor((brushSize - 1) / 2);

    for (const point of points) {
        for (let by = 0; by < brushSize; by++)
            for (let bx = 0; bx < brushSize; bx++) {
                const x = point.x + bx - offset;

                const y = point.y + by - offset;

                if (x >= 0 && y >= 0 && x < mapSize.cols && y < mapSize.rows)
                    targets.set(`${x}:${y}`, { x, y });
            }
    }

    const layerChunks = { ...(chunks[layer] ?? {}) };

    const mutable = new Map<string, Uint16Array>();

    const changes: TileCellChange[] = [];

    const value = tool === 'eraser' ? 0 : tileId;

    for (const { x, y } of targets.values()) {
        const cx = Math.floor(x / SIDE);

        const cy = Math.floor(y / SIDE);

        const key = `${cx}:${cy}`;

        const index = (y % SIDE) * SIDE + (x % SIDE);

        const cells = mutable.get(key) ?? new Uint16Array(layerChunks[key] ?? CHUNK_CELLS);

        const before = cells[index];

        if (before === value) continue;

        mutable.set(key, cells);
        cells[index] = value;
        changes.push({ layer, key, index, before, after: value });
    }

    for (const [key, cells] of mutable) {
        if (cells.every((cell) => cell === 0)) delete layerChunks[key];
        else layerChunks[key] = cells;
    }

    return {
        chunks: { ...chunks, [layer]: layerChunks },
        changes,
    };
}

export function applyTileChanges(
    chunks: TileLayerChunks,
    changes: readonly TileCellChange[],
    direction: 'before' | 'after'
): TileLayerChunks {
    const next: Partial<Record<TileLayer, Record<string, Uint16Array>>> = {};

    const mutable = new Map<string, Uint16Array>();

    for (const change of changes) {
        const identity = `${change.layer}:${change.key}`;

        let cells = mutable.get(identity);

        if (!cells) {
            const existing = chunks[change.layer]?.[change.key];

            cells = existing
                ? new Uint16Array(existing)
                : new Uint16Array(CHUNK_CELLS);
            mutable.set(identity, cells);
            (next[change.layer] ??= { ...(chunks[change.layer] ?? {}) })[change.key] = cells;
        }

        cells[change.index] = direction === 'before' ? change.before : change.after;
    }

    for (const change of changes) {
        const cells = mutable.get(`${change.layer}:${change.key}`);

        if (cells?.every((cell) => cell === 0)) delete next[change.layer]?.[change.key];
    }

    return { ...chunks, ...next };
}
